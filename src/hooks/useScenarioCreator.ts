import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { 
  AutomationFramework, 
  ScenarioFlowPhase, 
  ScenarioChatMessage,
  GeneratedScenario,
  AUTOMATION_FRAMEWORKS 
} from '@/types/scenario';
import type { Workspace, WorkspaceFile } from '@/types/workspace';

interface UseScenarioCreatorOptions {
  workspaces: Workspace[];
}

export const useScenarioCreator = ({ workspaces }: UseScenarioCreatorOptions) => {
  const [messages, setMessages] = useState<ScenarioChatMessage[]>([]);
  const [phase, setPhase] = useState<ScenarioFlowPhase>('framework_selection');
  const [selectedFramework, setSelectedFramework] = useState<AutomationFramework | null>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const { toast } = useToast();

  // Initial greeting
  useEffect(() => {
    if (messages.length === 0) {
      addMessage({
        role: 'assistant',
        content: "Hi! 👋 I'll help you create automation logic scenarios.\n\n**Please select your automation framework to get started:**",
        type: 'framework_select',
      });
    }
  }, []);

  const addMessage = useCallback((message: Omit<ScenarioChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ScenarioChatMessage = {
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

  const handleFrameworkSelect = useCallback((frameworkId: AutomationFramework, frameworkName: string) => {
    setSelectedFramework(frameworkId);
    
    // Add user's selection message
    addMessage({
      role: 'user',
      content: `I'll use **${frameworkName}**`,
      type: 'text',
    });

    // Move to workspace selection
    setTimeout(() => {
      setPhase('workspace_selection');
      
      if (workspaces.length === 0) {
        addMessage({
          role: 'assistant',
          content: "⚠️ No workspaces found. Please create a workspace in the **Agentic AI – Core Workspace** module first to upload your user stories and app files.",
          type: 'text',
        });
      } else {
        addMessage({
          role: 'assistant',
          content: "Great choice! 🎯\n\n**Please select a workspace to load the Brain data:**\n\nI'll use the user stories, application flow, and test cases from the workspace to generate accurate scenarios.",
          type: 'workspace_select',
          options: workspaces.map(w => ({
            id: w.id,
            label: w.name,
            value: w.id,
            description: w.description || undefined,
          })),
        });
      }
    }, 500);
  }, [workspaces, addMessage]);

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
        contextInfo += `\n✅ **${appFiles.length}** app files (APK/IPA) available`;
      }
      if (contextInfo === '') {
        contextInfo = '\n⚠️ No files found in this workspace. Consider uploading user stories for better scenario generation.';
      }

      addMessage({
        role: 'assistant',
        content: `Workspace loaded successfully! 🧠${contextInfo}\n\n**Which application module do you want scenarios for?**`,
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
      setPhase('ready_for_query');
      
      addMessage({
        role: 'assistant',
        content: `Perfect! I'm ready to generate **${selectedFramework?.toUpperCase()}** scenarios for the **${moduleValue}** module. 🚀\n\n**What would you like me to generate?**\n\nYou can ask things like:\n- "Generate automation logic for Login flow"\n- "Create end-to-end scenario for the complete flow"\n- "Give positive and negative scenarios"\n- "Generate mobile login test scenarios for Android"\n- "Create 3 scenarios for form validation"`,
        type: 'text',
      });
    }, 500);
  }, [selectedFramework, addMessage]);

  const handleUserQuery = useCallback(async (query: string) => {
    if (!selectedFramework || !selectedWorkspace || !selectedModule) {
      toast({
        title: 'Missing Selection',
        description: 'Please complete the setup before generating scenarios.',
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
        throw new Error('Please log in to generate scenarios');
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
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scenario-generator`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            workspaceId: selectedWorkspace.id,
            framework: selectedFramework,
            module: selectedModule,
            query,
            context: {
              userStories,
              hasApk,
              hasIpa,
              appFiles: appFiles.map(f => ({ name: f.file_name, type: f.file_type })),
            },
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
        throw new Error('Failed to generate scenarios');
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
        type: 'scenario',
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

      setPhase('scenario_generated');
    } catch (error) {
      console.error('Scenario generation error:', error);
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate scenarios',
        variant: 'destructive',
      });
      
      addMessage({
        role: 'assistant',
        content: '❌ Sorry, I encountered an error while generating the scenarios. Please try again.',
        type: 'text',
      });
      setPhase('ready_for_query');
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, [selectedFramework, selectedWorkspace, selectedModule, workspaceFiles, toast, addMessage]);

  const resetFlow = useCallback(() => {
    setMessages([]);
    setPhase('framework_selection');
    setSelectedFramework(null);
    setSelectedWorkspace(null);
    setSelectedModule(null);
    setWorkspaceFiles([]);
    
    // Re-add initial message
    setTimeout(() => {
      addMessage({
        role: 'assistant',
        content: "Hi! 👋 I'll help you create automation logic scenarios.\n\n**Please select your automation framework to get started:**",
        type: 'framework_select',
      });
    }, 100);
  }, [addMessage]);

  return {
    messages,
    phase,
    selectedFramework,
    selectedWorkspace,
    selectedModule,
    isLoading,
    isStreaming,
    handleFrameworkSelect,
    handleWorkspaceSelect,
    handleModuleSelect,
    handleUserQuery,
    resetFlow,
  };
};

// Helper function to extract module names from user stories
function extractModulesFromUserStories(files: WorkspaceFile[]): string[] {
  const moduleKeywords = new Set<string>();
  const commonModules = ['login', 'signup', 'register', 'dashboard', 'profile', 'settings', 'logout', 'home', 'search', 'cart', 'checkout', 'payment', 'orders', 'notifications'];
  
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
