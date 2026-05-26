import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { routeAIRequest, resolveCustomConfig, buildAIErrorResponse } from "../_shared/hiveMindRouter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Agent definitions with their system prompts
const AGENTS: Record<string, { name: string; systemPrompt: string }> = {
  TestCaseAgent: {
    name: 'TestCaseAgent',
    systemPrompt: `You are TestCaseAgent, a specialized AI agent for generating comprehensive test cases. Generate test cases with:
- Test case ID, title, preconditions
- Detailed test steps with expected results
- Test data suggestions
- Priority and category
Format output as structured, actionable test cases.`,
  },
  ScenarioAgent: {
    name: 'ScenarioAgent',
    systemPrompt: `You are ScenarioAgent, a specialized AI agent for creating test scenarios in various frameworks (Cucumber/Gherkin, TestNG, JUnit, Playwright). Generate well-structured scenarios with proper syntax and best practices for the selected framework.`,
  },
  AutomationAgent: {
    name: 'AutomationAgent',
    systemPrompt: `You are AutomationAgent, a specialized AI agent for generating automation test code. Support Python/pytest/selenium, Java/TestNG/Selenium, Playwright TypeScript. Provide clean, well-commented, production-ready automation code.`,
  },
  DOMAgent: {
    name: 'DOMAgent',
    systemPrompt: `You are DOMAgent, a specialized AI agent for generating robust XPath and locator expressions. Generate Android XPaths, iOS accessibility identifiers, and alternative locator strategies. Provide multiple strategies ranked by reliability.`,
  },
  TicketAgent: {
    name: 'TicketAgent',
    systemPrompt: `You are TicketAgent, a specialized AI agent for creating well-structured Jira tickets. Generate tickets with clear summaries, detailed descriptions, acceptance criteria, steps to reproduce, priority suggestions, and appropriate labels/components.`,
  },
};

// Map feature capabilities to agents
const CAPABILITY_TO_AGENT: Record<string, string> = {
  test_cases: 'TestCaseAgent',
  code_generation: 'AutomationAgent',
  xpath_generation: 'DOMAgent',
  jira_ticket: 'TicketAgent',
  scenario_generation: 'ScenarioAgent',
  workflow_breakdown: 'TestCaseAgent',
  explain_app: 'TestCaseAgent',
  qa_chat: 'TestCaseAgent',
};

// Validate AI response structure
function validateResponse(content: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (!content || content.trim().length === 0) issues.push('Empty response received');
  if (content.length < 20) issues.push('Response too short - may be incomplete');
  return { valid: issues.length === 0, issues };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
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

    const { messages, capability, agent: agentOverride, stream = true, additionalContext, episodicMemory } = await req.json();

    // Determine which agent to use
    const agentName = agentOverride || CAPABILITY_TO_AGENT[capability] || 'TestCaseAgent';
    const agent = AGENTS[agentName];
    if (!agent) {
      return new Response(
        JSON.stringify({ error: `Unknown agent: ${agentName}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build system prompt from Hive Mind + Agent
    let systemPrompt = `[HIVE MIND ORCHESTRATOR] You are operating under the Test Zone Hive Mind architecture.
Agent: ${agent.name}

${agent.systemPrompt}`;

    if (additionalContext) {
      systemPrompt += `\n\nAdditional Context:\n${additionalContext}`;
    }

    // If episodic memory is provided, inject previous conversation turns
    // so the AI continues the conversation seamlessly
    const previousTurns: Array<{ role: string; content: string }> = [];
    if (episodicMemory && Array.isArray(episodicMemory) && episodicMemory.length > 0) {
      systemPrompt += `\n\n[EPISODIC MEMORY] The user is resuming a previous conversation. The following messages are from the prior session. Continue naturally as if the conversation never stopped.`;
      for (const ep of episodicMemory) {
        previousTurns.push({ role: ep.role, content: ep.content });
      }
    }

    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...previousTurns,
      ...messages,
    ];

    // Resolve which AI provider will actually be used (for diagnostics in the response)
    const customConfig = await resolveCustomConfig(authHeader);

    // Route through centralized Test Zone AI Gateway
    const aiResponse = await routeAIRequest(authHeader, fullMessages, stream);

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      return buildAIErrorResponse(aiResponse.status, errorText, corsHeaders);
    }

    if (stream) {
      return new Response(aiResponse.body, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
      });
    }

    // Non-streaming: validate response
    const result = await aiResponse.json();
    const content = result.choices?.[0]?.message?.content || '';
    const validation = validateResponse(content);

    if (!validation.valid) {
      console.warn('Hive Mind validation issues:', validation.issues);
    }

    return new Response(JSON.stringify({
      ...result,
      hiveMind: {
        agent: agentName,
        provider: customConfig ? customConfig.provider : 'default',
        validation,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Hive Mind error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
