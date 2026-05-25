import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assertSafeExternalUrl, allowedSuffixesForProvider } from "../_shared/ssrfGuard.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// Strip path to get the origin/base for custom endpoints.
const baseOf = (url: string) => {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return url.replace(/\/(v1|v1beta).*$/, '');
  }
};

// Best-effort filter for chat-capable text models.
const isChatModel = (id: string) => {
  const s = id.toLowerCase();
  if (s.includes('embed') || s.includes('whisper') || s.includes('tts') ||
      s.includes('image') || s.includes('vision-only') || s.includes('audio') ||
      s.includes('moderation') || s.includes('dall-e') || s.includes('davinci') ||
      s.includes('babbage') || s.includes('aqa')) return false;
  return true;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const { provider, apiKey, endpointUrl } = await req.json();
    if (!provider || !apiKey) return json({ success: false, error: 'Provider and API key are required' });

    let url: string;
    const headers: Record<string, string> = {};

    switch (provider) {
      case 'openai':
        url = 'https://api.openai.com/v1/models';
        headers['Authorization'] = `Bearer ${apiKey}`;
        break;

      case 'anthropic':
        url = 'https://api.anthropic.com/v1/models';
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
        break;

      case 'google_gemini':
        url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
        break;

      case 'azure_openai':
        if (!endpointUrl) return json({ success: false, error: 'Endpoint URL required for Azure OpenAI' });
        // Azure deployments are user-defined; auto-listing is unreliable.
        return json({ success: false, error: 'Auto-detect not supported for Azure OpenAI. Enter your deployment name manually.' });

      case 'custom':
      case 'local_llm':
        if (!endpointUrl) return json({ success: false, error: 'Endpoint URL required' });
        url = `${baseOf(endpointUrl)}/v1/models`;
        headers['Authorization'] = `Bearer ${apiKey}`;
        break;

      default:
        return json({ success: false, error: `Unsupported provider: ${provider}` });
    }

    try {
      assertSafeExternalUrl(url, { allowedHostSuffixes: allowedSuffixesForProvider(provider) });
    } catch (e) {
      return json({ success: false, error: e instanceof Error ? e.message : 'Invalid endpoint URL' });
    }

    const resp = await fetch(url, { method: 'GET', headers });
    const text = await resp.text();
    if (!resp.ok) {
      return json({ success: false, error: `Provider returned ${resp.status}: ${text.slice(0, 200)}` });
    }

    let parsed: any;
    try { parsed = JSON.parse(text); } catch {
      return json({ success: false, error: 'Invalid JSON from provider' });
    }

    let models: string[] = [];
    if (provider === 'google_gemini') {
      // { models: [ { name: "models/gemini-2.5-flash", supportedGenerationMethods: [...] } ] }
      models = (parsed.models || [])
        .filter((m: any) => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes('generateContent'))
        .map((m: any) => (m.name || '').replace(/^models\//, ''))
        .filter(Boolean);
    } else if (provider === 'anthropic') {
      // { data: [ { id: "claude-..." } ] }
      models = (parsed.data || []).map((m: any) => m.id).filter(Boolean);
    } else {
      // OpenAI-compatible: { data: [ { id: "..." } ] }
      models = (parsed.data || []).map((m: any) => m.id).filter(Boolean);
    }

    models = Array.from(new Set(models.filter(isChatModel))).sort();

    return json({ success: true, models });
  } catch (error) {
    console.error('list-ai-models error:', error);
    return json({ success: false, error: error instanceof Error ? error.message : 'Failed to list models' });
  }
});
