import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Mention {
  id: string;
  mentioned_user_id: string | null;
  mentioned_by_user_id: string;
  mention_type: 'user' | 'everyone';
  source_type: 'ticket' | 'comment' | 'chat';
  source_id: string | null;
  source_title: string | null;
  content_snippet: string;
  is_read: boolean;
  created_at: string;
  mentioned_by?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export const useMentions = () => {
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchMentions = useCallback(async () => {
    if (!user) {
      setMentions([]);
      setIsLoading(false);
      return;
    }

    try {
      // Fetch mentions where user is mentioned directly or via @everyone
      const { data: mentionsData, error: mentionsError } = await supabase
        .from('mentions')
        .select('*')
        .or(`mentioned_user_id.eq.${user.id},mention_type.eq.everyone`)
        .order('created_at', { ascending: false });

      if (mentionsError) {
        // Check if it's a JWT expired error
        if (mentionsError.code === 'PGRST303' || mentionsError.message?.includes('JWT expired')) {
          console.log('JWT expired, attempting to refresh session...');
          const { error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError) {
            console.error('Failed to refresh session:', refreshError);
            // Force sign out on refresh failure
            await supabase.auth.signOut();
            return;
          }
          
          // Retry the fetch after refresh
          const { data: retryData, error: retryError } = await supabase
            .from('mentions')
            .select('*')
            .or(`mentioned_user_id.eq.${user.id},mention_type.eq.everyone`)
            .order('created_at', { ascending: false });
            
          if (retryError) {
            throw retryError;
          }
          
          // Process retryData instead
          await processMentionsData(retryData);
          return;
        }
        throw mentionsError;
      }

      await processMentionsData(mentionsData);
    } catch (error) {
      console.error('Error fetching mentions:', error);
      // Only show toast for non-auth errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (!errorMessage.includes('JWT') && !errorMessage.includes('auth')) {
        toast({
          title: 'Error',
          description: 'Failed to load mentions',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  const processMentionsData = useCallback(async (mentionsData: any[] | null) => {
    if (!mentionsData) {
      setMentions([]);
      return;
    }

    // Get unique mentioned_by_user_ids to fetch their profiles
    const mentionedByIds = [...new Set(mentionsData.map(m => m.mentioned_by_user_id))];
    
    let profilesMap: Record<string, { full_name: string; avatar_url: string | null }> = {};
    
    if (mentionedByIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', mentionedByIds);

      if (!profilesError && profilesData) {
        profilesMap = profilesData.reduce((acc, profile) => {
          acc[profile.user_id] = {
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
          };
          return acc;
        }, {} as Record<string, { full_name: string; avatar_url: string | null }>);
      }
    }

    // Combine mentions with profile data
    const enrichedMentions: Mention[] = mentionsData.map(mention => ({
      ...mention,
      mention_type: mention.mention_type as 'user' | 'everyone',
      source_type: mention.source_type as 'ticket' | 'comment' | 'chat',
      mentioned_by: profilesMap[mention.mentioned_by_user_id],
    }));

    setMentions(enrichedMentions);
  }, []);

  const markAsRead = useCallback(async (mentionId: string) => {
    try {
      const { error } = await supabase
        .from('mentions')
        .update({ is_read: true })
        .eq('id', mentionId);

      if (error) throw error;

      setMentions(prev => 
        prev.map(m => m.id === mentionId ? { ...m, is_read: true } : m)
      );
    } catch (error) {
      console.error('Error marking mention as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    try {
      const unreadIds = mentions.filter(m => !m.is_read).map(m => m.id);
      
      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('mentions')
        .update({ is_read: true })
        .in('id', unreadIds);

      if (error) throw error;

      setMentions(prev => prev.map(m => ({ ...m, is_read: true })));
      
      toast({
        title: 'Success',
        description: 'All mentions marked as read',
      });
    } catch (error) {
      console.error('Error marking all mentions as read:', error);
    }
  }, [user, mentions, toast]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('mentions-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mentions',
        },
        (payload) => {
          // Check if this mention is for the current user
          const newMention = payload.new as Mention;
          if (
            newMention.mentioned_user_id === user.id || 
            newMention.mention_type === 'everyone'
          ) {
            fetchMentions();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchMentions]);

  // Initial fetch
  useEffect(() => {
    fetchMentions();
  }, [fetchMentions]);

  const unreadCount = mentions.filter(m => !m.is_read).length;

  return {
    mentions,
    isLoading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refetch: fetchMentions,
  };
};
