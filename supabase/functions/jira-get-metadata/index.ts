import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sanitize domain - remove protocol and trailing slashes
function sanitizeDomain(domain: string): string {
  return domain
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '')
    .trim();
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jiraDomainRaw = Deno.env.get('JIRA_DOMAIN');
    const jiraDomain = jiraDomainRaw ? sanitizeDomain(jiraDomainRaw) : null;
    const jiraEmail = Deno.env.get('JIRA_USER_EMAIL');
    const jiraApiToken = Deno.env.get('JIRA_API_TOKEN');
    const jiraProjectKey = Deno.env.get('JIRA_PROJECT_KEY');

    if (!jiraDomain || !jiraEmail || !jiraApiToken || !jiraProjectKey) {
      console.error('Missing Jira configuration');
      return new Response(
        JSON.stringify({ error: 'Jira configuration is incomplete' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const auth = btoa(`${jiraEmail}:${jiraApiToken}`);

    // Fetch project metadata
    const projectResponse = await fetch(
      `https://${jiraDomain}/rest/api/3/project/${jiraProjectKey}`,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!projectResponse.ok) {
      const errorText = await projectResponse.text();
      console.error('Failed to fetch project:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch project metadata' }),
        { status: projectResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const projectData = await projectResponse.json();

    // Fetch issue types for the project
    const issueTypesResponse = await fetch(
      `https://${jiraDomain}/rest/api/3/project/${jiraProjectKey}/statuses`,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
        },
      }
    );

    let issueTypes: string[] = ['Bug', 'Task', 'Story'];
    if (issueTypesResponse.ok) {
      const issueTypesData = await issueTypesResponse.json();
      issueTypes = issueTypesData.map((it: Record<string, unknown>) => it.name).filter(Boolean);
    }

    // Fetch components
    const componentsResponse = await fetch(
      `https://${jiraDomain}/rest/api/3/project/${jiraProjectKey}/components`,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
        },
      }
    );

    let components: string[] = [];
    if (componentsResponse.ok) {
      const componentsData = await componentsResponse.json();
      components = componentsData.map((c: Record<string, unknown>) => c.name).filter(Boolean);
    }

    // Fetch active sprints (if board exists)
    let sprints: Array<{ id: number; name: string }> = [];
    try {
      // First get the board ID
      const boardsResponse = await fetch(
        `https://${jiraDomain}/rest/agile/1.0/board?projectKeyOrId=${jiraProjectKey}`,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json',
          },
        }
      );

      if (boardsResponse.ok) {
        const boardsData = await boardsResponse.json();
        const boardId = boardsData.values?.[0]?.id;

        if (boardId) {
          const sprintsResponse = await fetch(
            `https://${jiraDomain}/rest/agile/1.0/board/${boardId}/sprint?state=active,future`,
            {
              headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json',
              },
            }
          );

          if (sprintsResponse.ok) {
            const sprintsData = await sprintsResponse.json();
            sprints = sprintsData.values?.map((s: Record<string, unknown>) => ({
              id: s.id,
              name: s.name,
            })) || [];
          }
        }
      }
    } catch (sprintError) {
      console.log('Could not fetch sprints (Agile board may not exist):', sprintError);
    }

    // Fetch assignable users
    let users: Array<{ accountId: string; displayName: string; emailAddress?: string }> = [];
    try {
      const usersResponse = await fetch(
        `https://${jiraDomain}/rest/api/3/user/assignable/search?project=${jiraProjectKey}&maxResults=50`,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json',
          },
        }
      );

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        users = usersData.map((u: Record<string, unknown>) => ({
          accountId: u.accountId,
          displayName: u.displayName,
          emailAddress: u.emailAddress,
        }));
      }
    } catch (userError) {
      console.log('Could not fetch users:', userError);
    }

    console.log('Metadata fetched successfully for user:', user.id);

    return new Response(
      JSON.stringify({
        projectKey: jiraProjectKey,
        projectName: projectData.name,
        issueTypes: issueTypes,
        components: components,
        sprints: sprints,
        users: users,
        priorities: ['Critical', 'High', 'Medium', 'Low'],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching Jira metadata:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
