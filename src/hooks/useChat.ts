import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Conversation, 
  ChatMessageData, 
  CreateConversationData,
  SendMessageData,
  ConversationParticipant 
} from '@/types/chat';
import { toast } from 'sonner';

export function useChat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [participants, setParticipants] = useState<ConversationParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

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
            last_read_at
          )
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Fetch last message for each conversation
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

          return {
            ...conv,
            last_message: lastMessageData || undefined
          } as Conversation;
        })
      );

      setConversations(conversationsWithLastMessage);
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
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch sender profiles
      const senderIds = [...new Set((data || []).map(m => m.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url')
        .in('user_id', senderIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const messagesWithSenders = (data || []).map(msg => ({
        ...msg,
        sender: profileMap.get(msg.sender_id)
      })) as ChatMessageData[];

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
        .select('user_id, full_name, email, avatar_url')
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

  // Create a new conversation
  const createConversation = useCallback(async (data: CreateConversationData): Promise<Conversation | null> => {
    if (!user) return null;

    try {
      // Create the conversation
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

      // Add participants (including creator as admin)
      const participantsToInsert = [
        { conversation_id: newConv.id, user_id: user.id, is_admin: true },
        ...data.participant_ids.map(userId => ({
          conversation_id: newConv.id,
          user_id: userId,
          is_admin: false
        }))
      ];

      const { error: partError } = await supabase
        .from('conversation_participants')
        .insert(participantsToInsert);

      if (partError) throw partError;

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
          metadata: (data.metadata || {}) as Record<string, string | number | boolean | null>
        }]);

      if (error) throw error;

      // Update conversation updated_at
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', data.conversation_id);

      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      return false;
    }
  }, [user]);

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

  // Select a conversation
  const selectConversation = useCallback(async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    await fetchMessages(conversation.id);
    await fetchParticipants(conversation.id);
  }, [fetchMessages, fetchParticipants]);

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user, fetchConversations]);

  // Realtime subscriptions
  useEffect(() => {
    if (!user || !selectedConversation) return;

    const channel = supabase
      .channel(`chat-${selectedConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${selectedConversation.id}`
        },
        async (payload) => {
          const newMessage = payload.new as ChatMessageData;
          
          // Fetch sender profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_id, full_name, email, avatar_url')
            .eq('user_id', newMessage.sender_id)
            .maybeSingle();

          setMessages(prev => [...prev, { ...newMessage, sender: profile || undefined }]);
        }
      )
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
    addParticipant,
    removeParticipant,
    deleteConversation,
    leaveConversation,
    setSelectedConversation
  };
}
