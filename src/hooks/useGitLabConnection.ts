import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { GitLabConnection } from '@/types/gitlab';

export function useGitLabConnection() {
  const { user } = useAuth();
  const [connection, setConnection] = useState<GitLabConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) { setConnection(null); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('gitlab_connections')
      .select('id, base_url, gitlab_username, gitlab_user_id, is_active, last_sync_at, last_sync_error, provider')
      .eq('user_id', user.id)
      .maybeSingle();
    setConnection(data as GitLabConnection | null);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('gitlab-sync', { body: {} });
      if (error || data?.error) throw new Error(data?.error || error?.message || 'Failed');
      const isGitHub = data?.provider === 'github';
      const count = data?.repositories ?? data?.projects ?? 0;
      const label = isGitHub ? 'Repositories' : 'Projects';
      const when = data?.last_sync_at
        ? new Date(data.last_sync_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
        : '';
      toast({
        title: `${isGitHub ? 'GitHub' : 'GitLab'} synced`,
        description: `${label} Synced: ${count}${when ? ` · Last Sync: ${when}` : ''} · ${data.branches} branches`,
      });
      await refresh();
    } catch (e) {
      toast({ title: 'Sync failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  }, [refresh]);

  const connect = useCallback(async (base_url: string, token: string, provider?: 'github' | 'gitlab') => {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('gitlab-connect', { body: { base_url, token, provider } });
      if (error || data?.error) throw new Error(data?.error || error?.message || 'Failed');
      const providerLabel = data?.provider === 'github' ? 'GitHub' : 'GitLab';
      const itemLabel = data?.provider === 'github' ? 'repositories' : 'projects';
      toast({ title: `${providerLabel} connected`, description: `Hi ${data.connection.username}, syncing your ${itemLabel}…` });
      await refresh();
      // fire-and-forget sync
      sync();
      return true;
    } catch (e) {
      toast({ title: 'Connection failed', description: (e as Error).message, variant: 'destructive' });
      return false;
    } finally {
      setConnecting(false);
    }
  }, [refresh, sync]);

  const disconnect = useCallback(async () => {
    await supabase.functions.invoke('gitlab-disconnect', { body: {} });
    await refresh();
  }, [refresh]);

  return { connection, loading, connecting, syncing, connect, sync, disconnect, refresh };
}
