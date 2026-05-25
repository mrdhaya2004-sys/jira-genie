import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assertSafeExternalUrl, allowedSuffixesForProvider } from "./ssrfGuard.ts";

interface AIProviderConfig {
  provider: string;
  api_key_encrypted: string;
  model_name: string;
  endpoint_url: string | null;
  is_active: boolean;
}

/**
 * Hive Mind AI Router
 * Routes AI requests through custom providers when configured,
 * falling back to the default Lovable AI gateway.
 */
export async function routeAIRequest(
  authHeader: string,
  messages: Array<{ role: string; content: string }>,
  stream: boolean = true
): Promise<Response> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user } } = await supabaseClient.auth.getUser();

  if (user) {
    // Check for custom AI provider
    const { data: configs } = await supabaseClient
      .from('ai_provider_configs')
      .select('provider, api_key_encrypted, model_name, endpoint_url, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1);

    const customConfig = configs && configs.length > 0 ? configs[0] as unknown as AIProviderConfig : null;

    if (customConfig) {
      console.log(`Hive Mind: Routing through custom provider: ${customConfig.provider}`);
      try {
        return await callCustomProvider(customConfig, messages, stream);
      } catch (err) {
        console.error('Custom provider failed, falling back to default:', err);
      }
    }
  }

  // Default: use Lovable AI
  return callDefaultProvider(messages, stream);
}

async function callCustomProvider(
  config: AIProviderConfig,
  messages: Array<{ role: string; content: string }>,
  stream: boolean
): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  let url: string;

  if (config.provider === 'anthropic') {
    url = 'https://api.anthropic.com/v1/messages';
    headers['x-api-key'] = config.api_key_encrypted;
    headers['anthropic-version'] = '2023-06-01';

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
    if (!config.endpoint_url) throw new Error('Endpoint URL required for Azure OpenAI');
    url = config.endpoint_url;
    headers['api-key'] = config.api_key_encrypted;
  } else if (config.provider === 'custom' || config.provider === 'local_llm') {
    if (!config.endpoint_url) throw new Error('Endpoint URL required');
    url = config.endpoint_url;
    headers['Authorization'] = `Bearer ${config.api_key_encrypted}`;
  } else if (config.provider === 'google_gemini') {
    url = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    headers['Authorization'] = `Bearer ${config.api_key_encrypted}`;
  } else {
    // openai
    url = 'https://api.openai.com/v1/chat/completions';
    headers['Authorization'] = `Bearer ${config.api_key_encrypted}`;
  }

  assertSafeExternalUrl(url, { allowedHostSuffixes: allowedSuffixesForProvider(config.provider) });

  return fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model: config.model_name, messages, stream }),
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
