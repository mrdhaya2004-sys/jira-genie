import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { GitLabBranch, GitLabProject } from '@/types/gitlab';

export function useGitLabProjects(enabled: boolean) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<GitLabProject[]>([]);
  const [branchesByProject, setBranchesByProject] = useState<Record<string, GitLabBranch[]>>({});
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user || !enabled) return;
    setLoading(true);
    const { data: ps } = await supabase
      .from('gitlab_projects')
      .select('id, project_id, name, path_with_namespace, default_branch, web_url, avatar_url, owner, visibility')
      .eq('user_id', user.id)
      .order('last_activity_at', { ascending: false, nullsFirst: false });
    setProjects((ps || []) as GitLabProject[]);

    const ids = (ps || []).map((p) => p.id);
    if (ids.length > 0) {
      const { data: bs } = await supabase
        .from('gitlab_branches')
        .select('id, project_row_id, name, is_default, last_commit_sha')
        .in('project_row_id', ids);
      const map: Record<string, GitLabBranch[]> = {};
      (bs || []).forEach((b) => {
        (map[b.project_row_id] ||= []).push(b as GitLabBranch);
      });
      Object.values(map).forEach((arr) => arr.sort((a, b) => Number(b.is_default) - Number(a.is_default) || a.name.localeCompare(b.name)));
      setBranchesByProject(map);
    } else {
      setBranchesByProject({});
    }
    setLoading(false);
  }, [user, enabled]);

  useEffect(() => { load(); }, [load]);

  return { projects, branchesByProject, loading, reload: load };
}
