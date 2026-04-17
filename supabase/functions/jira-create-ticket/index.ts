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

interface TicketRequest {
  summary: string;
  description: string;
  issueType: string;
  priority: string;
  module?: string;
  sprint?: string;
  assignee?: string;
  reporterEmail?: string;
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

    const ticketData: TicketRequest = await req.json();
    console.log('Creating Jira ticket for user:', user.id);
    console.log('Ticket data received:', JSON.stringify(ticketData, null, 2));
    console.log('Requested issueType from frontend:', ticketData.issueType);
    console.log('Jira config - domain:', jiraDomain, 'project:', jiraProjectKey);

    // Map priority to Jira priority IDs (these are standard Jira priority IDs)
    const priorityMap: Record<string, string> = {
      'Critical': '1',
      'High': '2',
      'Medium': '3',
      'Low': '4',
    };

    const auth = btoa(`${jiraEmail}:${jiraApiToken}`);

    // First, fetch the project's valid issue types
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
      const errText = await projectResponse.text();
      console.error('Failed to fetch project info:', errText);
      return new Response(
        JSON.stringify({ error: `Unable to fetch project metadata from Jira: ${errText}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const projectData = await projectResponse.json();
    const projectIssueTypes: Array<{ id: string; name: string; subtask?: boolean }> = projectData.issueTypes || [];

    // Exclude subtasks (require a parent)
    const standardIssueTypes = projectIssueTypes.filter((it) => it.subtask !== true);

    console.log(
      '[issuetype] Available for project',
      jiraProjectKey,
      JSON.stringify(standardIssueTypes.map((it) => ({ id: it.id, name: it.name })))
    );

    const requested = (ticketData.issueType || '').trim();
    console.log('[issuetype] Requested from frontend:', requested);

    if (!requested) {
      return new Response(
        JSON.stringify({ error: 'Issue type is required. Please select an issue type.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Strict matching: accept exact ID match OR exact case-insensitive name match.
    // No aliases, no fuzzy matching, no fallback to a default type.
    const matchById = standardIssueTypes.find((it) => it.id === requested);
    const matchByName = matchById
      ? null
      : standardIssueTypes.find((it) => it.name.toLowerCase() === requested.toLowerCase());

    const matchingType = matchById || matchByName;

    if (!matchingType) {
      const available = standardIssueTypes.map((it) => it.name).join(', ');
      console.error(`[issuetype] ❌ "${requested}" is not a valid issue type for project ${jiraProjectKey}. Available: ${available}`);
      return new Response(
        JSON.stringify({
          error: `Invalid issue type "${requested}" for project ${jiraProjectKey}. Available types: ${available}`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const issueTypeId: string = matchingType.id;
    const issueTypeName: string = matchingType.name;
    console.log(`[issuetype] ✅ Resolved "${requested}" -> ${issueTypeName} (ID: ${issueTypeId})`);

    // Build the issue payload
    const issuePayload: Record<string, unknown> = {
      fields: {
        project: {
          key: jiraProjectKey,
        },
        summary: ticketData.summary,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: ticketData.description || 'No description provided',
                },
              ],
            },
          ],
        },
        issuetype: { id: issueTypeId },
        priority: {
          id: priorityMap[ticketData.priority] || '3',
        },
      },
    };

    // Add optional fields
    if (ticketData.module) {
      (issuePayload.fields as Record<string, unknown>).components = [{ name: ticketData.module }];
    }

    // Add assignee if provided and not 'auto'
    if (ticketData.assignee && ticketData.assignee !== 'auto') {
      (issuePayload.fields as Record<string, unknown>).assignee = { accountId: ticketData.assignee };
      console.log('Setting assignee:', ticketData.assignee);
    }

    console.log('Issue payload:', JSON.stringify(issuePayload, null, 2));
    console.log('Sending to Jira API: https://' + jiraDomain + '/rest/api/3/issue');

    const response = await fetch(`https://${jiraDomain}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(issuePayload),
    });

    const responseText = await response.text();
    console.log('Jira API response status:', response.status);

    if (!response.ok) {
      let errorMessage = 'Failed to create Jira ticket';
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.errors) {
          errorMessage = Object.values(errorData.errors).join(', ');
        } else if (errorData.errorMessages) {
          errorMessage = errorData.errorMessages.join(', ');
        }
      } catch {
        errorMessage = responseText || errorMessage;
      }
      
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = JSON.parse(responseText);
    const ticketUrl = `https://${jiraDomain}/browse/${data.key}`;
    
    console.log('Ticket created successfully:', data.key, 'with issue type:', issueTypeName);

    return new Response(
      JSON.stringify({
        success: true,
        ticketKey: data.key,
        ticketId: data.id,
        ticketUrl: ticketUrl,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating Jira ticket:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});