import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders, validateAuth, unauthorizedResponse } from "../_shared/auth.ts";
import { gitlabFetch } from "../_shared/gitlab.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = await validateAuth(req);
    if (!auth.user) return unauthorizedResponse(auth.error || "Unauthorized");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: conn } = await admin
      .from("gitlab_connections")
      .select("*")
      .eq("user_id", auth.user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!conn) {
      return new Response(JSON.stringify({ error: "No GitLab connection" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch projects (membership=true, simple=true, per_page max)
    const projects: any[] = [];
    for (let page = 1; page <= 5; page++) {
      const res = await gitlabFetch(conn, `/projects?membership=true&simple=false&per_page=100&page=${page}&order_by=last_activity_at`);
      if (!res.ok) break;
      const batch = await res.json();
      if (!Array.isArray(batch) || batch.length === 0) break;
      projects.push(...batch);
      if (batch.length < 100) break;
    }

    // Upsert projects
    const projectRows = projects.map((p) => ({
      user_id: auth.user!.id,
      connection_id: conn.id,
      project_id: p.id,
      name: p.name,
      path_with_namespace: p.path_with_namespace,
      default_branch: p.default_branch,
      web_url: p.web_url,
      avatar_url: p.avatar_url,
      last_activity_at: p.last_activity_at,
    }));

    if (projectRows.length > 0) {
      await admin.from("gitlab_projects").upsert(projectRows, { onConflict: "connection_id,project_id" });
    }

    const { data: storedProjects } = await admin
      .from("gitlab_projects")
      .select("id, project_id, default_branch")
      .eq("connection_id", conn.id);

    // Fetch branches for each project (cap at first 30 projects to keep latency sane)
    let totalBranches = 0;
    const projectsToScan = (storedProjects || []).slice(0, 30);
    for (const proj of projectsToScan) {
      try {
        const res = await gitlabFetch(conn, `/projects/${proj.project_id}/repository/branches?per_page=100`);
        if (!res.ok) continue;
        const branches = await res.json();
        if (!Array.isArray(branches)) continue;
        const rows = branches.map((b: any) => ({
          user_id: auth.user!.id,
          project_row_id: proj.id,
          name: b.name,
          is_default: b.default || b.name === proj.default_branch,
          last_commit_sha: b.commit?.id || null,
          synced_at: new Date().toISOString(),
        }));
        if (rows.length > 0) {
          await admin.from("gitlab_branches").upsert(rows, { onConflict: "project_row_id,name" });
          totalBranches += rows.length;
        }
      } catch (e) {
        console.warn(`Branch sync failed for project ${proj.project_id}`, e);
      }
    }

    await admin
      .from("gitlab_connections")
      .update({ last_sync_at: new Date().toISOString(), last_sync_error: null })
      .eq("id", conn.id);

    return new Response(JSON.stringify({
      success: true,
      projects: projects.length,
      branches: totalBranches,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("gitlab-sync error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
