import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface ReactionGroup {
  emoji: string;
  count: number;
  users: string[];
  hasReacted: boolean;
}

export function useReactions(conversationId: string | null) {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<Map<string, Reaction[]>>(new Map());

  const fetchReactions = useCallback(async (messageIds: string[]) => {
    if (messageIds.length === 0) return;

    const { data, error } = await supabase
      .from('message_reactions')
      .select('*')
      .in('message_id', messageIds);

    if (!error && data) {
      const grouped = new Map<string, Reaction[]>();
      (data as Reaction[]).forEach(r => {
        const existing = grouped.get(r.message_id) || [];
        existing.push(r);
        grouped.set(r.message_id, existing);
      });
      setReactions(grouped);
    }
  }, []);

  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user) return;

    const messageReactions = reactions.get(messageId) || [];
    const existing = messageReactions.find(r => r.user_id === user.id && r.emoji === emoji);

    if (existing) {
      await supabase.from('message_reactions').delete().eq('id', existing.id);
      setReactions(prev => {
        const newMap = new Map(prev);
        const updated = (newMap.get(messageId) || []).filter(r => r.id !== existing.id);
        newMap.set(messageId, updated);
        return newMap;
      });
    } else {
      const { data, error } = await supabase
        .from('message_reactions')
        .insert([{ message_id: messageId, user_id: user.id, emoji }] as any)
        .select()
        .single();

      if (!error && data) {
        setReactions(prev => {
          const newMap = new Map(prev);
          const existing = newMap.get(messageId) || [];
          newMap.set(messageId, [...existing, data as Reaction]);
          return newMap;
        });
      }
    }
  }, [user, reactions]);

  const getReactionGroups = useCallback((messageId: string): ReactionGroup[] => {
    const messageReactions = reactions.get(messageId) || [];
    const groups = new Map<string, { count: number; users: string[]; hasReacted: boolean }>();
    
    messageReactions.forEach(r => {
      const group = groups.get(r.emoji) || { count: 0, users: [], hasReacted: false };
      group.count++;
      group.users.push(r.user_id);
      if (r.user_id === user?.id) group.hasReacted = true;
      groups.set(r.emoji, group);
    });

    return Array.from(groups.entries()).map(([emoji, data]) => ({
      emoji,
      ...data,
    }));
  }, [reactions, user?.id]);

  // Subscribe to reaction changes
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`reactions-${conversationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_reactions' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newReaction = payload.new as Reaction;
            setReactions(prev => {
              const newMap = new Map(prev);
              const existing = newMap.get(newReaction.message_id) || [];
              if (!existing.find(r => r.id === newReaction.id)) {
                newMap.set(newReaction.message_id, [...existing, newReaction]);
              }
              return newMap;
            });
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as Reaction;
            setReactions(prev => {
              const newMap = new Map(prev);
              const existing = newMap.get(deleted.message_id) || [];
              newMap.set(deleted.message_id, existing.filter(r => r.id !== deleted.id));
              return newMap;
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  return { reactions, fetchReactions, toggleReaction, getReactionGroups };
}
