import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Conversation, 
  ChatMessageData, 
  CreateConversationData,
  SendMessageData,
  ConversationParticipant 
} from '@/types/chat';
import { notifyChatMessage, notifyMention } from '@/lib/notificationService';
import { toast } from 'sonner';

// Helper: sort conversations — pinned first, then by last activity DESC
function sortConversations(convs: Conversation[]): Conversation[] {
  return [...convs].sort((a, b) => {
    if (!!a.is_pinned !== !!b.is_pinned) return a.is_pinned ? -1 : 1;
    const timeA = a.last_message?.created_at || a.updated_at;
    const timeB = b.last_message?.created_at || b.updated_at;
    return new Date(timeB).getTime() - new Date(timeA).getTime();
  });
}

export function useChat() {
  const { user, profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [participants, setParticipants] = useState<ConversationParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const selectedConvRef = useRef<string | null>(null);

  // Keep ref in sync
  useEffect(() => {
    selectedConvRef.current = selectedConversation?.id || null;
  }, [selectedConversation]);

  // Fetch all conversations for the current user
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          conversation_participants!inner(
            id,
            user_id,
            is_admin,
            last_read_at,
            is_pinned,
            is_favorite
          )
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Collect all participant user IDs to fetch profiles
      const allParticipantIds = new Set<string>();
      (data || []).forEach(conv => {
        conv.conversation_participants?.forEach((p: { user_id: string }) => {
          allParticipantIds.add(p.user_id);
        });
      });

      // Fetch all participant profiles in one query
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', Array.from(allParticipantIds));

      const profileMap = new Map(allProfiles?.map(p => [p.user_id, p]) || []);

      // Fetch last message for each conversation and resolve display name/avatar + unread count
      const conversationsWithLastMessage = await Promise.all(
        (data || []).map(async (conv) => {
          const { data: lastMessageData } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Calculate unread count based on last_read_at
          const myParticipation = conv.conversation_participants?.find(
            (p: { user_id: string }) => p.user_id === user!.id
          );
          let unreadCount = 0;
          if (myParticipation?.last_read_at) {
            const { count } = await supabase
              .from('chat_messages')
              .select('id', { count: 'exact', head: true })
              .eq('conversation_id', conv.id)
              .eq('is_deleted', false)
              .neq('sender_id', user!.id)
              .gt('created_at', myParticipation.last_read_at);
            unreadCount = count || 0;
          } else {
            // Never read - count all messages from others
            const { count } = await supabase
              .from('chat_messages')
              .select('id', { count: 'exact', head: true })
              .eq('conversation_id', conv.id)
              .eq('is_deleted', false)
              .neq('sender_id', user!.id);
            unreadCount = count || 0;
          }

          // For direct chats, resolve the OTHER participant's name and avatar
          let displayName = conv.name;
          let displayAvatar = conv.avatar_url;

          if (conv.type === 'direct') {
            const otherParticipant = conv.conversation_participants?.find(
              (p: { user_id: string }) => p.user_id !== user.id
            );
            if (otherParticipant) {
              const otherProfile = profileMap.get(otherParticipant.user_id);
              if (otherProfile) {
                displayName = otherProfile.full_name;
                displayAvatar = otherProfile.avatar_url;
              }
            }
          }

          return {
            ...conv,
            name: displayName,
            avatar_url: displayAvatar,
            last_message: lastMessageData || undefined,
            unread_count: unreadCount,
            is_pinned: !!myParticipation?.is_pinned,
            is_favorite: !!myParticipation?.is_favorite,
          } as Conversation;
        })
      );

      // Deduplicate direct conversations with the same user
      const seen = new Map<string, Conversation>();
      const deduped: Conversation[] = [];
      for (const conv of conversationsWithLastMessage) {
        if (conv.type === 'direct') {
          const otherParticipant = (conv as any).conversation_participants?.find(
            (p: { user_id: string }) => p.user_id !== user!.id
          );
          const key = otherParticipant ? `direct-${otherParticipant.user_id}` : conv.id;
          const existing = seen.get(key);
          if (existing) {
            // Keep the one with the most recent activity
            if (conv.updated_at > existing.updated_at) {
              deduped[deduped.indexOf(existing)] = conv;
              seen.set(key, conv);
            }
            continue;
          }
          seen.set(key, conv);
        }
        deduped.push(conv);
      }

      setConversations(sortConversations(deduped));
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch messages for a specific conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    setIsLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch sender profiles
      const senderIds = [...new Set((data || []).map(m => m.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', senderIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Fetch reply-to message previews
      const replyIds = [...new Set((data || [])
        .map(m => (m as any).reply_to_id)
        .filter(Boolean))] as string[];
      const replyMap = new Map<string, { id: string; content: string; sender_id: string; is_deleted: boolean }>();
      if (replyIds.length > 0) {
        const { data: replies } = await supabase
          .from('chat_messages')
          .select('id, content, sender_id, is_deleted')
          .in('id', replyIds);
        (replies || []).forEach(r => replyMap.set(r.id, r));
      }

      const messagesWithSenders = (data || []).map(msg => {
        const r = (msg as any).reply_to_id ? replyMap.get((msg as any).reply_to_id) : null;
        return {
          ...msg,
          sender: profileMap.get(msg.sender_id),
          reply_to: r
            ? { ...r, sender_name: profileMap.get(r.sender_id)?.full_name }
            : null,
        };
      }) as ChatMessageData[];

      setMessages(messagesWithSenders);

      // Update last_read_at
      await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', user?.id);

    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setIsLoadingMessages(false);
    }
  }, [user?.id]);

  // Fetch participants for a conversation
  const fetchParticipants = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('conversation_participants')
        .select('*')
        .eq('conversation_id', conversationId);

      if (error) throw error;

      // Fetch profiles for participants
      const userIds = (data || []).map(p => p.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const participantsWithProfiles = (data || []).map(p => ({
        ...p,
        profile: profileMap.get(p.user_id)
      })) as ConversationParticipant[];

      setParticipants(participantsWithProfiles);
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  }, []);

  // Create a new conversation (checks for existing direct chats first)
  const createConversation = useCallback(async (data: CreateConversationData): Promise<Conversation | null> => {
    if (!user) return null;

    try {
      // For direct chats, check if a conversation already exists with this user
      if (data.type === 'direct' && data.participant_ids.length === 1) {
        const otherUserId = data.participant_ids[0];

        const { data: myConvs } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', user.id);

        if (myConvs && myConvs.length > 0) {
          const myConvIds = myConvs.map(c => c.conversation_id);

          const { data: sharedConvs } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', otherUserId)
            .in('conversation_id', myConvIds);

          if (sharedConvs && sharedConvs.length > 0) {
            const { data: directConvs } = await supabase
              .from('conversations')
              .select('*')
              .in('id', sharedConvs.map(c => c.conversation_id))
              .eq('type', 'direct')
              .limit(1)
              .maybeSingle();

            if (directConvs) {
              toast.info('Opening existing conversation');
              await fetchConversations();
              return directConvs as Conversation;
            }
          }
        }
      }

      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          name: data.name || null,
          type: data.type,
          created_by: user.id
        })
        .select()
        .single();

      if (convError) throw convError;

      const { error: adminError } = await supabase
        .from('conversation_participants')
        .insert({ conversation_id: newConv.id, user_id: user.id, is_admin: true });

      if (adminError) throw adminError;

      if (data.participant_ids.length > 0) {
        const otherParticipants = data.participant_ids.map(userId => ({
          conversation_id: newConv.id,
          user_id: userId,
          is_admin: false
        }));

        const { error: partError } = await supabase
          .from('conversation_participants')
          .insert(otherParticipants);

        if (partError) throw partError;
      }

      toast.success(data.type === 'group' ? 'Group created successfully' : 'Chat created');
      await fetchConversations();
      return newConv as Conversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create conversation');
      return null;
    }
  }, [user, fetchConversations]);

  // Send a message
  const sendMessage = useCallback(async (data: SendMessageData): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert([{
          conversation_id: data.conversation_id,
          sender_id: user.id,
          content: data.content,
          message_type: data.message_type || 'text',
          metadata: (data.metadata || {}) as Record<string, string | number | boolean | null>,
          reply_to_id: data.reply_to_id || null,
        }]);

      if (error) throw error;

      const now = new Date().toISOString();

      // Update conversation updated_at and mark as read for sender
      await Promise.all([
        supabase
          .from('conversations')
          .update({ updated_at: now })
          .eq('id', data.conversation_id),
        supabase
          .from('conversation_participants')
          .update({ last_read_at: now })
          .eq('conversation_id', data.conversation_id)
          .eq('user_id', user.id),
      ]);

      // Optimistically move conversation to top with updated last message
      setConversations(prev => {
        const updated = prev.map(c =>
          c.id === data.conversation_id
            ? {
                ...c,
                unread_count: 0,
                updated_at: now,
                last_message: {
                  id: 'optimistic-' + Date.now(),
                  conversation_id: data.conversation_id,
                  sender_id: user.id,
                  content: data.content,
                  message_type: (data.message_type || 'text') as 'text' | 'image' | 'file' | 'system',
                  metadata: {},
                  is_deleted: false,
                  created_at: now,
                  updated_at: now,
                } as ChatMessageData,
              }
            : c
        );
        return sortConversations(updated);
      });

      // Notify other participants
      const senderName = profile?.full_name || 'Someone';
      const otherParticipants = participants.filter(p => p.user_id !== user.id);

      const mentionRegex = /@(\w+)/g;
      const mentionedUsernames = [...data.content.matchAll(mentionRegex)].map(m => m[1]);
      const isEveryoneMention = mentionedUsernames.includes('everyone');

      for (const p of otherParticipants) {
        const isMentioned = mentionedUsernames.some(
          u => p.profile?.full_name?.toLowerCase().includes(u.toLowerCase())
        );

        if (isMentioned || isEveryoneMention) {
          notifyMention(p.user_id, senderName, data.content, 'chat', data.conversation_id);
        } else {
          notifyChatMessage(p.user_id, senderName, data.content, data.conversation_id);
        }
      }

      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      return false;
    }
  }, [user, profile, participants]);

  // Delete a message (soft delete)
  const deleteMessage = useCallback(async (messageId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ is_deleted: true, content: 'This message was deleted' })
        .eq('id', messageId);

      if (error) throw error;

      setMessages(prev =>
        prev.map(m => m.id === messageId
          ? { ...m, is_deleted: true, content: 'This message was deleted' }
          : m
        )
      );

      toast.success('Message deleted');
      return true;
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
      return false;
    }
  }, []);

  // Edit a message
  const editMessage = useCallback(async (messageId: string, newContent: string): Promise<boolean> => {
    if (!newContent.trim()) return false;
    try {
      const editedAt = new Date().toISOString();
      const { error } = await supabase
        .from('chat_messages')
        .update({ content: newContent, edited_at: editedAt })
        .eq('id', messageId);

      if (error) throw error;

      setMessages(prev =>
        prev.map(m => m.id === messageId ? { ...m, content: newContent, edited_at: editedAt } : m)
      );
      return true;
    } catch (error) {
      console.error('Error editing message:', error);
      toast.error('Failed to edit message');
      return false;
    }
  }, []);

  // Toggle pin / favorite for current user on a conversation
  const togglePinConversation = useCallback(async (conversationId: string): Promise<void> => {
    if (!user) return;
    const target = !conversations.find(c => c.id === conversationId)?.is_pinned;
    setConversations(prev =>
      sortConversations(prev.map(c => c.id === conversationId ? { ...c, is_pinned: target } : c))
    );
    const { error } = await supabase
      .from('conversation_participants')
      .update({ is_pinned: target })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id);
    if (error) {
      toast.error('Failed to update pin');
      setConversations(prev =>
        sortConversations(prev.map(c => c.id === conversationId ? { ...c, is_pinned: !target } : c))
      );
    } else {
      toast.success(target ? 'Pinned' : 'Unpinned');
    }
  }, [user, conversations]);

  const toggleFavoriteConversation = useCallback(async (conversationId: string): Promise<void> => {
    if (!user) return;
    const target = !conversations.find(c => c.id === conversationId)?.is_favorite;
    setConversations(prev =>
      prev.map(c => c.id === conversationId ? { ...c, is_favorite: target } : c)
    );
    const { error } = await supabase
      .from('conversation_participants')
      .update({ is_favorite: target })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id);
    if (error) {
      toast.error('Failed to update favorite');
      setConversations(prev =>
        prev.map(c => c.id === conversationId ? { ...c, is_favorite: !target } : c)
      );
    }
  }, [user, conversations]);

  // Add participant to group
  const addParticipant = useCallback(async (conversationId: string, userId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: conversationId,
          user_id: userId,
          is_admin: false
        });

      if (error) throw error;

      await fetchParticipants(conversationId);
      toast.success('User added to group');
      return true;
    } catch (error) {
      console.error('Error adding participant:', error);
      toast.error('Failed to add user');
      return false;
    }
  }, [fetchParticipants]);

  // Remove participant from group
  const removeParticipant = useCallback(async (conversationId: string, userId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('conversation_participants')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);

      if (error) throw error;

      await fetchParticipants(conversationId);
      toast.success('User removed from group');
      return true;
    } catch (error) {
      console.error('Error removing participant:', error);
      toast.error('Failed to remove user');
      return false;
    }
  }, [fetchParticipants]);

  // Delete entire conversation
  const deleteConversation = useCallback(async (conversationId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;

      setConversations(prev => prev.filter(c => c.id !== conversationId));
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
        setMessages([]);
      }
      toast.success('Conversation deleted');
      return true;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Failed to delete conversation');
      return false;
    }
  }, [selectedConversation?.id]);

  // Leave a group conversation
  const leaveConversation = useCallback(async (conversationId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('conversation_participants')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);

      if (error) throw error;

      setConversations(prev => prev.filter(c => c.id !== conversationId));
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
        setMessages([]);
      }
      toast.success('Left the group');
      return true;
    } catch (error) {
      console.error('Error leaving conversation:', error);
      toast.error('Failed to leave group');
      return false;
    }
  }, [user, selectedConversation?.id]);

  // Select a conversation and mark as read
  const selectConversation = useCallback(async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    
    // Mark conversation as read by updating last_read_at
    if (user) {
      await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversation.id)
        .eq('user_id', user.id);
      
      // Clear unread count locally
      setConversations(prev => prev.map(c => 
        c.id === conversation.id ? { ...c, unread_count: 0 } : c
      ));
    }
    
    await fetchMessages(conversation.id);
    await fetchParticipants(conversation.id);
  }, [fetchMessages, fetchParticipants, user]);

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user, fetchConversations]);

  // Global realtime listener - refreshes conversation list and active messages
  useEffect(() => {
    if (!user) return;

    const globalChannel = supabase
      .channel('global-chat-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        async (payload) => {
          const newMessage = payload.new as ChatMessageData;
          
          // Optimistically update conversation list order and last message
          setConversations(prev => {
            const updated = prev.map(c => {
              if (c.id === newMessage.conversation_id) {
                const isActiveConv = selectedConvRef.current === c.id;
                return {
                  ...c,
                  last_message: newMessage,
                  updated_at: newMessage.created_at,
                  // Only increment unread if not viewing this conversation and not own message
                  unread_count: (!isActiveConv && newMessage.sender_id !== user.id)
                    ? (c.unread_count || 0) + 1
                    : c.unread_count || 0,
                };
              }
              return c;
            });
            return sortConversations(updated);
          });

          // If this message is for the currently selected conversation, add it to messages
          if (selectedConvRef.current === newMessage.conversation_id) {
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('user_id, full_name, avatar_url')
              .eq('user_id', newMessage.sender_id)
              .maybeSingle();

            setMessages(prevMsgs => {
              if (prevMsgs.some(m => m.id === newMessage.id)) return prevMsgs;
              return [{ ...newMessage, sender: senderProfile || undefined }, ...prevMsgs];
            });

            // Mark as read since user is viewing
            if (newMessage.sender_id !== user.id) {
              await supabase
                .from('conversation_participants')
                .update({ last_read_at: new Date().toISOString() })
                .eq('conversation_id', newMessage.conversation_id)
                .eq('user_id', user.id);

              setConversations(prev => prev.map(c =>
                c.id === newMessage.conversation_id ? { ...c, unread_count: 0 } : c
              ));
            }
          }

          // Background refresh for accurate data (debounced effect)
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_participants',
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(globalChannel);
    };
  }, [user, fetchConversations]);

  // Realtime subscriptions for active conversation messages
  useEffect(() => {
    if (!user || !selectedConversation) return;

    const channel = supabase
      .channel(`chat-${selectedConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${selectedConversation.id}`
        },
        (payload) => {
          const updatedMessage = payload.new as ChatMessageData;
          setMessages(prev => 
            prev.map(m => m.id === updatedMessage.id ? { ...m, ...updatedMessage } : m)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedConversation]);

  return {
    conversations,
    selectedConversation,
    messages,
    participants,
    isLoading,
    isLoadingMessages,
    fetchConversations,
    selectConversation,
    createConversation,
    sendMessage,
    deleteMessage,
    editMessage,
    togglePinConversation,
    toggleFavoriteConversation,
    addParticipant,
    removeParticipant,
    deleteConversation,
    leaveConversation,
    setSelectedConversation
  };
}
