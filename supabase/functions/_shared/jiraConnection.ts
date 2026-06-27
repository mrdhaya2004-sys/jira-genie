import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function sanitizeDomain(domain: string): string {
  const cleaned = domain.replace(/^https?:\/\//i, '').replace(/\/+$/, '').trim().toLowerCase();
  // Allowlist: only Atlassian-hosted Jira Cloud domains to prevent SSRF
  // (e.g., internal IPs, metadata endpoints, arbitrary hosts).
  if (!/^[a-z0-9][a-z0-9-]*\.atlassian\.net$/.test(cleaned)) {
    throw new Error('Invalid Jira domain. Only *.atlassian.net domains are allowed.');
  }
  return cleaned;
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
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    throw new Error('Server configuration error');
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) {
    return { user: null, jiraConnection: null, error: 'Unauthorized' };
  }

  // Use service-role: SELECT on jira_connections (incl. jira_api_token) is
  // revoked from the authenticated role for security.
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: jiraConnection, error: connectionError } = await adminClient
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