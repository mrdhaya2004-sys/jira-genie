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
    const { conversation_id, content } = body;

    if (!conversation_id || !content) {
      return new Response(JSON.stringify({ error: 'Missing conversation_id or content' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get conversation's Teams chat ID
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('teams_chat_id, is_teams_synced')
      .eq('id', conversation_id)
      .single();

    if (convError || !conversation?.teams_chat_id) {
      return new Response(JSON.stringify({ error: 'Not a Teams conversation' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's Teams connection
    const { data: connection, error: connError } = await supabase
      .from('teams_connections')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (connError || !connection?.is_connected || !connection.access_token) {
      return new Response(JSON.stringify({ error: 'Teams not connected' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send message via Microsoft Graph API
    const graphResponse = await fetch(
      `https://graph.microsoft.com/v1.0/me/chats/${conversation.teams_chat_id}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${connection.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          body: {
            contentType: 'text',
            content,
          },
        }),
      }
    );

    if (!graphResponse.ok) {
      const errorData = await graphResponse.json();
      console.error('Failed to send Teams message:', errorData);
      return new Response(JSON.stringify({ error: 'Failed to send message to Teams' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const messageData = await graphResponse.json();
    console.log(`Message sent to Teams chat ${conversation.teams_chat_id}`);

    return new Response(JSON.stringify({ 
      success: true, 
      teams_message_id: messageData.id 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Teams send message error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
