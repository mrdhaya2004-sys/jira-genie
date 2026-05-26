import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assertSafeExternalUrl, allowedSuffixesForProvider } from "./ssrfGuard.ts";

interface AIProviderConfig {
  provider: string;
  api_key_encrypted: string;
  model_name: string;
  endpoint_url: string | null;
  is_active: boolean;
}

export interface RouteOptions {
  /** Default model to use when no custom config is configured and Lovable AI fallback is used. */
  defaultModel?: string;
  /** Extra request body fields (e.g. response_format, tools). Applied to non-Anthropic providers. */
  extraBody?: Record<string, unknown>;
}

/**
 * Resolve the active AI provider config for the current request.
 * 1. Per-user config (if logged in).
 * 2. Shared admin config (most recently updated active config) as fallback.
 *    This lets every user on the published site use the workspace owner's custom AI.
 */
export async function resolveCustomConfig(authHeader: string | null): Promise<AIProviderConfig | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (authHeader) {
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) {
      const { data: configs } = await supabaseClient
        .from('ai_provider_configs')
        .select('provider, api_key_encrypted, model_name, endpoint_url, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1);
      if (configs && configs.length > 0) {
        return configs[0] as unknown as AIProviderConfig;
      }
    }
  }

  if (serviceKey) {
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: sharedConfigs } = await adminClient
      .from('ai_provider_configs')
      .select('provider, api_key_encrypted, model_name, endpoint_url, is_active')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1);
    if (sharedConfigs && sharedConfigs.length > 0) {
      console.log('AI Router: Using shared admin AI config');
      return sharedConfigs[0] as unknown as AIProviderConfig;
    }
  }

  return null;
}

/**
 * Centralized Test Zone AI Gateway.
 *
 * Routing rules:
 * - If any custom AI provider is configured (per-user OR shared admin), route exclusively through it.
 *   We never silently fall back to Lovable AI in that case — credit-exhausted Lovable would hide
 *   the real provider error and the user explicitly wants their own infrastructure.
 * - If no custom config exists anywhere, fall back to the Lovable AI gateway so the platform still
 *   works out of the box. When Lovable credits are exhausted, return a structured 402 so the
 *   frontend can show a clear "configure custom AI" message.
 */
export async function routeAIRequest(
  authHeader: string,
  messages: Array<{ role: string; content: string | unknown }>,
  stream: boolean = true,
  options: RouteOptions = {},
): Promise<Response> {
  const customConfig = await resolveCustomConfig(authHeader);

  if (customConfig) {
    console.log(`AI Router: Routing through custom provider: ${customConfig.provider} (${customConfig.model_name})`);
    return callCustomProvider(customConfig, messages, stream, options.extraBody);
  }

  console.log('AI Router: No custom AI configured — using Lovable AI gateway');
  return callDefaultProvider(messages, stream, options);
}

async function callCustomProvider(
  config: AIProviderConfig,
  messages: Array<{ role: string; content: string | unknown }>,
  stream: boolean,
  extraBody?: Record<string, unknown>,
): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  let url: string;

  if (config.provider === 'anthropic') {
    url = 'https://api.anthropic.com/v1/messages';
    headers['x-api-key'] = config.api_key_encrypted;
    headers['anthropic-version'] = '2023-06-01';

    const systemMsg = messages.find((m) => m.role === 'system');
    const nonSystemMsgs = messages.filter((m) => m.role !== 'system');

    const body: Record<string, unknown> = {
      model: config.model_name,
      max_tokens: 4096,
      messages: nonSystemMsgs,
      stream,
    };
    if (systemMsg && typeof systemMsg.content === 'string') body.system = systemMsg.content;

    assertSafeExternalUrl(url, { allowedHostSuffixes: allowedSuffixesForProvider(config.provider) });
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
    // openai (default OpenAI-compatible)
    url = 'https://api.openai.com/v1/chat/completions';
    headers['Authorization'] = `Bearer ${config.api_key_encrypted}`;
  }

  assertSafeExternalUrl(url, { allowedHostSuffixes: allowedSuffixesForProvider(config.provider) });

  const body: Record<string, unknown> = {
    model: config.model_name,
    messages,
    stream,
    ...(extraBody || {}),
  };

  return fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

async function callDefaultProvider(
  messages: Array<{ role: string; content: string | unknown }>,
  stream: boolean,
  options: RouteOptions,
): Promise<Response> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

  const body: Record<string, unknown> = {
    model: options.defaultModel || 'google/gemini-3-flash-preview',
    messages,
    stream,
    ...(options.extraBody || {}),
  };

  return fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

/**
 * Standardized error response for upstream AI failures.
 * Maps provider errors to clear, actionable messages for the frontend.
 */
export function buildAIErrorResponse(
  status: number,
  upstreamText: string,
  corsHeaders: Record<string, string>,
): Response {
  if (status === 429) {
    return new Response(
      JSON.stringify({ error: 'AI provider rate limit exceeded. Please try again in a moment.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
  if (status === 402) {
    return new Response(
      JSON.stringify({
        error:
          'AI credits exhausted on the default provider. Please configure a custom AI provider in AI Configuration to continue.',
      }),
      { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
  if (status === 401 || status === 403) {
    return new Response(
      JSON.stringify({
        error: 'AI provider rejected the configured API key. Please verify your custom AI configuration.',
      }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
  console.error(`AI upstream error (${status}):`, upstreamText.slice(0, 500));
  return new Response(
    JSON.stringify({ error: `AI provider returned an error (${status}). Please try again.` }),
    { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}
