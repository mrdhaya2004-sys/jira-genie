import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAuthenticatedUserAndJiraConnection } from "../_shared/jiraConnection.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      
      // Check if this is a "project not found" error
      let isProjectNotFound = false;
      try {
        const errData = JSON.parse(errText);
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
        if (errText.includes(jiraProjectKey) && (
          errText.includes('not found') || 
          errText.includes('没有找到')
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
        JSON.stringify({ ok: false, error: `Unable to fetch project metadata from Jira: ${errText}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        JSON.stringify({ ok: false, error: 'Issue type is required. Please select an issue type.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
          ok: false,
          error: `Invalid issue type "${requested}" for project ${jiraProjectKey}. Available types: ${available}`,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const issueTypeId: string = matchingType.id;
    const issueTypeName: string = matchingType.name;
    console.log(`[issuetype] ✅ Resolved "${requested}" -> ${issueTypeName} (ID: ${issueTypeId})`);

    // Convert markdown-style description into ADF (Atlassian Document Format)
    // so that *bold*, lists, and numbered steps render correctly in Jira.
    const buildAdfDescription = (raw: string) => {
      const text = raw || 'No description provided';

      // Inline parser: handles *bold* segments within a line.
      const parseInline = (line: string) => {
        const nodes: Array<Record<string, unknown>> = [];
        const regex = /\*([^*\n]+)\*/g;
        let lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(line)) !== null) {
          if (match.index > lastIndex) {
            nodes.push({ type: 'text', text: line.slice(lastIndex, match.index) });
          }
          nodes.push({ type: 'text', text: match[1], marks: [{ type: 'strong' }] });
          lastIndex = regex.lastIndex;
        }
        if (lastIndex < line.length) {
          nodes.push({ type: 'text', text: line.slice(lastIndex) });
        }
        return nodes.length > 0 ? nodes : [{ type: 'text', text: line }];
      };

      const lines = text.split('\n');
      const content: Array<Record<string, unknown>> = [];
      let i = 0;
      while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();

        if (trimmed === '') {
          i++;
          continue;
        }

        // Bullet list (lines starting with "- ")
        if (/^-\s+/.test(trimmed)) {
          const items: Array<Record<string, unknown>> = [];
          while (i < lines.length && /^-\s+/.test(lines[i].trim())) {
            const itemText = lines[i].trim().replace(/^-\s+/, '');
            items.push({
              type: 'listItem',
              content: [{ type: 'paragraph', content: parseInline(itemText) }],
            });
            i++;
          }
          content.push({ type: 'bulletList', content: items });
          continue;
        }

        // Numbered list (lines starting with "1. ", "2. ", etc.)
        if (/^\d+\.\s+/.test(trimmed)) {
          const items: Array<Record<string, unknown>> = [];
          while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
            const itemText = lines[i].trim().replace(/^\d+\.\s+/, '');
            items.push({
              type: 'listItem',
              content: [{ type: 'paragraph', content: parseInline(itemText) }],
            });
            i++;
          }
          content.push({ type: 'orderedList', content: items });
          continue;
        }

        // Default: paragraph (single line)
        content.push({ type: 'paragraph', content: parseInline(trimmed) });
        i++;
      }

      return {
        type: 'doc',
        version: 1,
        content: content.length > 0 ? content : [{ type: 'paragraph', content: [{ type: 'text', text }] }],
      };
    };

    // Build the issue payload
    const issuePayload: Record<string, unknown> = {
      fields: {
        project: {
          key: jiraProjectKey,
        },
        summary: ticketData.summary,
        description: buildAdfDescription(ticketData.description),
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
        JSON.stringify({ ok: false, error: errorMessage }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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