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
      return new Response(JSON.stringify({ error: "No source-control connection" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve provider — column wins, else infer from host.
    const host = (() => { try { return new URL(conn.base_url).host.toLowerCase(); } catch { return ""; } })();
    const inferredProvider: "github" | "gitlab" =
      conn.provider === "github" || conn.provider === "gitlab"
        ? conn.provider
        : (host === "github.com" || host.endsWith(".github.com") ? "github" : "gitlab");

    console.log("[sync] Provider:", inferredProvider);
    console.log("[sync] Base URL:", conn.base_url);

    const projectRows: any[] = [];
    const githubRepos: any[] = []; // keep raw for branch fetch
    let apiStatus: number | null = null;

    if (inferredProvider === "github") {
      // GitHub.com → api.github.com, Enterprise → <host>/api/v3
      const apiRoot = (host === "github.com" || host === "www.github.com" || host === "api.github.com" || host === "")
        ? "https://api.github.com"
        : `https://${host}/api/v3`;
      const endpoint = `${apiRoot}/user/repos`;
      console.log("[sync] Endpoint:", endpoint);

      for (let page = 1; page <= 5; page++) {
        const url = `${endpoint}?per_page=100&page=${page}&visibility=all&affiliation=owner,collaborator,organization_member&sort=updated`;
        const res = await fetch(url, {
          headers: {
            "Authorization": `Bearer ${conn.encrypted_token}`,
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "TestZone-Lovable",
          },
        });
        apiStatus = res.status;
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          console.error("[sync] GitHub list repos failed", res.status, t.slice(0, 200));
          break;
        }
        const batch = await res.json();
        console.log(`[sync] GitHub page ${page} response length:`, Array.isArray(batch) ? batch.length : 0);
        if (!Array.isArray(batch) || batch.length === 0) break;
        githubRepos.push(...batch);
        if (batch.length < 100) break;
      }

      for (const r of githubRepos) {
        projectRows.push({
          user_id: auth.user!.id,
          connection_id: conn.id,
          project_id: r.id,
          name: r.name,
          path_with_namespace: r.full_name, // owner/repo
          default_branch: r.default_branch,
          web_url: r.html_url,
          avatar_url: r.owner?.avatar_url || null,
          last_activity_at: r.updated_at || r.pushed_at || null,
          owner: r.owner?.login || null,
          visibility: r.private ? "private" : (r.visibility || "public"),
        });
      }
    } else {
      // GitLab path
      for (let page = 1; page <= 5; page++) {
        const res = await gitlabFetch(conn, `/projects?membership=true&simple=false&per_page=100&page=${page}&order_by=last_activity_at`);
        apiStatus = res.status;
        if (!res.ok) break;
        const batch = await res.json();
        console.log(`[sync] GitLab page ${page} response length:`, Array.isArray(batch) ? batch.length : 0);
        if (!Array.isArray(batch) || batch.length === 0) break;
        for (const p of batch) {
          projectRows.push({
            user_id: auth.user!.id,
            connection_id: conn.id,
            project_id: p.id,
            name: p.name,
            path_with_namespace: p.path_with_namespace,
            default_branch: p.default_branch,
            web_url: p.web_url,
            avatar_url: p.avatar_url,
            last_activity_at: p.last_activity_at,
            owner: p.namespace?.path || p.namespace?.name || null,
            visibility: p.visibility || null,
          });
        }
        if (batch.length < 100) break;
      }
    }

    console.log(`[sync] Repository Count: ${projectRows.length} · API Status: ${apiStatus}`);

    if (projectRows.length > 0) {
      await admin.from("gitlab_projects").upsert(projectRows, { onConflict: "connection_id,project_id" });
    }

    const { data: storedProjects } = await admin
      .from("gitlab_projects")
      .select("id, project_id, path_with_namespace, default_branch")
      .eq("connection_id", conn.id);

    // Fetch branches (cap at first 30 to keep latency sane)
    let totalBranches = 0;
    const projectsToScan = (storedProjects || []).slice(0, 30);

    for (const proj of projectsToScan) {
      try {
        let branches: any[] = [];
        if (inferredProvider === "github") {
          const apiRoot = (host === "github.com" || host === "www.github.com" || host === "api.github.com" || host === "")
            ? "https://api.github.com"
            : `https://${host}/api/v3`;
          const res = await fetch(`${apiRoot}/repos/${proj.path_with_namespace}/branches?per_page=100`, {
            headers: {
              "Authorization": `Bearer ${conn.encrypted_token}`,
              "Accept": "application/vnd.github+json",
              "X-GitHub-Api-Version": "2022-11-28",
              "User-Agent": "TestZone-Lovable",
            },
          });
          if (!res.ok) continue;
          const data = await res.json();
          if (!Array.isArray(data)) continue;
          branches = data.map((b: any) => ({
            name: b.name,
            is_default: b.name === proj.default_branch,
            last_commit_sha: b.commit?.sha || null,
          }));
        } else {
          const res = await gitlabFetch(conn, `/projects/${proj.project_id}/repository/branches?per_page=100`);
          if (!res.ok) continue;
          const data = await res.json();
          if (!Array.isArray(data)) continue;
          branches = data.map((b: any) => ({
            name: b.name,
            is_default: b.default || b.name === proj.default_branch,
            last_commit_sha: b.commit?.id || null,
          }));
        }

        const rows = branches.map((b) => ({
          user_id: auth.user!.id,
          project_row_id: proj.id,
          name: b.name,
          is_default: b.is_default,
          last_commit_sha: b.last_commit_sha,
          synced_at: new Date().toISOString(),
        }));
        if (rows.length > 0) {
          await admin.from("gitlab_branches").upsert(rows, { onConflict: "project_row_id,name" });
          totalBranches += rows.length;
        }
      } catch (e) {
        console.warn(`Branch sync failed for ${proj.path_with_namespace}`, e);
      }
    }

    const syncedAt = new Date().toISOString();
    await admin
      .from("gitlab_connections")
      .update({ last_sync_at: syncedAt, last_sync_error: null })
      .eq("id", conn.id);

    return new Response(JSON.stringify({
      success: true,
      provider: inferredProvider,
      projects: projectRows.length,
      repositories: projectRows.length,
      branches: totalBranches,
      last_sync_at: syncedAt,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("gitlab-sync error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
