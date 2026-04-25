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

    // Build system prompt — enrich with workspace brain (user stories, DOM/UI hints)
    let contextInfo = '';
    const hasWorkspaceContext = !!(context?.userStories && context.userStories.trim().length > 0);

    if (hasWorkspaceContext) {
      contextInfo += `\n\n## Workspace Brain — Real Application Context\nThe following is REAL data extracted from the user's application (user stories, DOM snapshots, UI text, validation messages, popups). You MUST ground every test case in this data. Do NOT invent UI labels, field names, error messages, or flows that are not present below.\n\n${context.userStories}`;
    }

    if (context?.uiContext) {
      contextInfo += `\n\n## Extracted UI Elements\n${typeof context.uiContext === 'string' ? context.uiContext : JSON.stringify(context.uiContext, null, 2)}`;
    }

    // Categorization requirement — every generation MUST cover all 5 categories
    contextInfo += `\n\n## REQUIRED COVERAGE — STRICT CATEGORIZATION
Every generation MUST include test cases across ALL FIVE categories below. Do NOT skip any category.
Tag each test case using the "type" / category field with EXACTLY one of these values:
  1. "Positive"   — Happy-path / valid scenarios
  2. "Negative"   — Invalid inputs, error scenarios
  3. "Edge"       — Rare or extreme conditions
  4. "Boundary"   — Min/max limits, field-length constraints
  5. "Validation" — Required fields, input format, UI validations

Distribution guidance (unless user requests otherwise): aim for a balanced mix — at least 2 cases per category when generating 10+ cases, at least 1 per category for smaller batches.

${hasWorkspaceContext
  ? 'Ground EVERY test case in the Workspace Brain above. Use the EXACT field labels, button text, placeholder text, validation messages, toast/popup wording, and navigation flow that appear there. If a specific message is not present, write "(verify actual message)" rather than inventing one.'
  : 'No workspace context was provided. Generate realistic, professional QA-level test cases using common industry patterns, but keep wording generic (do not invent specific UI strings).'}`;

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

    contextInfo += `\n\n## REQUIRED OUTPUT FORMAT — STRICT
You MUST output ONLY a single JSON array of test case objects, wrapped in a \`\`\`json code block.
Use these EXACT column keys (case-sensitive) for every object:
Keys: ${JSON.stringify(columnKeys)}
Headers (for reference only): ${JSON.stringify(columnHeaders)}

Example (follow this shape EXACTLY):
\`\`\`json
[
  { ${columnKeys.map((k: string) => `"${k}": "..."`).join(', ')} }
]
\`\`\`

STRICT RULES:
- Output ONLY ONE \`\`\`json ... \`\`\` code block. Nothing else. No preamble, no summary, no trailing text.
- The JSON MUST be valid: double-quoted keys and strings, no trailing commas, no comments, no single quotes.
- EVERY object MUST contain ALL keys listed above. Use empty string "" if a value is unknown.
- All values MUST be strings (never arrays, numbers, or objects).
- For multi-step fields like "steps", use a single string with numbered steps separated by \\n (e.g. "1. Open app\\n2. Enter credentials").
- Do NOT split test cases across multiple code blocks.
- Do NOT wrap the array in another object.`;

    const systemPrompt = `You are an expert QA Engineer specializing in test case generation.

## Your Task
Generate comprehensive, well-structured test cases based on the user's request.

## Important Rules
1. Generate functional, negative, edge-case, and boundary test cases as appropriate
2. Use realistic test data
3. Consider positive, negative, and edge cases
4. Be thorough but concise
5. Respond ONLY with the required JSON code block — no other text
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
