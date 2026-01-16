import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EXCEL_FORMAT_INSTRUCTION = `When generating test cases with Excel structure, output them in JSON format like this:
\`\`\`json
[
  { "column_key": "value", "another_column": "value", ... },
  ...
]
\`\`\`
Use the exact column keys provided in the Excel structure.`;

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

    const { workspaceId, mode, query, context } = await req.json();

    // If workspace mode, verify ownership
    if (workspaceId) {
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
    }
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build system prompt
    let systemPrompt = `You are an expert QA Engineer and Test Case Generator AI. Your role is to create comprehensive, professional test cases based on user requirements.

## Your Capabilities:
- Generate functional, negative, boundary, edge case, and regression test cases
- Follow industry-standard test case formats
- Use precise, actionable test steps
- Include expected results for each test case
- Consider both positive and negative scenarios

## Guidelines:
1. Each test case must have a unique ID (e.g., TC_001, TC_002)
2. Test steps should be clear and reproducible
3. Expected results must be specific and measurable
4. Consider edge cases and boundary conditions
5. Include preconditions when relevant
6. Prioritize test cases appropriately

`;

    // Add workspace context if available
    if (context.userStories) {
      systemPrompt += `\n## Application Context (User Stories):\n${context.userStories}\n\nUse this context to understand the application behavior and generate relevant test cases.\n`;
    }

    // Add Excel format instructions if structure is provided
    if (context.excelStructure) {
      const columns = context.excelStructure.columns.map((c: any) => `- ${c.key}: ${c.header}`).join('\n');
      systemPrompt += `\n## Excel Output Format Required:
The user has provided a reference Excel structure. Generate test cases matching this EXACT format.

**Columns:**
${columns}

${EXCEL_FORMAT_INSTRUCTION}

After the JSON, also provide the test cases in readable format for the chat.
`;
    }

    // Add mode-specific instructions
    if (mode === 'manual') {
      systemPrompt += `\n## Mode: Manual
You're operating without workspace context. Base your test cases purely on the user's description and general best practices.\n`;
    }

    systemPrompt += `\nNow, generate test cases based on the user's request. Be thorough but respect any limits specified by the user.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query },
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
    console.error('testcase-generator error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
