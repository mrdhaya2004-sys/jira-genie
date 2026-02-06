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

    // Get user's Teams connection
    const { data: connection, error: connError } = await supabase
      .from('teams_connections')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (connError || !connection || !connection.is_connected) {
      return new Response(JSON.stringify({ error: 'Teams not connected' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if access token is expired and refresh if needed
    let accessToken = connection.access_token;
    const tokenExpiresAt = new Date(connection.token_expires_at).getTime();
    
    if (Date.now() > tokenExpiresAt - 5 * 60 * 1000) {
      // Token expired or expiring soon, refresh it
      const clientId = Deno.env.get('MICROSOFT_CLIENT_ID');
      const clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET');
      const tenantId = Deno.env.get('MICROSOFT_TENANT_ID');

      if (!clientId || !clientSecret || !tenantId) {
        return new Response(JSON.stringify({ error: 'Azure credentials not configured' }), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const refreshResponse = await fetch(
        `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: connection.refresh_token,
            grant_type: 'refresh_token',
            scope: 'Chat.ReadWrite User.Read offline_access',
          }),
        }
      );

      const refreshData = await refreshResponse.json();
      
      if (!refreshResponse.ok) {
        console.error('Token refresh failed:', refreshData);
        // Mark connection as disconnected
        await supabase
          .from('teams_connections')
          .update({ is_connected: false })
          .eq('user_id', user.id);

        return new Response(JSON.stringify({ error: 'Token refresh failed. Please reconnect.' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      accessToken = refreshData.access_token;
      const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000).toISOString();
      
      await supabase
        .from('teams_connections')
        .update({
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token || connection.refresh_token,
          token_expires_at: newExpiresAt,
        })
        .eq('user_id', user.id);
    }

    if (action === 'sync_chats') {
      // Fetch chats from Microsoft Graph API
      const chatsResponse = await fetch(
        'https://graph.microsoft.com/v1.0/me/chats?$expand=members&$top=50',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!chatsResponse.ok) {
        const errorData = await chatsResponse.json();
        console.error('Failed to fetch Teams chats:', errorData);
        return new Response(JSON.stringify({ error: 'Failed to fetch Teams chats' }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const chatsData = await chatsResponse.json();
      const chats = chatsData.value || [];
      let syncedCount = 0;

      for (const chat of chats) {
        // Only sync 1:1 and group chats (skip meeting chats)
        if (chat.chatType !== 'oneOnOne' && chat.chatType !== 'group') continue;

        // Check if conversation already exists
        const { data: existingConv } = await supabase
          .from('conversations')
          .select('id')
          .eq('teams_chat_id', chat.id)
          .maybeSingle();

        if (!existingConv) {
          // Create conversation
          const convName = chat.chatType === 'group'
            ? chat.topic || 'Teams Group'
            : null;

          const { data: newConv, error: convError } = await supabase
            .from('conversations')
            .insert({
              name: convName,
              type: chat.chatType === 'oneOnOne' ? 'direct' : 'group',
              created_by: user.id,
              teams_chat_id: chat.id,
              is_teams_synced: true,
            })
            .select()
            .single();

          if (convError) {
            console.error('Error creating synced conversation:', convError);
            continue;
          }

          // Add current user as participant
          await supabase
            .from('conversation_participants')
            .insert({
              conversation_id: newConv.id,
              user_id: user.id,
              is_admin: true,
            });

          syncedCount++;
        }

        // Sync latest messages for this chat
        const messagesResponse = await fetch(
          `https://graph.microsoft.com/v1.0/me/chats/${chat.id}/messages?$top=20&$orderby=createdDateTime desc`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (messagesResponse.ok) {
          const messagesData = await messagesResponse.json();
          const messages = messagesData.value || [];

          for (const msg of messages) {
            if (!msg.body?.content || msg.messageType !== 'message') continue;

            // Check if message already synced (use teams message id in metadata)
            const { data: existingMsg } = await supabase
              .from('chat_messages')
              .select('id')
              .eq('metadata->>teams_message_id', msg.id)
              .maybeSingle();

            if (!existingMsg) {
              const { data: conv } = await supabase
                .from('conversations')
                .select('id')
                .eq('teams_chat_id', chat.id)
                .single();

              if (conv) {
                await supabase
                  .from('chat_messages')
                  .insert({
                    conversation_id: conv.id,
                    sender_id: user.id,
                    content: msg.body.content,
                    message_type: 'text',
                    metadata: {
                      teams_message_id: msg.id,
                      teams_sender_name: msg.from?.user?.displayName || 'Teams User',
                      teams_sender_email: msg.from?.user?.email || null,
                      is_teams_message: true,
                    },
                    created_at: msg.createdDateTime,
                  });
              }
            }
          }
        }
      }

      // Update last synced
      await supabase
        .from('teams_connections')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('user_id', user.id);

      console.log(`Synced ${syncedCount} new conversations for user ${user.id}`);
      return new Response(JSON.stringify({ success: true, synced_count: syncedCount }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Teams sync error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
