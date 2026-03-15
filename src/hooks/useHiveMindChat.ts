import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useHiveMindChat() {
  const { user, session } = useAuth();

  const isHiveMindMention = useCallback((content: string): boolean => {
    return /@hivemind\b/i.test(content);
  }, []);

  const extractHiveMindQuery = useCallback((content: string): string => {
    return content.replace(/@hivemind\s*/i, '').trim();
  }, []);

  const sendToHiveMind = useCallback(async (
    query: string,
    conversationId: string,
  ): Promise<string | null> => {
    if (!user || !session) return null;

    try {
      const response = await supabase.functions.invoke('hive-mind', {
        body: {
          message: query,
          agent: 'GeneralAgent',
          context: 'chat',
        },
      });

      if (response.error) throw response.error;

      const aiResponse = response.data?.response || response.data?.message || 'I could not process that request.';

      // Insert AI response as a system message
      await supabase
        .from('chat_messages')
        .insert([{
          conversation_id: conversationId,
          sender_id: user.id,
          content: `🤖 **HiveMind AI:**\n\n${aiResponse}`,
          message_type: 'system' as string,
          metadata: { hivemind: true, query } as Record<string, string | number | boolean | null>,
        }]);

      return aiResponse;
    } catch (error) {
      console.error('HiveMind error:', error);
      return null;
    }
  }, [user, session]);

  return { isHiveMindMention, extractHiveMindQuery, sendToHiveMind };
}
