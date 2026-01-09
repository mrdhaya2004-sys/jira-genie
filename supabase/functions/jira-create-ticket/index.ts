import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    console.log('Creating Jira ticket with data:', JSON.stringify(ticketData));

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

    let issueTypeId: string | null = null;
    
    if (projectResponse.ok) {
      const projectData = await projectResponse.json();
      const issueTypes = projectData.issueTypes || [];
      
      // Try to find matching issue type by name (case-insensitive)
      const requestedType = ticketData.issueType.toLowerCase();
      const matchingType = issueTypes.find((it: { name: string; id: string }) => 
        it.name.toLowerCase() === requestedType ||
        it.name.toLowerCase().includes(requestedType) ||
        requestedType.includes(it.name.toLowerCase())
      );

      if (matchingType) {
        issueTypeId = matchingType.id;
        console.log(`Found matching issue type: ${matchingType.name} (ID: ${issueTypeId})`);
      } else if (issueTypes.length > 0) {
        // Fallback to first available issue type
        issueTypeId = issueTypes[0].id;
        console.log(`Using fallback issue type: ${issueTypes[0].name} (ID: ${issueTypeId})`);
      }
    }

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
        issuetype: issueTypeId ? { id: issueTypeId } : { name: 'Task' },
        priority: {
          id: priorityMap[ticketData.priority] || '3',
        },
      },
    };

    // Add optional fields
    if (ticketData.module) {
      (issuePayload.fields as Record<string, unknown>).components = [{ name: ticketData.module }];
    }

    console.log('Sending to Jira API:', JSON.stringify(issuePayload));

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
    console.log('Jira API response:', responseText);

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
    
    console.log('Ticket created successfully:', data.key);

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
