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
      return new Response(JSON.stringify({ error: "Enter a valid HTTPS GitLab URL. You may paste a dashboard, project, or group page; TestZone will save only the root host." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate the normalized GitLab root URL + token by calling <origin>/api/v4/user.
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
          : userRes.status === 404 ? `We reached ${base_url}, but GitLab API was not found at ${gitlabApiUrl(base_url, "/user")}. Please enter the GitLab root URL.`
          : `GitLab rejected the connection (${userRes.status}). ${text.slice(0, 200)}`,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const gitlabUser = await userRes.json();

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

