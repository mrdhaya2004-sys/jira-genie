import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAuthenticatedUserAndJiraConnection } from "../_shared/jiraConnection.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { user, jiraConnection, error: connectionError } = await getAuthenticatedUserAndJiraConnection(authHeader);
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!jiraConnection) {
      console.error('Missing Jira connection for user:', user.id, connectionError);
      return new Response(
        JSON.stringify({ ok: false, error: connectionError || 'Jira connection is incomplete' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { jiraDomain, jiraEmail, jiraApiToken, jiraProjectKey } = jiraConnection;

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
      
      // Check if this is a "project not found" error
      let isProjectNotFound = false;
      try {
        const errData = JSON.parse(errorText);
        if (errData.errorMessages && errData.errorMessages.some((msg: string) => 
          msg.includes(jiraProjectKey) || 
          msg.includes('没有找到') || // Chinese "not found"
          msg.includes('not found') ||
          msg.includes('No project') ||
          msg.includes('project') && msg.includes('key')
        )) {
          isProjectNotFound = true;
        }
      } catch {
        // If we can't parse the error, check the raw text
        if (errorText.includes(jiraProjectKey) && (
          errorText.includes('not found') || 
          errorText.includes('没有找到')
        )) {
          isProjectNotFound = true;
        }
      }

      if (isProjectNotFound || projectResponse.status === 404) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: `PROJECT_KEY_NOT_FOUND`,
            errorDetails: `The configured project key "${jiraProjectKey}" does not exist in your Jira instance.`,
            projectKey: jiraProjectKey,
            suggestion: 'Please update your Jira project key in Settings to continue.',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ ok: false, error: 'Failed to fetch project metadata' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const projectData = await projectResponse.json();

    // Extract issue types from the project payload itself (filter out sub-tasks).
    const projectIssueTypes: Array<{ id: string; name: string; subtask?: boolean }> = projectData.issueTypes || [];
    const issueTypes: string[] = projectIssueTypes
      .filter((it) => it.subtask !== true)
      .map((it) => it.name)
      .filter(Boolean);

    // Fetch priorities available in this Jira instance
    let priorities: string[] = ['Critical', 'High', 'Medium', 'Low'];
    try {
      const prioritiesResponse = await fetch(
        `https://${jiraDomain}/rest/api/3/priority`,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json',
          },
        }
      );
      if (prioritiesResponse.ok) {
        const prioritiesData = await prioritiesResponse.json();
        const fetched = (prioritiesData as Array<Record<string, unknown>>)
          .map((p) => p.name as string)
          .filter(Boolean);
        if (fetched.length > 0) priorities = fetched;
      }
    } catch (priorityError) {
      console.log('Could not fetch priorities, using defaults:', priorityError);
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
        priorities: priorities,
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
