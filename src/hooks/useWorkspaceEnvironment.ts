import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Environment, BuildPlatform, DomSnapshot } from '@/types/environment';
import { rememberEnv, getRememberedEnv } from '@/types/environment';

/**
 * Hook to manage the workspace's selected environment + DOM snapshots.
 * Supports per-workspace default + per-module override.
 */
export const useWorkspaceEnvironment = (workspaceId: string | null, workspaceDefaultEnv?: string | null) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeEnv, setActiveEnvState] = useState<Environment | null>(null);
  const [domSnapshots, setDomSnapshots] = useState<DomSnapshot[]>([]);
  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(false);

  // Initialize active env (last selected > workspace default > null)
  useEffect(() => {
    if (!workspaceId) { setActiveEnvState(null); return; }
    const remembered = getRememberedEnv(workspaceId);
    const def = (workspaceDefaultEnv as Environment) || null;
    setActiveEnvState(remembered || def || null);
  }, [workspaceId, workspaceDefaultEnv]);

  const setActiveEnv = useCallback((env: Environment) => {
    if (!workspaceId) return;
    rememberEnv(workspaceId, env);
    setActiveEnvState(env);
  }, [workspaceId]);

  const fetchDomSnapshots = useCallback(async () => {
    if (!workspaceId || !user) { setDomSnapshots([]); return; }
    setIsLoadingSnapshots(true);
    try {
      const { data, error } = await supabase
        .from('dom_snapshots')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setDomSnapshots((data || []) as DomSnapshot[]);
    } catch (e) {
      console.error('fetch dom snapshots failed', e);
    } finally {
      setIsLoadingSnapshots(false);
    }
  }, [workspaceId, user]);

  useEffect(() => { fetchDomSnapshots(); }, [fetchDomSnapshots]);

  const upsertDomSnapshot = useCallback(async (
    env: Environment,
    platform: BuildPlatform,
    domContent: string,
    notes?: string,
  ) => {
    if (!workspaceId || !user) return null;
    try {
      const { data, error } = await supabase
        .from('dom_snapshots')
        .upsert({
          workspace_id: workspaceId,
          user_id: user.id,
          environment: env,
          platform,
          dom_content: domContent,
          notes: notes || null,
          source: 'manual',
        }, { onConflict: 'workspace_id,environment,platform' })
        .select()
        .single();
      if (error) throw error;
      await fetchDomSnapshots();
      toast({ title: 'DOM saved', description: `Snapshot saved for ${env.toUpperCase()} / ${platform}` });
      return data as DomSnapshot;
    } catch (e) {
      console.error(e);
      toast({ title: 'Save failed', description: 'Could not save DOM snapshot', variant: 'destructive' });
      return null;
    }
  }, [workspaceId, user, fetchDomSnapshots, toast]);

  const deleteDomSnapshot = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('dom_snapshots').delete().eq('id', id);
      if (error) throw error;
      await fetchDomSnapshots();
    } catch (e) { console.error(e); }
  }, [fetchDomSnapshots]);

  const getDomSnapshot = useCallback((env: Environment, platform: BuildPlatform): DomSnapshot | undefined =>
    domSnapshots.find(s => s.environment === env && s.platform === platform),
  [domSnapshots]);

  const setWorkspaceDefaultEnv = useCallback(async (env: Environment) => {
    if (!workspaceId) return;
    try {
      const { error } = await supabase
        .from('workspaces')
        .update({ default_environment: env })
        .eq('id', workspaceId);
      if (error) throw error;
    } catch (e) { console.error(e); }
  }, [workspaceId]);

  return {
    activeEnv,
    setActiveEnv,
    domSnapshots,
    isLoadingSnapshots,
    upsertDomSnapshot,
    deleteDomSnapshot,
    getDomSnapshot,
    setWorkspaceDefaultEnv,
    refetchSnapshots: fetchDomSnapshots,
  };
};
