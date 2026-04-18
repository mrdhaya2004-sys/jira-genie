import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function sanitizeDomain(domain: string): string {
  return domain.replace(/^https?:\/\//i, '').replace(/\/+$/, '').trim();
}

interface JiraConnectionConfig {
  jiraDomain: string;
  jiraEmail: string;
  jiraApiToken: string;
  jiraProjectKey: string;
}

export async function getAuthenticatedUserAndJiraConnection(authHeader: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Server configuration error');
  }

  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
  if (authError || !user) {
    return { user: null, jiraConnection: null, error: 'Unauthorized' };
  }

  const { data: jiraConnection, error: connectionError } = await supabaseClient
    .from('jira_connections')
    .select('jira_domain, jira_email, jira_api_token, jira_project_key, is_connected')
    .eq('user_id', user.id)
    .eq('is_connected', true)
    .maybeSingle();

  if (connectionError) {
    throw new Error(`Failed to load Jira connection: ${connectionError.message}`);
  }

  if (!jiraConnection) {
    return { user, jiraConnection: null, error: 'Jira connection is missing. Please reconnect in Settings.' };
  }

  const config: JiraConnectionConfig = {
    jiraDomain: sanitizeDomain(jiraConnection.jira_domain),
    jiraEmail: jiraConnection.jira_email,
    jiraApiToken: jiraConnection.jira_api_token,
    jiraProjectKey: jiraConnection.jira_project_key,
  };

  return { user, jiraConnection: config, error: null };
}