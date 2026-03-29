import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ConnectionStatus = 'not_connected' | 'connecting' | 'connected';

export interface JiraConnectionData {
  jiraDomain: string;
  jiraEmail: string;
  jiraApiToken: string;
  jiraProjectKey: string;
}

export interface JiraConnectionState {
  status: ConnectionStatus;
  data: JiraConnectionData;
  projectName?: string;
  lastValidatedAt?: string;
}

export function useJiraConnection() {
  const { user } = useAuth();
  const [state, setState] = useState<JiraConnectionState>({
    status: 'not_connected',
    data: { jiraDomain: '', jiraEmail: '', jiraApiToken: '', jiraProjectKey: '' },
  });
  const [loading, setLoading] = useState(true);

  const fetchConnection = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('jira_connections')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching jira connection:', error);
        return;
      }

      if (data) {
        setState({
          status: data.is_connected ? 'connected' : 'not_connected',
          data: {
            jiraDomain: data.jira_domain,
            jiraEmail: data.jira_email,
            jiraApiToken: data.jira_api_token,
            jiraProjectKey: data.jira_project_key,
          },
          lastValidatedAt: data.last_validated_at || undefined,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  const connect = async (data: JiraConnectionData) => {
    setState(prev => ({ ...prev, status: 'connecting' }));

    try {
      const { data: result, error } = await supabase.functions.invoke('jira-validate-connection', {
        body: {
          jiraDomain: data.jiraDomain,
          jiraEmail: data.jiraEmail,
          jiraApiToken: data.jiraApiToken,
          jiraProjectKey: data.jiraProjectKey,
        },
      });

      if (error) {
        setState(prev => ({ ...prev, status: 'not_connected' }));
        return { success: false, error: error.message };
      }

      if (result?.connected) {
        setState({
          status: 'connected',
          data,
          projectName: result.projectName,
          lastValidatedAt: new Date().toISOString(),
        });
        return { success: true, projectName: result.projectName };
      } else {
        setState(prev => ({ ...prev, status: 'not_connected' }));
        return { success: false, error: result?.error || 'Connection failed' };
      }
    } catch (err) {
      setState(prev => ({ ...prev, status: 'not_connected' }));
      return { success: false, error: 'Network error' };
    }
  };

  const disconnect = async () => {
    if (!user) return;
    await supabase
      .from('jira_connections')
      .update({ is_connected: false, connection_status: 'not_connected' })
      .eq('user_id', user.id);

    setState(prev => ({ ...prev, status: 'not_connected' }));
  };

  return { ...state, loading, connect, disconnect, refetch: fetchConnection };
}
