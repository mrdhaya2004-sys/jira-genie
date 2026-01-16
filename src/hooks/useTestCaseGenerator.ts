import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import type { Workspace } from '@/types/workspace';
import type {
  TestCaseFlowPhase,
  TestCaseMode,
  TestCaseChatMessage,
  ParsedExcelStructure,
  GeneratedTestCase,
} from '@/types/testcase';

interface UseTestCaseGeneratorOptions {
  workspaces: Workspace[];
}

export const useTestCaseGenerator = ({ workspaces }: UseTestCaseGeneratorOptions) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<TestCaseChatMessage[]>([]);
  const [phase, setPhase] = useState<TestCaseFlowPhase>('initial');
  const [selectedMode, setSelectedMode] = useState<TestCaseMode | null>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [workspaceFiles, setWorkspaceFiles] = useState<any[]>([]);
  const [excelStructure, setExcelStructure] = useState<ParsedExcelStructure | null>(null);
  const [generatedTestCases, setGeneratedTestCases] = useState<GeneratedTestCase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  // Initial greeting
  useEffect(() => {
    if (messages.length === 0) {
      addMessage({
        role: 'assistant',
        content: "Hi, I'm ready to generate test cases.\nPlease select a workspace or choose manual mode.",
        type: 'mode_select',
        options: [
          { id: 'workspace', label: 'Select Workspace', value: 'workspace', icon: '📁', description: 'Use workspace brain data' },
          { id: 'manual', label: 'Manual Mode', value: 'manual', icon: '✍️', description: 'Generate without workspace context' },
        ],
      });
    }
  }, []);

  const addMessage = useCallback((msg: Omit<TestCaseChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: TestCaseChatMessage = {
      ...msg,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, []);

  const fetchWorkspaceFiles = useCallback(async (workspaceId: string) => {
    const { data, error } = await supabase
      .from('workspace_files')
      .select('*')
      .eq('workspace_id', workspaceId);

    if (!error && data) {
      setWorkspaceFiles(data);
      return data;
    }
    return [];
  }, []);

  const handleModeSelect = useCallback(async (mode: TestCaseMode) => {
    setSelectedMode(mode);
    
    addMessage({
      role: 'user',
      content: mode === 'workspace' ? 'Select Workspace' : 'Manual Mode',
      type: 'text',
    });

    if (mode === 'workspace') {
      setPhase('workspace_selection');
      
      if (workspaces.length === 0) {
        addMessage({
          role: 'assistant',
          content: "No workspaces found. Please create a workspace in the **Agentic AI – Core Workspace** first, or switch to Manual Mode.",
          type: 'text',
        });
        return;
      }

      addMessage({
        role: 'assistant',
        content: "Please select a workspace to continue.",
        type: 'workspace_select',
        options: workspaces.map(w => ({
          id: w.id,
          label: w.name,
          value: w.id,
          icon: '📁',
        })),
      });
    } else {
      setPhase('ready_for_query');
      addMessage({
        role: 'assistant',
        content: "You're in **Manual Mode**. I'll generate test cases based on your prompts without workspace context.\n\nYou can optionally upload a reference Excel file to define the test case format, or just ask me to generate test cases.\n\n**Examples:**\n- \"Generate 5 test cases for login functionality\"\n- \"Create negative test cases for user registration\"\n- \"Generate boundary test cases for age input field\"",
        type: 'text',
      });
    }
  }, [workspaces, addMessage]);

  const handleWorkspaceSelect = useCallback(async (workspaceId: string, workspaceName: string) => {
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (!workspace) return;

    setSelectedWorkspace(workspace);
    
    addMessage({
      role: 'user',
      content: `📁 ${workspaceName}`,
      type: 'text',
    });

    // Fetch workspace files
    const files = await fetchWorkspaceFiles(workspaceId);
    const userStoryCount = files.filter((f: any) => f.file_type === 'user_story').length;
    const appFileCount = files.filter((f: any) => ['apk', 'ipa'].includes(f.file_type)).length;

    setPhase('ready_for_query');
    
    addMessage({
      role: 'assistant',
      content: `Workspace **${workspaceName}** loaded successfully!\n\n📊 **Brain Data:**\n- ${userStoryCount} user stor${userStoryCount === 1 ? 'y' : 'ies'}\n- ${appFileCount} application file${appFileCount === 1 ? '' : 's'}\n\nYou can optionally upload a **reference Excel file** to define the test case format, or just ask me to generate test cases.\n\n**Examples:**\n- \"Generate test cases for login module\"\n- \"Generate only negative test cases for dashboard\"\n- \"Create 10 functional test cases for search feature\"`,
      type: 'text',
    });
  }, [workspaces, fetchWorkspaceFiles, addMessage]);

  const parseExcelFile = useCallback(async (file: File): Promise<ParsedExcelStructure | null> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Get range
          const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
          
          // Extract headers (first row)
          const columns: ParsedExcelStructure['columns'] = [];
          for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
            const cell = worksheet[cellAddress];
            if (cell && cell.v) {
              columns.push({
                key: String(cell.v).toLowerCase().replace(/\s+/g, '_'),
                header: String(cell.v),
                index: col,
              });
            }
          }

          // Extract sample rows (next 2-3 rows for reference)
          const sampleRows: Record<string, string>[] = [];
          const sampleCount = Math.min(3, range.e.r);
          for (let row = 1; row <= sampleCount; row++) {
            const rowData: Record<string, string> = {};
            columns.forEach(col => {
              const cellAddress = XLSX.utils.encode_cell({ r: row, c: col.index });
              const cell = worksheet[cellAddress];
              rowData[col.key] = cell ? String(cell.v || '') : '';
            });
            if (Object.values(rowData).some(v => v)) {
              sampleRows.push(rowData);
            }
          }

          resolve({ columns, sampleRows, sheetName });
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsBinaryString(file);
    });
  }, []);

  const handleExcelUpload = useCallback(async (file: File) => {
    addMessage({
      role: 'user',
      content: `📎 Uploaded: ${file.name}`,
      type: 'text',
    });

    try {
      const structure = await parseExcelFile(file);
      if (structure) {
        setExcelStructure(structure);
        
        const columnList = structure.columns.map(c => `• ${c.header}`).join('\n');
        addMessage({
          role: 'assistant',
          content: `Excel structure analyzed successfully!\n\n**Detected Columns:**\n${columnList}\n\nI'll generate test cases in this exact format. Now, what test cases would you like me to generate?`,
          type: 'text',
          excelStructure: structure,
        });
      }
    } catch (error) {
      toast({
        title: 'Error parsing Excel',
        description: 'Please ensure the file is a valid Excel file with headers in the first row.',
        variant: 'destructive',
      });
    }
  }, [parseExcelFile, addMessage, toast]);

  const handleUserQuery = useCallback(async (query: string) => {
    if (!query.trim()) return;

    addMessage({
      role: 'user',
      content: query,
      type: 'text',
    });

    setPhase('generating');
    setIsLoading(true);
    setIsStreaming(true);

    try {
      // Get user's auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Please log in to generate test cases');
      }

      // Prepare context from workspace files
      const userStories = workspaceFiles
        .filter(f => f.file_type === 'user_story' && f.content_extracted)
        .map(f => f.content_extracted)
        .join('\n\n');

      // Call edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/testcase-generator`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            workspaceId: selectedWorkspace?.id,
            mode: selectedMode,
            query,
            context: {
              userStories,
              excelStructure,
            },
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired. Please refresh and log in again.');
        }
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (response.status === 402) {
          throw new Error('AI credits exhausted. Please add more credits.');
        }
        throw new Error('Failed to generate test cases');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let fullContent = '';
      let assistantMessageId: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullContent += content;

                // Update or create assistant message
                setMessages(prev => {
                  const lastMsg = prev[prev.length - 1];
                  if (lastMsg?.role === 'assistant' && lastMsg.id === assistantMessageId) {
                    return prev.map(m => 
                      m.id === assistantMessageId 
                        ? { ...m, content: fullContent }
                        : m
                    );
                  } else {
                    const newId = crypto.randomUUID();
                    assistantMessageId = newId;
                    return [...prev, {
                      id: newId,
                      role: 'assistant',
                      content: fullContent,
                      type: 'text',
                      timestamp: new Date().toISOString(),
                    }];
                  }
                });
              }
            } catch {
              // Ignore parse errors for incomplete JSON
            }
          }
        }
      }

      // Try to parse generated test cases from the response
      try {
        const testCasesMatch = fullContent.match(/```json\n([\s\S]*?)\n```/);
        if (testCasesMatch) {
          const parsedCases = JSON.parse(testCasesMatch[1]);
          if (Array.isArray(parsedCases)) {
            setGeneratedTestCases(parsedCases);
          }
        }
      } catch {
        // If no JSON found, that's okay - the test cases are in text format
      }

      setPhase('completed');

      // Add download prompt if we have structured test cases
      if (excelStructure) {
        addMessage({
          role: 'assistant',
          content: 'Test case generation completed! Click the button below to download your test cases as an Excel file.',
          type: 'download',
        });
      }

    } catch (error) {
      console.error('Test case generation error:', error);
      toast({
        title: 'Generation Error',
        description: error instanceof Error ? error.message : 'Failed to generate test cases',
        variant: 'destructive',
      });
      
      addMessage({
        role: 'assistant',
        content: `❌ Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        type: 'text',
      });
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setPhase('ready_for_query');
    }
  }, [selectedWorkspace, selectedMode, workspaceFiles, excelStructure, addMessage, toast]);

  const generateExcelDownload = useCallback(() => {
    if (generatedTestCases.length === 0 || !excelStructure) {
      toast({
        title: 'No test cases',
        description: 'Please generate test cases first.',
        variant: 'destructive',
      });
      return;
    }

    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Create worksheet data with headers
    const wsData = [
      excelStructure.columns.map(c => c.header),
      ...generatedTestCases.map(tc => 
        excelStructure.columns.map(c => tc[c.key] || '')
      ),
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Test Cases');

    // Generate and download
    const fileName = `test_cases_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);

    toast({
      title: 'Download Complete',
      description: `${generatedTestCases.length} test cases exported to ${fileName}`,
    });
  }, [generatedTestCases, excelStructure, toast]);

  const resetFlow = useCallback(() => {
    setMessages([]);
    setPhase('initial');
    setSelectedMode(null);
    setSelectedWorkspace(null);
    setWorkspaceFiles([]);
    setExcelStructure(null);
    setGeneratedTestCases([]);
    setIsLoading(false);
    setIsStreaming(false);

    // Re-add initial greeting
    setTimeout(() => {
      addMessage({
        role: 'assistant',
        content: "Hi, I'm ready to generate test cases.\nPlease select a workspace or choose manual mode.",
        type: 'mode_select',
        options: [
          { id: 'workspace', label: 'Select Workspace', value: 'workspace', icon: '📁', description: 'Use workspace brain data' },
          { id: 'manual', label: 'Manual Mode', value: 'manual', icon: '✍️', description: 'Generate without workspace context' },
        ],
      });
    }, 100);
  }, [addMessage]);

  return {
    messages,
    phase,
    selectedMode,
    selectedWorkspace,
    excelStructure,
    generatedTestCases,
    isLoading,
    isStreaming,
    handleModeSelect,
    handleWorkspaceSelect,
    handleExcelUpload,
    handleUserQuery,
    generateExcelDownload,
    resetFlow,
  };
};
