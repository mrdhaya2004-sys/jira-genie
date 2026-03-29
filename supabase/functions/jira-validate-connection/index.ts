import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function sanitizeDomain(domain: string): string {
  return domain.replace(/^https?:\/\//i, '').replace(/\/+$/, '').trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { jiraDomain, jiraEmail, jiraApiToken, jiraProjectKey } = await req.json();

    if (!jiraDomain || !jiraEmail || !jiraApiToken || !jiraProjectKey) {
      return new Response(
        JSON.stringify({ error: 'All fields are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const domain = sanitizeDomain(jiraDomain);
    const auth = btoa(`${jiraEmail}:${jiraApiToken}`);

    // Validate by fetching the project
    const response = await fetch(
      `https://${domain}/rest/api/3/project/${encodeURIComponent(jiraProjectKey)}`,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Jira validation failed:', response.status, errorText);

      let errorMessage = 'Failed to connect. Please check credentials.';
      if (response.status === 401) {
        errorMessage = 'Invalid email or API token.';
      } else if (response.status === 404) {
        errorMessage = 'Project key not found.';
      } else if (response.status === 403) {
        errorMessage = 'Access denied. Check your permissions.';
      }

      return new Response(
        JSON.stringify({ connected: false, error: errorMessage }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const projectData = await response.json();

    // Save/update connection in database
    const { error: upsertError } = await supabaseClient
      .from('jira_connections')
      .upsert({
        user_id: user.id,
        jira_domain: domain,
        jira_email: jiraEmail,
        jira_api_token: jiraApiToken,
        jira_project_key: jiraProjectKey,
        is_connected: true,
        connection_status: 'connected',
        last_validated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (upsertError) {
      console.error('Failed to save connection:', upsertError);
      return new Response(
        JSON.stringify({ connected: false, error: 'Failed to save connection settings.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        connected: true,
        projectName: projectData.name,
        projectKey: projectData.key,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error validating Jira connection:', error);
    return new Response(
      JSON.stringify({ connected: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
