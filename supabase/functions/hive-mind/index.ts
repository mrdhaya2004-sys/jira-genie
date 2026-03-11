import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// Provider API configurations
const PROVIDER_CONFIGS: Record<string, { url: string; headerKey: string }> = {
  openai: { url: 'https://api.openai.com/v1/chat/completions', headerKey: 'Authorization' },
  azure_openai: { url: '', headerKey: 'api-key' }, // URL comes from endpoint_url
  anthropic: { url: 'https://api.anthropic.com/v1/messages', headerKey: 'x-api-key' },
  google_gemini: { url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', headerKey: 'Authorization' },
  custom: { url: '', headerKey: 'Authorization' }, // URL comes from endpoint_url
  local_llm: { url: '', headerKey: 'Authorization' }, // URL comes from endpoint_url
};

interface AIProviderConfig {
  provider: string;
  api_key_encrypted: string;
  model_name: string;
  endpoint_url: string | null;
  is_active: boolean;
}

async function callCustomProvider(
  config: AIProviderConfig,
  messages: Array<{ role: string; content: string }>,
  stream: boolean
): Promise<Response> {
  const providerConfig = PROVIDER_CONFIGS[config.provider];
  
  let url: string;
  if (config.provider === 'azure_openai' || config.provider === 'custom' || config.provider === 'local_llm') {
    if (!config.endpoint_url) throw new Error('Endpoint URL required for this provider');
    url = config.endpoint_url;
  } else {
    url = providerConfig.url;
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (config.provider === 'anthropic') {
    headers['x-api-key'] = config.api_key_encrypted;
    headers['anthropic-version'] = '2023-06-01';

    // Anthropic uses a different format
    const systemMsg = messages.find(m => m.role === 'system');
    const nonSystemMsgs = messages.filter(m => m.role !== 'system');

    const body: Record<string, unknown> = {
      model: config.model_name,
      max_tokens: 4096,
      messages: nonSystemMsgs,
      stream,
    };
    if (systemMsg) body.system = systemMsg.content;

    return fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  }

  if (config.provider === 'azure_openai') {
    headers['api-key'] = config.api_key_encrypted;
  } else {
    headers['Authorization'] = `Bearer ${config.api_key_encrypted}`;
  }

  return fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: config.model_name,
      messages,
      stream,
    }),
  });
}

async function callDefaultProvider(
  messages: Array<{ role: string; content: string }>,
  stream: boolean
): Promise<Response> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

  return fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages,
      stream,
    }),
  });
}

// Validate AI response structure
function validateResponse(content: string, agentName: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!content || content.trim().length === 0) {
    issues.push('Empty response received');
  }

  if (content.length < 20) {
    issues.push('Response too short - may be incomplete');
  }

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

    // Check for custom AI provider config
    const { data: providerConfigs } = await supabaseClient
      .from('ai_provider_configs')
      .select('provider, api_key_encrypted, model_name, endpoint_url, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1);

    const customConfig = providerConfigs && providerConfigs.length > 0 ? providerConfigs[0] as AIProviderConfig : null;

    let aiResponse: Response;

    if (customConfig) {
      // Route through custom provider
      console.log(`Hive Mind: Routing ${agentName} through custom provider: ${customConfig.provider}`);
      try {
        aiResponse = await callCustomProvider(customConfig, fullMessages, stream);
      } catch (providerError) {
        // Fallback to default if custom provider fails
        console.error('Custom provider failed, falling back to default:', providerError);
        aiResponse = await callDefaultProvider(fullMessages, stream);
      }
    } else {
      // Use default Lovable AI
      console.log(`Hive Mind: Routing ${agentName} through default AI`);
      aiResponse = await callDefaultProvider(fullMessages, stream);
    }

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await aiResponse.text();
      console.error(`AI provider error (${aiResponse.status}):`, errorText);
      throw new Error(`AI request failed with status ${aiResponse.status}`);
    }

    if (stream) {
      return new Response(aiResponse.body, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
      });
    }

    // Non-streaming: validate response
    const result = await aiResponse.json();
    const content = result.choices?.[0]?.message?.content || '';
    const validation = validateResponse(content, agentName);

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
