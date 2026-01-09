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

interface SearchRequest {
  summary: string;
  description?: string;
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

    const { summary, description }: SearchRequest = await req.json();
    console.log('Searching for duplicates with summary:', summary);

    const auth = btoa(`${jiraEmail}:${jiraApiToken}`);
    
    // Extract keywords from summary for search
    const keywords = summary
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 5)
      .join(' OR ');

    // Build JQL query to search for similar issues
    const jql = `project = "${jiraProjectKey}" AND (summary ~ "${keywords}" OR description ~ "${keywords}") AND status NOT IN (Done, Closed) ORDER BY created DESC`;
    
    console.log('JQL Query:', jql);

    const response = await fetch(`https://${jiraDomain}/rest/api/3/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jql: jql,
        maxResults: 5,
        fields: ['summary', 'description', 'status', 'priority', 'created', 'key'],
      }),
    });

    const responseText = await response.text();
    console.log('Jira search response status:', response.status);

    if (!response.ok) {
      console.error('Jira search failed:', responseText);
      // Return empty results instead of error for search failures
      return new Response(
        JSON.stringify({ duplicates: [], totalCount: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = JSON.parse(responseText);
    console.log('Found', data.total, 'potential duplicates');

    const duplicates = data.issues?.map((issue: Record<string, unknown>) => ({
      key: issue.key,
      summary: (issue.fields as Record<string, unknown>)?.summary,
      status: ((issue.fields as Record<string, unknown>)?.status as Record<string, unknown>)?.name,
      priority: ((issue.fields as Record<string, unknown>)?.priority as Record<string, unknown>)?.name,
      created: (issue.fields as Record<string, unknown>)?.created,
      url: `https://${jiraDomain}/browse/${issue.key}`,
    })) || [];

    return new Response(
      JSON.stringify({
        duplicates: duplicates,
        totalCount: data.total || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error searching Jira:', error);
    return new Response(
      JSON.stringify({ duplicates: [], totalCount: 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
