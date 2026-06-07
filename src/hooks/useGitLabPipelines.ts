import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { GitLabPipelineRun } from '@/types/gitlab';

export function useGitLabPipelines() {
  const { user } = useAuth();
  const [runs, setRuns] = useState<GitLabPipelineRun[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('gitlab_pipeline_runs')
      .select('id, project_row_id, gitlab_project_id, pipeline_id, branch, status, web_url, started_at, finished_at, duration_seconds, stats, triggered_via, conversation_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setRuns((data || []) as GitLabPipelineRun[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { reload(); }, [reload]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`gitlab_runs_${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'gitlab_pipeline_runs', filter: `user_id=eq.${user.id}`,
      }, () => reload())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, reload]);

  return { runs, loading, reload };
}
