import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action } = body;

    const clientId = Deno.env.get('MICROSOFT_CLIENT_ID');
    const clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET');
    const tenantId = Deno.env.get('MICROSOFT_TENANT_ID');

    if (action === 'get_auth_url') {
      // Check if Azure credentials are configured
      if (!clientId || !clientSecret || !tenantId) {
        console.log('Microsoft Azure credentials not configured yet');
        return new Response(JSON.stringify({ 
          auth_url: null,
          message: 'Microsoft Azure credentials are not configured. Please add MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, and MICROSOFT_TENANT_ID secrets.'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const redirectUri = `${supabaseUrl}/functions/v1/teams-auth?action=callback`;
      const scopes = 'Chat.ReadWrite User.Read offline_access';
      
      const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?` +
        `client_id=${clientId}` +
        `&response_type=code` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent(scopes)}` +
        `&state=${user.id}` +
        `&response_mode=query`;

      return new Response(JSON.stringify({ auth_url: authUrl }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'callback') {
      // Handle OAuth callback - exchange code for tokens
      const { code, state: userId } = body;

      if (!code || !userId || !clientId || !clientSecret || !tenantId) {
        return new Response(JSON.stringify({ error: 'Missing parameters' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const redirectUri = `${supabaseUrl}/functions/v1/teams-auth?action=callback`;

      // Exchange authorization code for tokens
      const tokenResponse = await fetch(
        `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
            scope: 'Chat.ReadWrite User.Read offline_access',
          }),
        }
      );

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        console.error('Token exchange failed:', tokenData);
        return new Response(JSON.stringify({ error: 'Token exchange failed' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get user profile from Microsoft Graph
      const profileResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      const profile = await profileResponse.json();

      // Upsert teams connection
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

      const { error: upsertError } = await supabase
        .from('teams_connections')
        .upsert({
          user_id: userId,
          microsoft_user_id: profile.id,
          microsoft_display_name: profile.displayName,
          microsoft_email: profile.mail || profile.userPrincipalName,
          tenant_id: tenantId,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: expiresAt,
          is_connected: true,
        }, { onConflict: 'user_id' });

      if (upsertError) {
        console.error('Error saving teams connection:', upsertError);
        return new Response(JSON.stringify({ error: 'Failed to save connection' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`Teams connection established for user ${userId}`);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Teams auth error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
