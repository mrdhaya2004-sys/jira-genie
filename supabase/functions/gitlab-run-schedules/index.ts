// Cron-invoked: triggers due GitLab pipeline schedules.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "../_shared/auth.ts";
import { gitlabFetch, statusBucket } from "../_shared/gitlab.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { data: due } = await admin
      .from("gitlab_schedules")
      .select("*, project:gitlab_projects(id, project_id, connection_id)")
      .eq("status", "pending")
      .lte("run_at", new Date().toISOString())
      .limit(25);

    let triggered = 0;
    for (const sched of due || []) {
      try {
        const project = sched.project;
        if (!project) {
          await admin.from("gitlab_schedules").update({ status: "failed", error_message: "Project missing" }).eq("id", sched.id);
          continue;
        }
        const { data: conn } = await admin.from("gitlab_connections").select("*").eq("id", project.connection_id).maybeSingle();
        if (!conn) {
          await admin.from("gitlab_schedules").update({ status: "failed", error_message: "Connection missing" }).eq("id", sched.id);
          continue;
        }

        const res = await gitlabFetch(conn, `/projects/${project.project_id}/pipeline`, {
          method: "POST",
          body: JSON.stringify({ ref: sched.branch }),
        });
        if (!res.ok) {
          const text = await res.text();
          await admin.from("gitlab_schedules").update({
            status: "failed",
            error_message: `GitLab ${res.status}: ${text.slice(0, 200)}`,
          }).eq("id", sched.id);
          continue;
        }
        const pipeline = await res.json();

        const { data: run } = await admin.from("gitlab_pipeline_runs").insert({
          user_id: sched.user_id,
          project_row_id: project.id,
          gitlab_project_id: project.project_id,
          pipeline_id: pipeline.id,
          branch: sched.branch,
          status: statusBucket(pipeline.status || "pending"),
          web_url: pipeline.web_url,
          started_at: pipeline.created_at || new Date().toISOString(),
          triggered_via: "schedule",
          conversation_id: sched.conversation_id,
          stats: {},
        }).select().single();

        await admin.from("gitlab_schedules").update({
          status: "triggered",
          pipeline_run_id: run?.id || null,
        }).eq("id", sched.id);

        await admin.rpc("create_notification", {
          _target_user_id: sched.user_id,
          _type: "system",
          _title: `🚀 Scheduled pipeline started on ${sched.branch}`,
          _message: `Pipeline #${pipeline.id} kicked off automatically.`,
          _reference_id: String(pipeline.id),
          _reference_type: "gitlab_pipeline",
        }).then(() => {}, () => {});
        triggered++;
      } catch (e) {
        console.warn(`Schedule ${sched.id} failed`, e);
        await admin.from("gitlab_schedules").update({
          status: "failed",
          error_message: (e as Error).message,
        }).eq("id", sched.id);
      }
    }
    return new Response(JSON.stringify({ ok: true, triggered }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("gitlab-run-schedules error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
