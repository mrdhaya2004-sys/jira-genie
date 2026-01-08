import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { AICapability, WorkspaceChatMessage, WorkspaceFile } from '@/types/workspace';

interface UseWorkspaceAIOptions {
  workspaceId: string;
  files: WorkspaceFile[];
}

export const useWorkspaceAI = ({ workspaceId, files }: UseWorkspaceAIOptions) => {
  const [messages, setMessages] = useState<WorkspaceChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const { toast } = useToast();

  const fetchChatHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('workspace_chat_messages')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []) as WorkspaceChatMessage[]);
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  }, [workspaceId]);

  const sendMessage = useCallback(async (content: string, capability?: AICapability) => {
    if (!content.trim()) return;

    setIsLoading(true);
    setIsStreaming(true);

    // Add user message to state immediately
    const userMessage: WorkspaceChatMessage = {
      id: crypto.randomUUID(),
      workspace_id: workspaceId,
      role: 'user',
      content,
      metadata: capability ? { capability } : {},
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Save user message to database
    await supabase.from('workspace_chat_messages').insert({
      workspace_id: workspaceId,
      role: 'user',
      content,
      metadata: capability ? { capability } : {},
    });

    try {
      // Prepare context from files
      const userStories = files
        .filter(f => f.file_type === 'user_story' && f.content_extracted)
        .map(f => f.content_extracted)
        .join('\n\n');

      const appFiles = files.filter(f => f.file_type === 'apk' || f.file_type === 'ipa');
      const hasApk = appFiles.some(f => f.file_type === 'apk');
      const hasIpa = appFiles.some(f => f.file_type === 'ipa');

      // Build messages for AI
      const aiMessages = messages.map(m => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      }));

      // Call edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/workspace-ai-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            workspaceId,
            message: content,
            capability,
            context: {
              userStories,
              hasApk,
              hasIpa,
              appFiles: appFiles.map(f => ({ name: f.file_name, type: f.file_type })),
            },
            history: aiMessages.slice(-10), // Last 10 messages for context
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (response.status === 402) {
          throw new Error('AI credits exhausted. Please add more credits.');
        }
        throw new Error('AI request failed');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      const assistantId = crypto.randomUUID();

      // Add placeholder assistant message
      setMessages(prev => [...prev, {
        id: assistantId,
        workspace_id: workspaceId,
        role: 'assistant',
        content: '',
        metadata: {},
        created_at: new Date().toISOString(),
      }]);

      if (reader) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          
          let newlineIndex: number;
          while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, newlineIndex).trim();
            buffer = buffer.slice(newlineIndex + 1);

            if (!line || line.startsWith(':')) continue;
            if (!line.startsWith('data: ')) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(jsonStr);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                assistantContent += delta;
                setMessages(prev => 
                  prev.map(m => m.id === assistantId 
                    ? { ...m, content: assistantContent }
                    : m
                  )
                );
              }
            } catch {
              // Incomplete JSON, continue
            }
          }
        }
      }

      // Save assistant message to database
      await supabase.from('workspace_chat_messages').insert({
        workspace_id: workspaceId,
        role: 'assistant',
        content: assistantContent,
        metadata: capability ? { capability } : {},
      });

    } catch (error) {
      console.error('AI error:', error);
      toast({
        title: 'AI Error',
        description: error instanceof Error ? error.message : 'Failed to get AI response',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, [workspaceId, files, messages, toast]);

  const clearHistory = useCallback(async () => {
    try {
      await supabase
        .from('workspace_chat_messages')
        .delete()
        .eq('workspace_id', workspaceId);
      
      setMessages([]);
      toast({
        title: 'Success',
        description: 'Chat history cleared',
      });
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  }, [workspaceId, toast]);

  return {
    messages,
    isLoading,
    isStreaming,
    sendMessage,
    clearHistory,
    fetchChatHistory,
  };
};
