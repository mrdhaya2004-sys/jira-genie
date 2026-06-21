import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders, validateAuth, unauthorizedResponse } from "../_shared/auth.ts";
import { GitLabConnectionError, sanitizeBaseUrl, gitlabFetch, gitlabApiUrl } from "../_shared/gitlab.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = await validateAuth(req);
    if (!auth.user) return unauthorizedResponse(auth.error || "Unauthorized");

    const body = await req.json().catch(() => ({}));
    const token = String(body.token || "").trim();
    let base_url = String(body.base_url || "https://gitlab.com").trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "Personal Access Token is required" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    try { base_url = sanitizeBaseUrl(base_url); } catch {
      return new Response(JSON.stringify({ error: "Enter a valid HTTPS URL for GitLab or GitHub. You may paste any page from the host; TestZone will save only the root." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Provider detection — route by host so GitHub URLs hit GitHub APIs (never GitLab's /api/v4).
    const host = new URL(base_url).host.toLowerCase();
    const isGitHub = host === "github.com" || host.endsWith(".github.com") || host === "api.github.com";
    const provider: "github" | "gitlab" = isGitHub ? "github" : "gitlab";

    let providerUser: { username: string; id: number | string; avatar_url?: string };

    if (provider === "github") {
      // Normalize base_url to https://github.com for GitHub.com; keep enterprise hosts as-is (api at /api/v3).
      const apiUrl = host === "github.com" || host === "api.github.com"
        ? "https://api.github.com/user"
        : `https://${host}/api/v3/user`;
      if (host === "api.github.com") base_url = "https://github.com";

      let ghRes: Response;
      try {
        ghRes = await fetch(apiUrl, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "TestZone-Lovable",
          },
        });
      } catch (netErr) {
        console.error("github-connect network error", netErr);
        return new Response(JSON.stringify({
          error: `Unable to reach GitHub at ${apiUrl}. Please verify the URL is reachable.`,
          fallback: true,
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (!ghRes.ok) {
        const text = await ghRes.text().catch(() => "");
        return new Response(JSON.stringify({
          error: ghRes.status === 401 ? "Invalid GitHub token. Use a fine-grained or classic PAT (github_pat_… or ghp_…) with repo + read:user scopes."
            : ghRes.status === 404 ? `We reached ${apiUrl}, but the GitHub API endpoint was not found. Confirm the URL is correct.`
            : `GitHub rejected the connection (${ghRes.status}). ${text.slice(0, 200)}`,
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const ghUser = await ghRes.json();
      providerUser = { username: ghUser.login, id: ghUser.id, avatar_url: ghUser.avatar_url };
    } else {
      // GitLab path
      let userRes: Response;
      try {
        userRes = await gitlabFetch({ base_url, encrypted_token: token }, "/user");
      } catch (netErr) {
        console.error("gitlab-connect network error", netErr);
        return new Response(JSON.stringify({
          error: `Unable to reach GitLab at ${base_url}. Please verify the URL is correct and reachable.`,
          fallback: true,
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (!userRes.ok) {
        const text = await userRes.text().catch(() => "");
        return new Response(JSON.stringify({
          error: userRes.status === 401 ? "Invalid GitLab token. Please check your PAT (api scope required)."
            : userRes.status === 404 ? `We reached ${base_url}, but the GitLab API was not found at ${gitlabApiUrl(base_url, "/user")}. Please enter the GitLab root URL.`
            : `GitLab rejected the connection (${userRes.status}). ${text.slice(0, 200)}`,
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const gitlabUser = await userRes.json();
      providerUser = { username: gitlabUser.username, id: gitlabUser.id, avatar_url: gitlabUser.avatar_url };
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: connection, error } = await admin
      .from("gitlab_connections")
      .upsert({
        user_id: auth.user.id,
        base_url,
        encrypted_token: token,
        gitlab_username: gitlabUser.username,
        gitlab_user_id: gitlabUser.id,
        is_active: true,
        last_sync_error: null,
      }, { onConflict: "user_id" })
      .select()
      .single();

    if (error) {
      console.error("gitlab-connect upsert error", error);
      return new Response(JSON.stringify({ error: `Failed to save connection: ${error.message}` }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      connection: {
        id: connection.id,
        base_url,
        username: gitlabUser.username,
        avatar_url: gitlabUser.avatar_url,
      },
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("gitlab-connect error", e);
    return new Response(JSON.stringify({
      error: (e as Error).message || "Unexpected error while connecting to GitLab",
      fallback: true,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

