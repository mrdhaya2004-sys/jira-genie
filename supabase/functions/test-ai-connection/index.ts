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

    const startedAt = Date.now();
    let response: Response;
    try {
      response = await fetch(url, { method: 'POST', headers, body });
    } catch (e) {
      return new Response(JSON.stringify({
        success: false,
        error: `Endpoint Unreachable — could not reach ${(() => { try { return new URL(url).host; } catch { return url; } })()}. Check the endpoint URL and your network.`,
        responseMs: Date.now() - startedAt,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const responseMs = Date.now() - startedAt;
    const responseText = await response.text();

    if (!response.ok) {
      const snippet = responseText.slice(0, 200);
      let friendly: string;
      switch (response.status) {
        case 401: friendly = 'Invalid API Key — provider rejected the credentials (401 Unauthorized).'; break;
        case 403: friendly = 'Missing Permissions — API key cannot access this model or endpoint (403 Forbidden).'; break;
        case 404: friendly = 'Model or Endpoint Not Found — verify the model name and endpoint URL (404).'; break;
        case 429: friendly = 'Rate Limit Exceeded — too many requests or quota exhausted (429).'; break;
        case 500: case 502: case 503: case 504:
          friendly = `Provider Service Error — upstream returned ${response.status}. Try again shortly.`; break;
        default: friendly = `Authentication Failed — provider returned ${response.status}: ${snippet}`;
      }
      return new Response(JSON.stringify({
        success: false, error: friendly, status: response.status, responseMs,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const responseCT = (response.headers.get('content-type') || '').toLowerCase();
    if (!responseCT.includes('application/json') && !responseCT.includes('text/plain')) {
      return new Response(JSON.stringify({
        success: false,
        error:
          `Endpoint returned ${responseCT || 'non-JSON content'} instead of a chat-completions response. ` +
          `The endpoint URL is likely wrong — it must point to "/v1/chat/completions" or equivalent.`,
        responseMs,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Connection verified successfully',
      responseMs,
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
