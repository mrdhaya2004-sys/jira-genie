// Cron-invoked: polls active GitLab pipeline runs and updates status/stats.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "../_shared/auth.ts";
import { gitlabFetch, statusBucket, isTerminal } from "../_shared/gitlab.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { data: runs } = await admin
      .from("gitlab_pipeline_runs")
      .select("*, project:gitlab_projects(connection_id, project_id)")
      .in("status", ["pending", "running"])
      .not("pipeline_id", "is", null)
      .order("updated_at", { ascending: true })
      .limit(40);

    let updated = 0;
    const byConnection = new Map<string, any>();

    for (const run of runs || []) {
      const connId = run.project?.connection_id;
      if (!connId) continue;
      let conn = byConnection.get(connId);
      if (!conn) {
        const { data } = await admin.from("gitlab_connections").select("*").eq("id", connId).maybeSingle();
        if (!data) continue;
        conn = data;
        byConnection.set(connId, conn);
      }

      try {
        const res = await gitlabFetch(conn, `/projects/${run.gitlab_project_id}/pipelines/${run.pipeline_id}`);
        if (!res.ok) continue;
        const pipe = await res.json();
        const bucket = statusBucket(pipe.status);
        const patch: Record<string, unknown> = {
          status: bucket,
          last_polled_at: new Date().toISOString(),
          web_url: pipe.web_url,
          started_at: pipe.started_at || run.started_at,
        };

        if (isTerminal(pipe.status)) {
          patch.finished_at = pipe.finished_at || new Date().toISOString();
          patch.duration_seconds = pipe.duration ?? null;

          // Attempt to get test report summary
          try {
            const tr = await gitlabFetch(conn, `/projects/${run.gitlab_project_id}/pipelines/${run.pipeline_id}/test_report_summary`);
            if (tr.ok) {
              const summary = await tr.json();
              const total = summary?.total ?? {};
              patch.stats = {
                total: total.count ?? 0,
                passed: total.success ?? 0,
                failed: total.failed ?? 0,
                skipped: total.skipped ?? 0,
                error: total.error ?? 0,
              };
            }
          } catch { /* test report optional */ }
        }

        await admin.from("gitlab_pipeline_runs").update(patch).eq("id", run.id);
        updated++;

        if (isTerminal(pipe.status)) {
          const title = bucket === "success"
            ? `✅ ${run.branch} pipeline completed`
            : bucket === "failed"
            ? `❌ ${run.branch} pipeline failed`
            : `⚠️ ${run.branch} pipeline ${bucket}`;
          const stats = (patch.stats as any) || {};
          const msg = bucket === "success"
            ? `Duration ${Math.round((pipe.duration || 0) / 60)}m · ${stats.passed ?? "?"} passed${stats.failed ? ` · ${stats.failed} failed` : ""}`
            : `Pipeline #${pipe.id} on ${run.branch}`;
          await admin.rpc("create_notification", {
            _target_user_id: run.user_id,
            _type: "system",
            _title: title,
            _message: msg,
            _reference_id: String(pipe.id),
            _reference_type: "gitlab_pipeline",
          }).then(() => {}, (e: any) => console.warn("notif failed", e?.message));
        }
      } catch (e) {
        console.warn(`poll failed for run ${run.id}`, e);
      }
    }

    return new Response(JSON.stringify({ ok: true, polled: runs?.length || 0, updated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("gitlab-poll-status error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
