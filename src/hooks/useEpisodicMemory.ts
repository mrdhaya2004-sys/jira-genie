import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { sessionHistoryService } from '@/lib/sessionHistory';

export interface Episode {
  id: string;
  user_id: string;
  history_log_id: string | null;
  workspace_id: string | null;
  module_name: string;
  session_id: string;
  role: string;
  content: string;
  turn_index: number;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface EpisodeContext {
  historyLogId: string;
  moduleName: string;
  workspaceId?: string;
  episodes: Episode[];
}

export const useEpisodicMemory = () => {
  const { user } = useAuth();
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);

  /**
   * Save a conversation turn (user prompt or AI response) as an episode.
   */
  const saveEpisode = useCallback(async (params: {
    historyLogId: string;
    moduleName: string;
    role: 'user' | 'assistant';
    content: string;
    turnIndex: number;
    workspaceId?: string;
    metadata?: Record<string, any>;
  }) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('episodes')
        .insert({
          user_id: user.id,
          history_log_id: params.historyLogId,
          workspace_id: params.workspaceId || null,
          module_name: params.moduleName,
          session_id: sessionHistoryService.getSessionId(),
          role: params.role,
          content: params.content,
          turn_index: params.turnIndex,
          metadata: params.metadata || {},
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as Episode;
    } catch (error) {
      console.error('Error saving episode:', error);
      return null;
    }
  }, [user]);

  /**
   * Save both user prompt and AI response as a pair of episodes.
   */
  const saveEpisodePair = useCallback(async (params: {
    historyLogId: string;
    moduleName: string;
    userPrompt: string;
    aiResponse: string;
    turnIndex: number;
    workspaceId?: string;
    metadata?: Record<string, any>;
  }) => {
    if (!user) return;

    try {
      await supabase.from('episodes').insert([
        {
          user_id: user.id,
          history_log_id: params.historyLogId,
          workspace_id: params.workspaceId || null,
          module_name: params.moduleName,
          session_id: sessionHistoryService.getSessionId(),
          role: 'user',
          content: params.userPrompt,
          turn_index: params.turnIndex,
          metadata: params.metadata || {},
        },
        {
          user_id: user.id,
          history_log_id: params.historyLogId,
          workspace_id: params.workspaceId || null,
          module_name: params.moduleName,
          session_id: sessionHistoryService.getSessionId(),
          role: 'assistant',
          content: params.aiResponse,
          turn_index: params.turnIndex + 1,
          metadata: params.metadata || {},
        },
      ] as any);
    } catch (error) {
      console.error('Error saving episode pair:', error);
    }
  }, [user]);

  /**
   * Load all episodes for a given history log entry.
   * Returns them in order for injecting into conversation memory.
   */
  const loadEpisodes = useCallback(async (historyLogId: string): Promise<Episode[]> => {
    if (!user) return [];
    setIsLoadingEpisodes(true);

    try {
      const { data, error } = await supabase
        .from('episodes')
        .select('*')
        .eq('history_log_id', historyLogId)
        .eq('user_id', user.id)
        .order('turn_index', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as Episode[];
    } catch (error) {
      console.error('Error loading episodes:', error);
      return [];
    } finally {
      setIsLoadingEpisodes(false);
    }
  }, [user]);

  /**
   * Build LangChain-style conversation messages from episodes
   * for injecting into the AI context.
   */
  const buildConversationContext = useCallback((episodes: Episode[]): Array<{ role: string; content: string }> => {
    return episodes.map(ep => ({
      role: ep.role,
      content: ep.content,
    }));
  }, []);

  /**
   * Get the next turn index for a history log
   */
  const getNextTurnIndex = useCallback(async (historyLogId: string): Promise<number> => {
    if (!user) return 0;

    try {
      const { data, error } = await supabase
        .from('episodes')
        .select('turn_index')
        .eq('history_log_id', historyLogId)
        .eq('user_id', user.id)
        .order('turn_index', { ascending: false })
        .limit(1);

      if (error) throw error;
      if (data && data.length > 0) {
        return ((data[0] as any).turn_index as number) + 1;
      }
      return 0;
    } catch {
      return 0;
    }
  }, [user]);

  return {
    isLoadingEpisodes,
    saveEpisode,
    saveEpisodePair,
    loadEpisodes,
    buildConversationContext,
    getNextTurnIndex,
  };
};
