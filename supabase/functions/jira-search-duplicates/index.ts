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

// Escape JQL special characters to prevent injection attacks
function escapeJQLString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')   // Escape backslashes first
    .replace(/"/g, '\\"')      // Escape double quotes
    .replace(/'/g, "\\'")      // Escape single quotes
    .replace(/\[/g, '\\[')     // Escape brackets
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')     // Escape parentheses
    .replace(/\)/g, '\\)')
    .replace(/\{/g, '\\{')     // Escape braces
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\~')      // Escape tilde (JQL text search operator)
    .replace(/\*/g, '\\*')     // Escape wildcard
    .replace(/\?/g, '\\?')     // Escape single char wildcard
    .replace(/\^/g, '\\^')     // Escape caret
    .replace(/!/g, '\\!');     // Escape exclamation
}

// Validate and sanitize search input
function sanitizeSearchInput(input: string, maxLength: number = 255): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  // Trim, limit length, and remove any null bytes
  return input.trim().slice(0, maxLength).replace(/\0/g, '');
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
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', duplicates: [], totalCount: 0 }),
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
        JSON.stringify({ error: 'Unauthorized', duplicates: [], totalCount: 0 }),
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

    const { summary, description }: SearchRequest = await req.json();
    
    // Validate and sanitize input to prevent JQL injection
    const sanitizedSummary = sanitizeSearchInput(summary, 255);
    
    if (!sanitizedSummary) {
      return new Response(
        JSON.stringify({ duplicates: [], totalCount: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Searching for duplicates for user:', user.id);

    const auth = btoa(`${jiraEmail}:${jiraApiToken}`);
    
    // Extract keywords from summary and escape each one for JQL safety
    const keywords = sanitizedSummary
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 5)
      .map(word => escapeJQLString(word))
      .filter(word => word.length > 0)
      .join(' OR ');

    // If no valid keywords after sanitization, return empty results
    if (!keywords) {
      return new Response(
        JSON.stringify({ duplicates: [], totalCount: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build JQL query with escaped values
    const jql = `project = "${escapeJQLString(jiraProjectKey)}" AND (summary ~ "${keywords}" OR description ~ "${keywords}") AND status NOT IN (Done, Closed) ORDER BY created DESC`;
    
    console.log('JQL Query (sanitized):', jql);

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
