import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders, validateAuth, unauthorizedResponse } from "../_shared/auth.ts";
import { sanitizeBaseUrl, gitlabFetch } from "../_shared/gitlab.ts";

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
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    try { base_url = sanitizeBaseUrl(base_url); } catch (e) {
      return new Response(JSON.stringify({ error: (e as Error).message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate token by calling /user
    const userRes = await gitlabFetch({ base_url, encrypted_token: token }, "/user");
    if (!userRes.ok) {
      const text = await userRes.text();
      return new Response(JSON.stringify({
        error: userRes.status === 401 ? "Invalid GitLab token. Please check your PAT (api scope required)."
          : `GitLab rejected the connection (${userRes.status}). ${text.slice(0, 200)}`,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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

    if (error) throw error;

    return new Response(JSON.stringify({
      success: true,
      connection: {
        id: connection.id,
        base_url,
        username: gitlabUser.username,
        avatar_url: gitlabUser.avatar_url,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("gitlab-connect error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
