import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useTypingIndicator(conversationId: string | null) {
  const { user, profile } = useAuth();
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const channelRef = useRef<ReturnType<typeof supabase.channel>>();

  const sendTyping = useCallback(() => {
    if (!conversationId || !user || !channelRef.current) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        user_id: user.id,
        user_name: profile?.full_name || 'Someone',
      },
    });
  }, [conversationId, user, profile]);

  const stopTyping = useCallback(() => {
    if (!conversationId || !user || !channelRef.current) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'stop_typing',
      payload: { user_id: user.id },
    });
  }, [conversationId, user]);

  // Debounced typing handler for input
  const handleTyping = useCallback(() => {
    sendTyping();
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [sendTyping, stopTyping]);

  useEffect(() => {
    if (!conversationId || !user) return;

    const channel = supabase.channel(`typing-${conversationId}`);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { user_id, user_name } = payload.payload;
        if (user_id !== user.id) {
          setTypingUsers(prev => {
            const newMap = new Map(prev);
            newMap.set(user_id, user_name);
            return newMap;
          });

          // Auto-clear after 4 seconds
          setTimeout(() => {
            setTypingUsers(prev => {
              const newMap = new Map(prev);
              newMap.delete(user_id);
              return newMap;
            });
          }, 4000);
        }
      })
      .on('broadcast', { event: 'stop_typing' }, (payload) => {
        const { user_id } = payload.payload;
        setTypingUsers(prev => {
          const newMap = new Map(prev);
          newMap.delete(user_id);
          return newMap;
        });
      })
      .subscribe();

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [conversationId, user]);

  const typingText = (() => {
    const names = Array.from(typingUsers.values());
    if (names.length === 0) return null;
    if (names.length === 1) return `${names[0]} is typing...`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
    return `${names[0]} and ${names.length - 1} others are typing...`;
  })();

  return { typingUsers, typingText, handleTyping, stopTyping };
}
