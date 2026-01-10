import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CAPABILITY_PROMPTS: Record<string, string> = {
  test_cases: `Generate comprehensive test cases based on the user stories and application context. Include:
- Test case ID
- Test case title
- Preconditions
- Test steps
- Expected results
- Test data
Format as a structured table.`,
  
  code_generation: `Generate automation test code based on the request. Support these frameworks:
- Python with pytest/selenium
- Java with TestNG/Selenium
- Playwright (TypeScript)
Provide clean, well-commented, production-ready code.`,
  
  xpath_generation: `Generate robust XPath/locators for mobile elements. Provide:
- Android XPath expressions
- iOS accessibility identifiers
- Alternative locator strategies
- Best practices for the specific element type.`,
  
  jira_ticket: `Create a well-structured Jira ticket with:
- Summary (clear, concise)
- Description (detailed with acceptance criteria)
- Steps to reproduce (if bug)
- Priority suggestion
- Labels/Components suggestion
Format in Jira-compatible markdown.`,
  
  workflow_breakdown: `Analyze the application and break down the workflow:
- List all screens/modules
- Map user journeys
- Identify critical paths
- Document state transitions
- Highlight integration points.`,
  
  explain_app: `Explain the application in simple terms:
- What the app does (purpose)
- Key features and functionality
- Target users
- Main user flows
- Technical architecture overview.`,
  
  qa_chat: `You are a helpful QA assistant. Answer questions about the application, testing strategies, and help with any testing-related queries.`,
};

serve(async (req) => {
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

    const { workspaceId, message, capability, context, history } = await req.json();

    // Verify user owns the workspace
    const { data: workspace, error: workspaceError } = await supabaseClient
      .from('workspaces')
      .select('id')
      .eq('id', workspaceId)
      .eq('owner_id', user.id)
      .single();

    if (workspaceError || !workspace) {
      return new Response(
        JSON.stringify({ error: 'Workspace not found or access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build system prompt with context
    let systemPrompt = `You are an Agentic AI assistant specialized in software testing, quality assurance, and mobile application analysis. You help users understand applications, generate test cases, create automation code, and support their testing efforts.

WORKSPACE CONTEXT:
`;

    if (context.userStories) {
      systemPrompt += `\n## User Stories:\n${context.userStories}\n`;
    }

    if (context.hasApk || context.hasIpa) {
      systemPrompt += `\n## Uploaded Application Files:\n`;
      context.appFiles?.forEach((f: { name: string; type: string }) => {
        systemPrompt += `- ${f.name} (${f.type.toUpperCase()})\n`;
      });
      systemPrompt += `\nNote: You have access to the application structure through these uploaded files. Simulate understanding of the app's DOM, screens, and modules based on typical mobile app patterns and the provided user stories.\n`;
    }

    // Add capability-specific instructions
    if (capability && CAPABILITY_PROMPTS[capability]) {
      systemPrompt += `\n## Current Task:\n${CAPABILITY_PROMPTS[capability]}\n`;
    }

    systemPrompt += `\nAlways provide helpful, accurate, and actionable responses. When generating code, ensure it's production-ready and follows best practices.`;

    // Build messages array
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(history || []),
      { role: 'user', content: message },
    ];

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error('AI request failed');
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (error) {
    console.error('workspace-ai-chat error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
