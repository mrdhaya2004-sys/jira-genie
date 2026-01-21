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

interface TicketFilters {
  issueType?: string;
  status?: string;
  project?: string;
  searchQuery?: string;
  maxResults?: number;
  startAt?: number;
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

    // Get filters from request body
    let filters: TicketFilters = {};
    if (req.method === 'POST') {
      try {
        filters = await req.json();
      } catch {
        // Use default filters if body is empty
      }
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

    // Build JQL query to fetch user-related tickets
    // Fetches tickets where user is reporter, assignee, or creator
    const jqlParts: string[] = [];
    
    // Base query - tickets related to the project where user is involved
    jqlParts.push(`project = "${jiraProjectKey}"`);
    
    // Add issue type filter
    if (filters.issueType && filters.issueType !== 'all') {
      jqlParts.push(`issuetype = "${filters.issueType}"`);
    }
    
    // Add status filter
    if (filters.status && filters.status !== 'all') {
      jqlParts.push(`status = "${filters.status}"`);
    }
    
    // Add search query filter
    if (filters.searchQuery) {
      const escapedQuery = filters.searchQuery.replace(/"/g, '\\"');
      jqlParts.push(`(summary ~ "${escapedQuery}" OR key = "${escapedQuery}")`);
    }

    const jql = jqlParts.join(' AND ') + ' ORDER BY created DESC';
    const maxResults = filters.maxResults || 50;
    const startAt = filters.startAt || 0;

    console.log('Fetching tickets with JQL:', jql);

    const searchUrl = `https://${jiraDomain}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&startAt=${startAt}&fields=key,summary,issuetype,status,priority,assignee,reporter,created,updated,creator`;

    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Jira API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch tickets from Jira' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
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

    return new Response(
      JSON.stringify({
        tickets,
        total: data.total || 0,
        maxResults: data.maxResults || maxResults,
        startAt: data.startAt || startAt,
        statuses,
        projectKey: jiraProjectKey,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching tickets:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
