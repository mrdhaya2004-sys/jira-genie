// deno-lint-ignore-file no-explicit-any
// Fetch a GitHub repo as a zip and return it base64-encoded.
// Uses the GitHub connector gateway when available; falls back to public API for public repos.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const encodeBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  // btoa is available in Deno
  return btoa(binary);
};

const parseRepoUrl = (input: string): { owner: string; repo: string; ref?: string } | null => {
  const trimmed = input.trim().replace(/\.git$/, '');
  // shorthand owner/repo
  const short = trimmed.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (short) return { owner: short[1], repo: short[2] };
  try {
    const u = new URL(trimmed);
    if (!/github\.com$/i.test(u.hostname)) return null;
    const parts = u.pathname.replace(/^\//, '').split('/').filter(Boolean);
    if (parts.length < 2) return null;
    const [owner, repo, kind, ...rest] = parts;
    let ref: string | undefined;
    if (kind === 'tree' || kind === 'commit') ref = rest.join('/');
    return { owner, repo, ref };
  } catch { return null; }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const url: string = body.url || '';
    const parsed = parseRepoUrl(url);
    if (!parsed) {
      return new Response(JSON.stringify({ error: 'Please provide a GitHub URL or "owner/repo".' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { owner, repo, ref } = parsed;
    const zipPath = `repos/${owner}/${repo}/zipball${ref ? '/' + ref : ''}`;

    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    const ghKey = Deno.env.get('GITHUB_API_KEY');

    let response: Response;
    if (lovableKey && ghKey) {
      response = await fetch(`https://connector-gateway.lovable.dev/github/${zipPath}`, {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${lovableKey}`,
          'X-Connection-Api-Key': ghKey,
          'User-Agent': 'testzone-studio',
        },
        redirect: 'follow',
      });
    } else {
      response = await fetch(`https://api.github.com/${zipPath}`, {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'testzone-studio',
        },
        redirect: 'follow',
      });
    }

    if (!response.ok) {
      const text = await response.text();
      return new Response(
        JSON.stringify({
          error: response.status === 404
            ? 'Repository not found. If it is private, connect GitHub in Settings and try again.'
            : `GitHub returned ${response.status}`,
          status: response.status,
          details: text.slice(0, 500),
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const buf = new Uint8Array(await response.arrayBuffer());
    // Cap at ~15 MB to stay well below function limits
    if (buf.byteLength > 15 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: 'Repository archive exceeds 15 MB limit. Try a subfolder or smaller branch.' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const b64 = encodeBase64(buf);
    return new Response(
      JSON.stringify({ owner, repo, ref: ref || null, size: buf.byteLength, zipBase64: b64 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
