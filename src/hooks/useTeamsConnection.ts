import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TeamsConnection, TeamsConnectionStatus } from '@/types/teams';
import { toast } from 'sonner';

export function useTeamsConnection() {
  const { user } = useAuth();
  const [connection, setConnection] = useState<TeamsConnection | null>(null);
  const [status, setStatus] = useState<TeamsConnectionStatus>('disconnected');
  const [isLoading, setIsLoading] = useState(true);

  const fetchConnection = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('teams_connections')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConnection(data as TeamsConnection);
        setStatus(data.is_connected ? 'connected' : 'disconnected');
      } else {
        setConnection(null);
        setStatus('disconnected');
      }
    } catch (error) {
      console.error('Error fetching Teams connection:', error);
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  const initiateConnection = useCallback(async () => {
    if (!user) return;

    setStatus('connecting');

    try {
      // Call the teams-auth edge function to get the OAuth URL
      const { data, error } = await supabase.functions.invoke('teams-auth', {
        body: { action: 'get_auth_url' }
      });

      if (error) throw error;

      if (data?.auth_url) {
        // Open Microsoft login in a popup
        const popup = window.open(
          data.auth_url,
          'teams-auth',
          'width=600,height=700,scrollbars=yes'
        );

        // Listen for the popup to close and check connection
        const checkInterval = setInterval(async () => {
          if (popup?.closed) {
            clearInterval(checkInterval);
            await fetchConnection();
          }
        }, 1000);

        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(checkInterval);
          if (status === 'connecting') {
            setStatus('disconnected');
          }
        }, 5 * 60 * 1000);
      } else {
        // No auth URL means credentials not configured yet
        toast.info('Microsoft Teams integration is not yet configured. Azure credentials are required.');
        setStatus('disconnected');
      }
    } catch (error) {
      console.error('Error initiating Teams connection:', error);
      toast.error('Failed to connect to Microsoft Teams. Please try again later.');
      setStatus('disconnected');
    }
  }, [user, fetchConnection, status]);

  const disconnect = useCallback(async () => {
    if (!user || !connection) return;

    try {
      const { error } = await supabase
        .from('teams_connections')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setConnection(null);
      setStatus('disconnected');
      toast.success('Disconnected from Microsoft Teams');
    } catch (error) {
      console.error('Error disconnecting Teams:', error);
      toast.error('Failed to disconnect');
    }
  }, [user, connection]);

  const syncNow = useCallback(async () => {
    if (!user || !connection?.is_connected) return;

    setStatus('syncing');

    try {
      const { data, error } = await supabase.functions.invoke('teams-sync', {
        body: { action: 'sync_chats' }
      });

      if (error) throw error;

      toast.success(`Synced ${data?.synced_count || 0} conversations from Teams`);
      setStatus('connected');

      // Update last_synced_at
      await supabase
        .from('teams_connections')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('user_id', user.id);

      await fetchConnection();
    } catch (error) {
      console.error('Error syncing Teams:', error);
      toast.error('Teams sync is not available yet. Azure credentials are required.');
      setStatus('connected');
    }
  }, [user, connection, fetchConnection]);

  const toggleSync = useCallback(async (enabled: boolean) => {
    if (!user || !connection) return;

    try {
      const { error } = await supabase
        .from('teams_connections')
        .update({ sync_enabled: enabled })
        .eq('user_id', user.id);

      if (error) throw error;

      setConnection(prev => prev ? { ...prev, sync_enabled: enabled } : null);
      toast.success(enabled ? 'Auto-sync enabled' : 'Auto-sync disabled');
    } catch (error) {
      console.error('Error toggling sync:', error);
      toast.error('Failed to update sync settings');
    }
  }, [user, connection]);

  return {
    connection,
    status,
    isLoading,
    initiateConnection,
    disconnect,
    syncNow,
    toggleSync,
    refetch: fetchConnection
  };
}
