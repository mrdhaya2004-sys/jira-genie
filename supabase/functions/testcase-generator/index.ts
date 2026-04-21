import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { routeAIRequest } from "../_shared/hiveMindRouter.ts";

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

    const { workspaceId, mode, query, context, episodicMemory } = await req.json();

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

    // Build system prompt
    let contextInfo = '';
    if (context?.userStories) {
      contextInfo += `\n\n## User Stories (from Workspace Brain):\n${context.userStories}`;
    }

    // Determine column structure — use user-provided one or a sensible default
    const defaultColumns = [
      { key: 'title', header: 'Title' },
      { key: 'preconditions', header: 'Preconditions' },
      { key: 'steps', header: 'Steps' },
      { key: 'expected_result', header: 'Expected Result' },
      { key: 'priority', header: 'Priority' },
      { key: 'type', header: 'Type' },
    ];
    const columns = context?.excelStructure?.columns?.length
      ? context.excelStructure.columns
      : defaultColumns;
    const columnKeys = columns.map((c: any) => c.key);
    const columnHeaders = columns.map((c: any) => c.header);

    contextInfo += `\n\n## REQUIRED OUTPUT FORMAT
You MUST output ALL test cases as a single JSON code block using these EXACT column keys:
Keys: ${JSON.stringify(columnKeys)}
Headers (for reference): ${JSON.stringify(columnHeaders)}

Example:
\`\`\`json
[
  { ${columnKeys.map((k: string) => `"${k}": "..."`).join(', ')} }
]
\`\`\`

Rules:
- Use multi-line strings for "steps" with numbered steps separated by \\n
- Output ONLY ONE JSON code block containing an array of all test cases
- After the JSON block you may add a brief 1-2 line summary in plain text
- Do NOT split test cases across multiple code blocks`;

    const systemPrompt = `You are an expert QA Engineer specializing in test case generation.

## Your Task
Generate comprehensive, well-structured test cases based on the user's request.

## Important Rules
1. Generate functional, negative, edge-case, and boundary test cases as appropriate
2. Use realistic test data
3. Consider positive, negative, and edge cases
4. Be thorough but concise
${contextInfo}`;

    // Build messages with episodic memory context
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Inject previous conversation turns for episodic memory
    if (episodicMemory && Array.isArray(episodicMemory) && episodicMemory.length > 0) {
      messages[0].content += '\n\n[EPISODIC MEMORY] The user is continuing a previous conversation. Maintain context from the prior messages.';
      for (const ep of episodicMemory) {
        messages.push({ role: ep.role, content: ep.content });
      }
    }

    messages.push({ role: 'user', content: query });

    // Route through Hive Mind (uses custom provider if configured, else default)
    const response = await routeAIRequest(authHeader!, messages, true);

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
