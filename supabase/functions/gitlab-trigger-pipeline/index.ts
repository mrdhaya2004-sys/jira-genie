import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders, validateAuth, unauthorizedResponse } from "../_shared/auth.ts";
import { gitlabFetch, statusBucket } from "../_shared/gitlab.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = await validateAuth(req);
    if (!auth.user) return unauthorizedResponse(auth.error || "Unauthorized");

    const body = await req.json().catch(() => ({}));
    const project_row_id = String(body.project_row_id || "");
    const branch = String(body.branch || "").trim();
    const conversation_id = body.conversation_id ? String(body.conversation_id) : null;
    if (!project_row_id || !branch) {
      return new Response(JSON.stringify({ error: "project_row_id and branch are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: project } = await admin
      .from("gitlab_projects")
      .select("id, project_id, connection_id, name, web_url")
      .eq("id", project_row_id)
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (!project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: conn } = await admin
      .from("gitlab_connections")
      .select("*")
      .eq("id", project.connection_id)
      .maybeSingle();
    if (!conn) {
      return new Response(JSON.stringify({ error: "GitLab connection missing" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const triggerRes = await gitlabFetch(conn, `/projects/${project.project_id}/pipeline`, {
      method: "POST",
      body: JSON.stringify({ ref: branch }),
    });

    if (!triggerRes.ok) {
      const text = await triggerRes.text();
      return new Response(JSON.stringify({
        error: `GitLab refused to start the pipeline (${triggerRes.status}). ${text.slice(0, 300)}`,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const pipeline = await triggerRes.json();

    const { data: run, error: insertErr } = await admin
      .from("gitlab_pipeline_runs")
      .insert({
        user_id: auth.user.id,
        project_row_id: project.id,
        gitlab_project_id: project.project_id,
        pipeline_id: pipeline.id,
        branch,
        status: statusBucket(pipeline.status || "pending"),
        web_url: pipeline.web_url,
        started_at: pipeline.created_at || new Date().toISOString(),
        triggered_via: body.triggered_via === "schedule" ? "schedule" : "chat",
        conversation_id,
        stats: {},
      })
      .select()
      .single();
    if (insertErr) throw insertErr;

    return new Response(JSON.stringify({ success: true, run, pipeline }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("gitlab-trigger-pipeline error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
