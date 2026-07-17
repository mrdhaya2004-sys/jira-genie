import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAuthenticatedUserAndJiraConnection } from "../_shared/jiraConnection.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sanitize domain - remove protocol/trailing slashes and enforce Atlassian allowlist to prevent SSRF
function sanitizeDomain(domain: string): string {
  const cleaned = domain
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '')
    .trim()
    .toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]*\.atlassian\.net$/.test(cleaned)) {
    throw new Error('Invalid Jira domain. Only *.atlassian.net domains are allowed.');
  }
  return cleaned;
}

// Escape JQL special characters to prevent injection attacks
function escapeJQLString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\~')
    .replace(/\*/g, '\\*')
    .replace(/\?/g, '\\?')
    .replace(/\^/g, '\\^')
    .replace(/!/g, '\\!');
}

// Validate and sanitize filter input
function sanitizeFilterInput(input: string, maxLength: number = 100): string {
  if (!input || typeof input !== 'string') return '';
  return input.trim().slice(0, maxLength).replace(/\0/g, '');
}

interface TicketFilters {
  issueType?: string;
  status?: string;
  project?: string;
  searchQuery?: string;
  maxResults?: number;
  startAt?: number;
}

function jsonResponse(payload: Record<string, unknown>, status = 200): Response {
  return new Response(
    JSON.stringify(payload),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function emptyTicketsResponse(error: string, projectKey?: string): Response {
  return jsonResponse({
    tickets: [],
    total: 0,
    maxResults: 0,
    startAt: 0,
    statuses: [],
    projectKey: projectKey || '',
    error,
  });
}

function friendlyJiraError(status: number, errorText: string, projectKey: string): string {
  if (/SUSPENDED_INACTIVITY/i.test(errorText) || /deactivated due to inactivity/i.test(errorText)) {
    return 'Your Jira Cloud subscription has been deactivated due to inactivity. Please sign in to your Jira site to reactivate it, then retry.';
  }
  if (status === 401) return 'Jira authentication failed. Please reconnect Jira in Settings.';
  if (status === 403) return 'Access denied by Jira. Check your permissions for this project.';
  if (status === 404) return `Jira project "${projectKey}" was not found.`;
  if (status >= 500) return 'Jira is temporarily unavailable. Please retry in a moment.';
  return `Jira returned ${status}. Please try again.`;
}

function friendlyUnexpectedError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || 'Unknown error');
  if (/dns|failed to lookup|name or service not known|network|fetch/i.test(message)) {
    return 'Jira could not be reached from the backend. Check the Jira domain and try again.';
  }
  if (/Invalid Jira domain/i.test(message)) return message;
  return 'Unable to load Jira tickets right now. Please retry in a moment.';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    // Load per-user Jira connection (same source as Jira Ticket Raiser)
    const { user, jiraConnection, error: connError } = await getAuthenticatedUserAndJiraConnection(authHeader);
    if (!user) {
      return jsonResponse({ error: connError || 'Unauthorized' }, 401);
    }
    if (!jiraConnection) {
      return emptyTicketsResponse(connError || 'Jira is not connected. Please connect Jira in Settings.');
    }

    let filters: TicketFilters = {};
    if (req.method === 'POST') {
      try {
        filters = await req.json();
      } catch {
        // Use default filters if body is empty
      }
    }

    const { jiraDomain, jiraEmail, jiraApiToken, jiraProjectKey } = jiraConnection;
    const auth = btoa(`${jiraEmail}:${jiraApiToken}`);

    // Build JQL query to fetch user-related tickets
    // Fetches tickets where user is reporter, assignee, or creator
    const jqlParts: string[] = [];
    
    // Base query - tickets related to the project where user is involved
    jqlParts.push(`project = "${jiraProjectKey}"`);
    
    // Add issue type filter
    if (filters.issueType && filters.issueType !== 'all') {
      const sanitizedType = sanitizeFilterInput(filters.issueType);
      if (sanitizedType) {
        jqlParts.push(`issuetype = "${escapeJQLString(sanitizedType)}"`);
      }
    }
    
    // Add status filter
    if (filters.status && filters.status !== 'all') {
      const sanitizedStatus = sanitizeFilterInput(filters.status);
      if (sanitizedStatus) {
        jqlParts.push(`status = "${escapeJQLString(sanitizedStatus)}"`);
      }
    }
    
    // Add search query filter
    if (filters.searchQuery) {
      const escapedQuery = escapeJQLString(sanitizeFilterInput(filters.searchQuery, 255));
      jqlParts.push(`(summary ~ "${escapedQuery}" OR key = "${escapedQuery}")`);
    }

    const jql = jqlParts.join(' AND ') + ' ORDER BY created DESC';
    const maxResults = filters.maxResults || 50;
    const startAt = filters.startAt || 0;

    console.log('Fetching tickets with JQL:', jql);

    // Use the new /rest/api/3/search/jql endpoint (POST method)
    const searchUrl = `https://${jiraDomain}/rest/api/3/search/jql`;

    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jql: jql,
        maxResults: maxResults,
        fields: ['key', 'summary', 'issuetype', 'status', 'priority', 'assignee', 'reporter', 'created', 'updated', 'creator', 'duedate', 'labels'],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Jira API error:', response.status, errorText);

      return emptyTicketsResponse(friendlyJiraError(response.status, errorText, jiraProjectKey), jiraProjectKey);
    }

    const data = await response.json();
    
    // The new API uses 'total' for count of matching issues
    const totalCount = data.total || data.issues?.length || 0;
    console.log('Jira API response - total:', totalCount, 'issues count:', data.issues?.length);
    // Transform Jira response to our format
    const tickets = data.issues?.map((issue: Record<string, unknown>) => {
      const fields = issue.fields as Record<string, unknown>;
      const issueType = fields.issuetype as Record<string, unknown> | null;
      const status = fields.status as Record<string, unknown> | null;
      const priority = fields.priority as Record<string, unknown> | null;
      const assignee = fields.assignee as Record<string, unknown> | null;
      const reporter = fields.reporter as Record<string, unknown> | null;
      const creator = fields.creator as Record<string, unknown> | null;
      
      return {
        key: issue.key,
        id: issue.id,
        summary: fields.summary,
        issueType: {
          name: issueType?.name || 'Unknown',
          iconUrl: issueType?.iconUrl,
        },
        status: {
          name: status?.name || 'Unknown',
          category: (status?.statusCategory as Record<string, unknown>)?.key || 'undefined',
        },
        priority: {
          name: priority?.name || 'Medium',
          iconUrl: priority?.iconUrl,
        },
        assignee: assignee ? {
          displayName: assignee.displayName,
          avatarUrl: (assignee.avatarUrls as Record<string, string>)?.['24x24'],
          accountId: assignee.accountId,
        } : null,
        reporter: reporter ? {
          displayName: reporter.displayName,
          avatarUrl: (reporter.avatarUrls as Record<string, string>)?.['24x24'],
          accountId: reporter.accountId,
        } : null,
        creator: creator ? {
          displayName: creator.displayName,
          accountId: creator.accountId,
        } : null,
        created: fields.created,
        updated: fields.updated,
        dueDate: (fields.duedate as string | null) || null,
        labels: (fields.labels as string[] | null) || [],
        url: `https://${jiraDomain}/browse/${issue.key}`,
      };
    }) || [];

    // Fetch available statuses for filter options
    let statuses: string[] = [];
    try {
      const statusesResponse = await fetch(
        `https://${jiraDomain}/rest/api/3/project/${jiraProjectKey}/statuses`,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json',
          },
        }
      );
      
      if (statusesResponse.ok) {
        const statusesData = await statusesResponse.json();
        const allStatuses = new Set<string>();
        statusesData.forEach((issueType: Record<string, unknown>) => {
          const typeStatuses = issueType.statuses as Array<Record<string, unknown>>;
          typeStatuses?.forEach((s) => {
            if (s.name) allStatuses.add(s.name as string);
          });
        });
        statuses = Array.from(allStatuses);
      }
    } catch (err) {
      console.log('Could not fetch statuses:', err);
    }

    console.log(`Fetched ${tickets.length} tickets for user:`, user.id);

    return jsonResponse({
      tickets,
      total: totalCount,
      maxResults,
      startAt: 0,
      statuses,
      projectKey: jiraProjectKey,
    });

  } catch (error) {
    console.error('Error fetching tickets:', error);
    return emptyTicketsResponse(friendlyUnexpectedError(error));
  }
});
