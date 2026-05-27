import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assertSafeExternalUrl, allowedSuffixesForProvider } from "../_shared/ssrfGuard.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

    const { provider, apiKey, model, endpointUrl } = await req.json();

    if (!provider || !apiKey || !model) {
      return new Response(
        JSON.stringify({ error: 'Provider, API key, and model are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const testMessages = [
      { role: 'user', content: 'Respond with exactly: "Connection successful"' },
    ];

    let url: string;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    let body: string;

    switch (provider) {
      case 'openai':
        url = 'https://api.openai.com/v1/chat/completions';
        headers['Authorization'] = `Bearer ${apiKey}`;
        body = JSON.stringify({ model, messages: testMessages, max_tokens: 20 });
        break;

      case 'azure_openai':
        if (!endpointUrl) throw new Error('Endpoint URL required for Azure OpenAI');
        url = endpointUrl;
        headers['api-key'] = apiKey;
        body = JSON.stringify({ messages: testMessages, max_tokens: 20 });
        break;

      case 'anthropic':
        url = 'https://api.anthropic.com/v1/messages';
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
        body = JSON.stringify({ model, max_tokens: 20, messages: testMessages });
        break;

      case 'google_gemini':
        url = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
        headers['Authorization'] = `Bearer ${apiKey}`;
        body = JSON.stringify({ model, messages: testMessages, max_tokens: 20 });
        break;

      case 'custom':
      case 'local_llm': {
        if (!endpointUrl) throw new Error('Endpoint URL required');
        let parsed: URL;
        try { parsed = new URL(endpointUrl); } catch {
          throw new Error('Invalid endpoint URL. Provide a full https URL ending in /v1/chat/completions.');
        }
        const p = parsed.pathname.toLowerCase();
        if (!(p.includes('/chat/completions') || p.includes('/completions'))) {
          throw new Error(
            `Endpoint URL must point to a chat-completions API (e.g. https://integrate.api.nvidia.com/v1/chat/completions). ` +
            `Got "${endpointUrl}", which looks like a model page, not an API endpoint.`,
          );
        }
        url = endpointUrl;
        headers['Authorization'] = `Bearer ${apiKey}`;
        body = JSON.stringify({ model, messages: testMessages, max_tokens: 20 });
        break;
      }


      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    // SSRF guard: validate target URL for user-supplied endpoints
    try {
      assertSafeExternalUrl(url, {
        allowedHostSuffixes: allowedSuffixesForProvider(provider),
      });
    } catch (e) {
      return new Response(JSON.stringify({
        success: false,
        error: e instanceof Error ? e.message : 'Invalid endpoint URL',
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const response = await fetch(url, { method: 'POST', headers, body });
    const responseText = await response.text();

    if (!response.ok) {
      return new Response(JSON.stringify({
        success: false,
        error: `Provider returned ${response.status}: ${responseText.slice(0, 200)}`,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Connection verified successfully',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Test connection error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Connection test failed',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
