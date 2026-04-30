import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useHistoryLogs } from '@/hooks/useHistoryLogs';
import { useEpisodicMemory } from '@/hooks/useEpisodicMemory';
import { automationHistoryService } from '@/lib/automationHistory';
import { useEnvironmentContext } from '@/hooks/useEnvironmentContext';
import { getRememberedEnv, rememberEnv, getEnvironmentMeta, type Environment } from '@/types/environment';
import type { 
  XPathFlowPhase, 
  XPathChatMessage,
  Platform,
  GeneratedXPath,
} from '@/types/xpath';
import type { Workspace, WorkspaceFile } from '@/types/workspace';

interface UseXPathGeneratorOptions {
  workspaces: Workspace[];
  isLoadingWorkspaces?: boolean;
}

export const useXPathGenerator = ({ workspaces, isLoadingWorkspaces = false }: UseXPathGeneratorOptions) => {
  const [messages, setMessages] = useState<XPathChatMessage[]>([]);
  const [phase, setPhase] = useState<XPathFlowPhase>('workspace_selection');
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeHistoryLogId, setActiveHistoryLogId] = useState<string | null>(null);
  const [episodicContext, setEpisodicContext] = useState<Array<{ role: string; content: string }>>([]);
  const [selectedEnvironment, setSelectedEnvironmentState] = useState<Environment | null>(null);
  const { toast } = useToast();
  const { addLog } = useHistoryLogs();
  const { saveEpisodePair, loadEpisodes, buildConversationContext, getNextTurnIndex } = useEpisodicMemory();
  const { loadContext } = useEnvironmentContext();

  const setSelectedEnvironment = useCallback((env: Environment) => {
    if (selectedWorkspace) rememberEnv(selectedWorkspace.id, env);
    setSelectedEnvironmentState(env);
  }, [selectedWorkspace]);

  // Initial greeting — wait for workspaces to finish loading before deciding
  useEffect(() => {
    // Don't render anything while workspaces are still loading
    if (isLoadingWorkspaces) return;

    // If we already have workspace_select messages with options, skip
    const hasWorkspaceOptions = messages.some(
      m => m.type === 'workspace_select' && m.options && m.options.length > 0
    );
    if (hasWorkspaceOptions) return;

    // Remove any stale initial/no-workspace messages and rebuild
    setMessages(prev => prev.filter(m => 
      m.type !== 'workspace_select' && 
      !(m.role === 'assistant' && m.content.includes('No workspaces found'))
    ));

    if (workspaces.length === 0) {
      addMessage({
        role: 'assistant',
        content: "Hi! 🧬 I can generate XPaths for your application.\n\n⚠️ **No workspaces found.** Please create a workspace in the **Hive AI – Core Workspace** module first.",
        type: 'text',
      });
    } else {
      addMessage({
        role: 'assistant',
        content: "Hi! 🧬 I can generate XPaths for your application based on DOM analysis.\n\n**Please select a workspace to continue:**",
        type: 'workspace_select',
        options: workspaces.map(w => ({
          id: w.id,
          label: w.name,
          value: w.id,
          description: w.description || undefined,
        })),
      });
    }
  }, [workspaces, isLoadingWorkspaces]);

  const addMessage = useCallback((message: Omit<XPathChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: XPathChatMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, []);

  const fetchWorkspaceFiles = useCallback(async (workspaceId: string) => {
    try {
      const { data, error } = await supabase
        .from('workspace_files')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const files = (data || []) as WorkspaceFile[];
      setWorkspaceFiles(files);
      return files;
    } catch (error) {
      console.error('Error fetching workspace files:', error);
      return [];
    }
  }, []);

  const handleWorkspaceSelect = useCallback(async (workspaceId: string, workspaceName: string) => {
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (!workspace) return;

    setSelectedWorkspace(workspace);
    setIsLoading(true);

    // Add user's selection
    addMessage({
      role: 'user',
      content: `Selected workspace: **${workspaceName}**`,
      type: 'text',
    });

    // Fetch workspace files
    const fetchedFiles = await fetchWorkspaceFiles(workspaceId);
    setIsLoading(false);

    // Analyze workspace data
    const userStories = fetchedFiles.filter((f: WorkspaceFile) => f.file_type === 'user_story');
    const appFiles = fetchedFiles.filter((f: WorkspaceFile) => f.file_type === 'apk' || f.file_type === 'ipa');
    
    // Extract possible modules from user stories
    const modules = extractModulesFromUserStories(userStories);

    setTimeout(() => {
      setPhase('module_selection');
      
      let contextInfo = '';
      if (userStories.length > 0) {
        contextInfo += `\n✅ **${userStories.length}** user stories loaded`;
      }
      if (appFiles.length > 0) {
        contextInfo += `\n✅ **${appFiles.length}** app files (APK/IPA) available for DOM analysis`;
      }
      if (contextInfo === '') {
        contextInfo = '\n⚠️ No files found in this workspace. Consider uploading user stories and app files for better XPath generation.';
      }

      addMessage({
        role: 'assistant',
        content: `Workspace loaded successfully! 🧠${contextInfo}\n\n**Which application module do you want XPaths for?**`,
        type: 'module_select',
        options: modules.length > 0 
          ? modules.map(m => ({ id: m, label: m, value: m }))
          : [
              { id: 'login', label: 'Login', value: 'Login' },
              { id: 'premarketing', label: 'PreMarketing', value: 'PreMarketing' },
              { id: 'dashboard', label: 'Dashboard', value: 'Dashboard' },
              { id: 'profile', label: 'Profile', value: 'Profile' },
              { id: 'logout', label: 'Logout', value: 'Logout' },
              { id: 'custom', label: 'Custom Module...', value: 'custom' },
            ],
      });
    }, 500);
  }, [workspaces, fetchWorkspaceFiles, addMessage]);

  const handleModuleSelect = useCallback((moduleValue: string) => {
    setSelectedModule(moduleValue);

    addMessage({
      role: 'user',
      content: `Module: **${moduleValue}**`,
      type: 'text',
    });

    setTimeout(() => {
      setPhase('platform_selection');
      
      addMessage({
        role: 'assistant',
        content: `Great! Now, **which platform do you need XPaths for?**\n\nEach platform uses different attributes for element identification.`,
        type: 'platform_select',
        options: [
          { id: 'android', label: 'Android', value: 'android', icon: '🤖', description: 'Uses resource-id, content-desc, text' },
          { id: 'ios', label: 'iOS', value: 'ios', icon: '🍎', description: 'Uses name, label, value, type' },
        ],
      });
    }, 500);
  }, [addMessage]);

  const handlePlatformSelect = useCallback((platform: Platform) => {
    setSelectedPlatform(platform);

    const platformLabel = platform === 'android' ? '🤖 Android' : '🍎 iOS';
    
    addMessage({
      role: 'user',
      content: `Platform: **${platformLabel}**`,
      type: 'text',
    });

    setTimeout(() => {
      setPhase('ready_for_query');
      
      addMessage({
        role: 'assistant',
        content: `Perfect! I'm ready to generate **${platform === 'android' ? 'Android' : 'iOS'}** XPaths for the **${selectedModule}** module. 🎯\n\n**What element do you need XPaths for?**\n\nYou can ask things like:\n- "Generate XPath for Login button"\n- "Give all possible XPaths for Country dropdown"\n- "Generate relative XPath for password field"\n- "Create XPath for the submit button on login form"`,
        type: 'text',
      });
    }, 500);
  }, [selectedModule, addMessage]);

  const handleUserQuery = useCallback(async (query: string) => {
    if (!selectedWorkspace || !selectedModule || !selectedPlatform) {
      toast({
        title: 'Missing Selection',
        description: 'Please complete the setup before generating XPaths.',
        variant: 'destructive',
      });
      return;
    }

    // Add user message
    addMessage({
      role: 'user',
      content: query,
      type: 'text',
    });

    setIsLoading(true);
    setIsStreaming(true);
    setPhase('generating');

    try {
      // Get user's auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Please log in to generate XPaths');
      }

      // Prepare context from workspace files
      const userStories = workspaceFiles
        .filter(f => f.file_type === 'user_story' && f.content_extracted)
        .map(f => f.content_extracted)
        .join('\n\n');

      const appFiles = workspaceFiles.filter(f => f.file_type === 'apk' || f.file_type === 'ipa');
      const hasApk = appFiles.some(f => f.file_type === 'apk');
      const hasIpa = appFiles.some(f => f.file_type === 'ipa');

      // Call edge function with user's JWT token
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/xpath-generator`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            workspaceId: selectedWorkspace.id,
            module: selectedModule,
            platform: selectedPlatform,
            query,
            context: {
              userStories,
              hasApk,
              hasIpa,
              appFiles: appFiles.map(f => ({ name: f.file_name, type: f.file_type })),
            },
            episodicMemory: episodicContext.length > 0 ? episodicContext : undefined,
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired. Please refresh the page and log in again.');
        }
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (response.status === 402) {
          throw new Error('AI credits exhausted. Please add more credits.');
        }
        throw new Error('Failed to generate XPaths');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      const assistantId = crypto.randomUUID();

      // Add placeholder assistant message
      setMessages(prev => [...prev, {
        id: assistantId,
        role: 'assistant',
        content: '',
        type: 'xpath_result',
        timestamp: new Date().toISOString(),
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

      // Save to local history
      automationHistoryService.addEntry({
        toolType: 'xpath',
        title: query.slice(0, 50) + (query.length > 50 ? '...' : ''),
        summary: `Generated ${selectedPlatform === 'android' ? 'Android' : 'iOS'} XPaths for ${selectedModule}`,
        metadata: {
          workspace: selectedWorkspace?.name,
          module: selectedModule || undefined,
          platform: selectedPlatform || undefined,
        },
      });

      // Save to persistent history and get log ID
      let logId = activeHistoryLogId;
      if (!logId) {
        logId = await addLog({
          module_name: 'xpath-generator',
          action_type: 'generate',
          input_prompt: query,
          output_summary: `Generated ${selectedPlatform === 'android' ? 'Android' : 'iOS'} XPaths for ${selectedModule}`,
          workspace_id: selectedWorkspace?.id,
          metadata: { module: selectedModule, platform: selectedPlatform },
        }) || null;
        if (logId) setActiveHistoryLogId(logId);
      }

      // Save episode pair
      if (logId) {
        const turnIdx = await getNextTurnIndex(logId);
        await saveEpisodePair({
          historyLogId: logId,
          moduleName: 'xpath-generator',
          userPrompt: query,
          aiResponse: assistantContent,
          turnIndex: turnIdx,
          workspaceId: selectedWorkspace?.id,
        });
        setEpisodicContext(prev => [...prev, { role: 'user', content: query }, { role: 'assistant', content: assistantContent }]);
      }

      setPhase('xpath_generated');
    } catch (error) {
      console.error('XPath generation error:', error);
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate XPaths',
        variant: 'destructive',
      });
      
      addMessage({
        role: 'assistant',
        content: '❌ Sorry, I encountered an error while generating XPaths. Please try again.',
        type: 'text',
      });
      setPhase('ready_for_query');
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, [selectedWorkspace, selectedModule, selectedPlatform, workspaceFiles, toast, addMessage]);

  const resetFlow = useCallback(() => {
    setMessages([]);
    setPhase('workspace_selection');
    setSelectedWorkspace(null);
    setSelectedModule(null);
    setSelectedPlatform(null);
    setWorkspaceFiles([]);
    setActiveHistoryLogId(null);
    setEpisodicContext([]);
    
    // Re-add initial message
    setTimeout(() => {
      if (workspaces.length === 0) {
        addMessage({
          role: 'assistant',
          content: "Hi! 🧬 I can generate XPaths for your application.\n\n⚠️ **No workspaces found.** Please create a workspace in the **Hive AI – Core Workspace** module first.",
          type: 'text',
        });
      } else {
        addMessage({
          role: 'assistant',
          content: "Hi! 🧬 I can generate XPaths for your application based on DOM analysis.\n\n**Please select a workspace to continue:**",
          type: 'workspace_select',
          options: workspaces.map(w => ({
            id: w.id,
            label: w.name,
            value: w.id,
            description: w.description || undefined,
          })),
        });
      }
    }, 100);
  }, [workspaces, addMessage]);

  const resumeFromHistory = useCallback(async (historyLogId: string, initialPrompt: string) => {
    setIsLoading(true);
    try {
      const episodes = await loadEpisodes(historyLogId);
      
      if (episodes.length > 0) {
        const context = buildConversationContext(episodes);
        setEpisodicContext(context);
        setActiveHistoryLogId(historyLogId);
        setPhase('ready_for_query');
        setSelectedPlatform('android');
        setSelectedModule('Resumed');
        
        const rebuiltMessages: XPathChatMessage[] = [{
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '🔄 **Resumed from previous session.** Here\'s your conversation history:',
          type: 'text',
          timestamp: new Date().toISOString(),
        }];
        
        for (const ep of episodes) {
          rebuiltMessages.push({
            id: crypto.randomUUID(),
            role: ep.role as 'user' | 'assistant',
            content: ep.content,
            type: ep.role === 'assistant' ? 'xpath_result' : 'text',
            timestamp: ep.created_at,
          });
        }

        rebuiltMessages.push({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '✅ **Context loaded.** Continue generating XPaths.',
          type: 'text',
          timestamp: new Date().toISOString(),
        });

        setMessages(rebuiltMessages);
      } else {
        setPhase('ready_for_query');
        setSelectedPlatform('android');
        setSelectedModule('Resumed');
        setMessages([{
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `🔄 Resuming previous session. Your last prompt was:\n\n> ${initialPrompt}\n\nContinue or ask a new question.`,
          type: 'text',
          timestamp: new Date().toISOString(),
        }]);
      }
    } catch (error) {
      console.error('Error resuming from history:', error);
    } finally {
      setIsLoading(false);
    }
  }, [loadEpisodes, buildConversationContext]);

  return {
    messages,
    phase,
    selectedWorkspace,
    selectedModule,
    selectedPlatform,
    isLoading,
    isStreaming,
    handleWorkspaceSelect,
    handleModuleSelect,
    handlePlatformSelect,
    handleUserQuery,
    resetFlow,
    resumeFromHistory,
  };
};

// Helper function to extract module names from user stories
function extractModulesFromUserStories(files: WorkspaceFile[]): string[] {
  const moduleKeywords = new Set<string>();
  const commonModules = ['login', 'signup', 'register', 'dashboard', 'profile', 'settings', 'logout', 'home', 'search', 'cart', 'checkout', 'payment', 'orders', 'notifications', 'premarketing'];
  
  files.forEach(file => {
    if (file.content_extracted) {
      const content = file.content_extracted.toLowerCase();
      commonModules.forEach(mod => {
        if (content.includes(mod)) {
          moduleKeywords.add(mod.charAt(0).toUpperCase() + mod.slice(1));
        }
      });
    }
  });

  return Array.from(moduleKeywords).slice(0, 8);
}
