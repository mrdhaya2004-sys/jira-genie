import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useHistoryLogs } from '@/hooks/useHistoryLogs';
import { useEpisodicMemory, Episode } from '@/hooks/useEpisodicMemory';
import { automationHistoryService } from '@/lib/automationHistory';
import { useEnvironmentContext } from '@/hooks/useEnvironmentContext';
import { getRememberedEnv, rememberEnv, getEnvironmentMeta, type Environment } from '@/types/environment';
import * as XLSX from 'xlsx';
import type { Workspace } from '@/types/workspace';
import type {
  TestCaseFlowPhase,
  TestCaseMode,
  TestCaseFormatChoice,
  TestCaseChatMessage,
  ParsedExcelStructure,
  GeneratedTestCase,
} from '@/types/testcase';

interface UseTestCaseGeneratorOptions {
  workspaces: Workspace[];
  isLoadingWorkspaces?: boolean;
}

const normalizeKey = (s: string): string =>
  String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

/**
 * Salvage parser for partial/streamed JSON arrays.
 * Walks character-by-character, tracks string + bracket state, and extracts
 * every COMPLETE top-level object inside the first `[ ... ` it finds.
 * Tolerates truncated trailing objects and missing closing `]`.
 */
const salvageObjectsFromArray = (raw: string): any[] => {
  const startArr = raw.indexOf('[');
  if (startArr === -1) return [];
  const out: any[] = [];

  let i = startArr + 1;
  let inString = false;
  let escape = false;
  let depth = 0;
  let objStart = -1;

  while (i < raw.length) {
    const ch = raw[i];

    if (inString) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === '"') inString = false;
      i++;
      continue;
    }

    if (ch === '"') { inString = true; i++; continue; }
    if (ch === '{') {
      if (depth === 0) objStart = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && objStart !== -1) {
        const slice = raw.slice(objStart, i + 1);
        const cleaned = slice
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/^\s*\/\/.*$/gm, '')
          .replace(/,\s*([}\]])/g, '$1');
        try {
          out.push(JSON.parse(cleaned));
        } catch {
          try {
            out.push(JSON.parse(cleaned.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"')));
          } catch { /* skip malformed object */ }
        }
        objStart = -1;
      }
    } else if (ch === ']' && depth === 0) {
      break;
    }
    i++;
  }
  return out;
};

const extractJsonArray = (raw: string): any[] | null => {
  if (!raw) return null;
  const candidates: string[] = [];

  const jsonFenceRe = /```json\s*([\s\S]*?)```/gi;
  let m: RegExpExecArray | null;
  while ((m = jsonFenceRe.exec(raw)) !== null) candidates.push(m[1]);

  const anyFenceRe = /```\s*([\s\S]*?)```/g;
  while ((m = anyFenceRe.exec(raw)) !== null) candidates.push(m[1]);

  // Strip leading ```json fence if present (common with truncated streams missing closing ```)
  const stripped = raw.replace(/^[\s\S]*?```json\s*/i, '').replace(/```[\s\S]*$/, '');
  if (stripped && stripped !== raw) candidates.push(stripped);

  const firstBracket = raw.indexOf('[');
  const lastBracket = raw.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    candidates.push(raw.slice(firstBracket, lastBracket + 1));
  }
  candidates.push(raw);

  // Strict pass: try to parse each candidate as-is
  for (const c of candidates) {
    const cleaned = c
      .trim()
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
      .replace(/,\s*([}\]])/g, '$1')
      .trim();

    const s = cleaned.indexOf('[');
    const e = cleaned.lastIndexOf(']');
    const slice = s !== -1 && e > s ? cleaned.slice(s, e + 1) : cleaned;

    try {
      const parsed = JSON.parse(slice);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === 'object') return [parsed];
    } catch {
      try {
        const requoted = slice.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"');
        const parsed = JSON.parse(requoted);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === 'object') return [parsed];
      } catch { /* fall through to salvage */ }
    }
  }

  // Salvage pass: extract whatever complete objects we can from a truncated array
  const salvaged = salvageObjectsFromArray(raw);
  if (salvaged.length > 0) {
    console.info(`[testcase] Salvaged ${salvaged.length} object(s) from partial JSON.`);
    return salvaged;
  }
  return null;
};

const mapRowToSchema = (
  row: any,
  columns: ParsedExcelStructure['columns'],
): GeneratedTestCase => {
  const out: GeneratedTestCase = {};
  if (!row || typeof row !== 'object') {
    columns.forEach(c => { out[c.key] = ''; });
    return out;
  }
  const rowIndex: Record<string, any> = {};
  Object.keys(row).forEach(k => { rowIndex[normalizeKey(k)] = row[k]; });

  columns.forEach(col => {
    const candidates = [col.key, col.header, col.header.toLowerCase()];
    let value: any = undefined;
    for (const cand of candidates) {
      const nk = normalizeKey(cand);
      if (nk in rowIndex) { value = rowIndex[nk]; break; }
    }
    if (value === undefined) value = '';
    if (Array.isArray(value)) {
      value = value
        .map(v => (typeof v === 'string' ? v : JSON.stringify(v)))
        .map((v, i) => (/^\s*\d+[.)]/.test(v) ? v : `${i + 1}. ${v}`))
        .join('\n');
    } else if (value && typeof value === 'object') {
      value = JSON.stringify(value);
    }
    out[col.key] = String(value ?? '');
  });
  return out;
};

const extractTestCasesFromAIResponse = (
  raw: string,
  structure: ParsedExcelStructure,
): GeneratedTestCase[] => {
  const arr = extractJsonArray(raw);
  if (!arr) return [];
  return arr
    .filter(r => r && typeof r === 'object')
    .map(r => mapRowToSchema(r, structure.columns));
};

export const useTestCaseGenerator = ({ workspaces, isLoadingWorkspaces = false }: UseTestCaseGeneratorOptions) => {
  const { toast } = useToast();
  const { addLog } = useHistoryLogs();
  const { saveEpisodePair, loadEpisodes, buildConversationContext, getNextTurnIndex } = useEpisodicMemory();
  const [messages, setMessages] = useState<TestCaseChatMessage[]>([]);
  const [phase, setPhase] = useState<TestCaseFlowPhase>('initial');
  const [selectedMode, setSelectedMode] = useState<TestCaseMode | null>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [workspaceFiles, setWorkspaceFiles] = useState<any[]>([]);
  const [excelStructure, setExcelStructure] = useState<ParsedExcelStructure | null>(null);
  const [generatedTestCases, setGeneratedTestCases] = useState<GeneratedTestCase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeHistoryLogId, setActiveHistoryLogId] = useState<string | null>(null);
  const [episodicContext, setEpisodicContext] = useState<Array<{ role: string; content: string }>>([]);
  const [selectedEnvironment, setSelectedEnvironmentState] = useState<Environment | null>(null);
  const { loadContext } = useEnvironmentContext();

  const setSelectedEnvironment = useCallback((env: Environment) => {
    if (selectedWorkspace) rememberEnv(selectedWorkspace.id, env);
    setSelectedEnvironmentState(env);
  }, [selectedWorkspace]);

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

  // Reactively update workspace list when loading completes and user is in workspace_selection phase
  useEffect(() => {
    if (isLoadingWorkspaces || phase !== 'workspace_selection') return;
    
    // Check if there's a "Loading workspaces" or "No workspaces found" message that needs updating
    const hasStaleMsg = messages.some(m => 
      m.role === 'assistant' && (
        m.content.includes('Loading workspaces') || 
        m.content.includes('No workspaces found')
      )
    );
    if (!hasStaleMsg) return;

    // Remove stale messages
    setMessages(prev => prev.filter(m => 
      !(m.role === 'assistant' && (
        m.content.includes('Loading workspaces') ||
        m.content.includes('No workspaces found')
      ))
    ));

    if (workspaces.length === 0) {
      addMessage({
        role: 'assistant',
        content: "⚠️ **No workspaces found.** Please create a workspace in the **Hive AI – Core Workspace** module first, or switch to Manual Mode.",
        type: 'text',
      });
    } else {
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
    }
  }, [workspaces, isLoadingWorkspaces, phase]);

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
      
      if (isLoadingWorkspaces) {
        addMessage({
          role: 'assistant',
          content: "⏳ Loading workspaces, please wait...",
          type: 'text',
        });
        return;
      }

      if (workspaces.length === 0) {
        addMessage({
          role: 'assistant',
          content: "⚠️ **No workspaces found.** Please create a workspace in the **Hive AI – Core Workspace** module first, or switch to Manual Mode.",
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
      promptFormatSelection('manual');
    }
  }, [workspaces, isLoadingWorkspaces, addMessage]);

  const handleWorkspaceSelect = useCallback(async (workspaceId: string, workspaceName: string) => {
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (!workspace) return;

    setSelectedWorkspace(workspace);
    const remembered = getRememberedEnv(workspace.id);
    const def = (workspace.default_environment as Environment) || null;
    setSelectedEnvironmentState(remembered || def || null);
    
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
      content: `Workspace **${workspaceName}** loaded successfully!\n\n📊 **Brain Data:**\n- ${userStoryCount} user stor${userStoryCount === 1 ? 'y' : 'ies'}\n- ${appFileCount} application file${appFileCount === 1 ? '' : 's'}`,
      type: 'text',
    });

    promptFormatSelection('workspace');
  }, [workspaces, fetchWorkspaceFiles, addMessage]);

  const promptFormatSelection = useCallback((_mode: TestCaseMode) => {
    setPhase('format_selection');
    addMessage({
      role: 'assistant',
      content: 'How would you like to format the test cases?',
      type: 'format_select',
      options: [
        { id: 'create_template', label: 'Create Template', value: 'create_template', icon: '🧩', description: 'Build columns inside the app' },
        { id: 'upload_excel', label: 'Upload Excel', value: 'upload_excel', icon: '📎', description: 'Use a reference .xlsx file' },
        { id: 'skip', label: 'Skip (AI default)', value: 'skip', icon: '⚡', description: 'Let AI choose the format' },
      ],
    });
  }, [addMessage]);

  const [templateBuilderOpen, setTemplateBuilderOpen] = useState(false);

  const handleFormatSelect = useCallback((choice: TestCaseFormatChoice) => {
    addMessage({
      role: 'user',
      content: choice === 'create_template' ? '🧩 Create Template' : choice === 'upload_excel' ? '📎 Upload Excel' : '⚡ Skip (AI default)',
      type: 'text',
    });

    if (choice === 'create_template') {
      setPhase('template_building');
      setTemplateBuilderOpen(true);
    } else if (choice === 'upload_excel') {
      setPhase('ready_for_query');
      addMessage({
        role: 'assistant',
        content: 'Click the upload button below to attach your reference Excel file, then describe the test cases you need.',
        type: 'text',
      });
    } else {
      setExcelStructure(null);
      setPhase('ready_for_query');
      addMessage({
        role: 'assistant',
        content: 'Got it — I\'ll use a default format.\n\n**Examples:**\n- "Generate 5 test cases for login functionality"\n- "Create negative test cases for user registration"',
        type: 'text',
      });
    }
  }, [addMessage]);

  const handleTemplateConfirm = useCallback((structure: ParsedExcelStructure) => {
    setExcelStructure(structure);
    setTemplateBuilderOpen(false);
    setPhase('ready_for_query');
    addMessage({
      role: 'assistant',
      content: `✅ **Your test case format is ready.**\n\nColumns (${structure.columns.length}): ${structure.columns.map(c => c.header).join(', ')}\n\nNow describe the test cases you'd like me to generate, and I'll produce them in this exact structure.`,
      type: 'text',
      excelStructure: structure,
    });
  }, [addMessage]);

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

    // Pre-generation guard: block only when the selected workspace has no usable brain source at all.
    // Uploaded user-story documents and APK/IPA files are valid brain sources even if extraction metadata is still sparse.
    if (selectedMode === 'workspace' && selectedWorkspace) {
      const MIN_TEXT_LEN = 10;
      const supportedBrainExtensions = ['.pdf', '.doc', '.docx', '.txt', '.md', '.csv', '.json', '.apk', '.ipa'];

      const hasUsableText = (f: any): boolean => {
        const text = typeof f?.content_extracted === 'string' ? f.content_extracted.trim() : '';
        return text.length >= MIN_TEXT_LEN;
      };

      const hasUsableMetadata = (f: any): boolean => {
        const meta = f?.metadata;
        if (!meta || typeof meta !== 'object') return false;
        const signals = [
          meta.package_name, meta.packageName, meta.bundle_id, meta.bundleId,
          meta.app_name, meta.appName, meta.version, meta.version_name, meta.versionName,
          meta.activities, meta.screens, meta.permissions, meta.manifest,
          meta.dom, meta.ui_elements, meta.uiElements, meta.elements,
          meta.ocr_text, meta.ocrText, meta.text, meta.pages,
        ];
        return signals.some(v =>
          (typeof v === 'string' && v.trim().length >= MIN_TEXT_LEN) ||
          (Array.isArray(v) && v.length > 0) ||
          (v && typeof v === 'object' && Object.keys(v).length > 0)
        );
      };

      const isSupportedBrainUpload = (f: any): boolean => {
        const type = String(f?.file_type || '').toLowerCase();
        const name = String(f?.file_name || '').toLowerCase();
        return ['user_story', 'apk', 'ipa'].includes(type) || supportedBrainExtensions.some(ext => name.endsWith(ext));
      };

      const hasBrainSource = workspaceFiles.some(f =>
        hasUsableText(f) || hasUsableMetadata(f) || isSupportedBrainUpload(f)
      );

      if (!hasBrainSource) {
        const fileSummary = workspaceFiles.length === 0
          ? 'No files have been uploaded to this workspace yet.'
          : `Found ${workspaceFiles.length} file(s), but none are supported brain files and none contain extracted content.`;

        addMessage({
          role: 'assistant',
          content: `⚠️ **Cannot generate test cases — workspace lacks usable brain data.**\n\nWorkspace **${selectedWorkspace.name}**: ${fileSummary}\n\nPlease upload a user story document, APK/IPA, DOM/UI file, screenshot OCR output, or parsed metadata in **Hive AI – Core Workspace**, then retry.`,
          type: 'text',
        });
        setPhase('ready_for_query');
        return;
      }
    }

    // Environment validation (workspace mode only)
    let envCtx: { hasBuild: boolean; domContent?: string; build?: any } = { hasBuild: false };
    let envMetaLabel: string | undefined;
    if (selectedMode === 'workspace' && selectedWorkspace) {
      if (!selectedEnvironment) {
        addMessage({
          role: 'assistant',
          content: '⚠️ **Please select an environment** (DEV / UAT / BETA / PROD) from the header before generating test cases.',
          type: 'text',
        });
        setPhase('ready_for_query');
        return;
      }
      envCtx = await loadContext(selectedWorkspace.id, selectedEnvironment);
      envMetaLabel = getEnvironmentMeta(selectedEnvironment)?.label;
      if (!envCtx.hasBuild && !envCtx.domContent) {
        addMessage({
          role: 'assistant',
          content: `❌ **No build available for selected environment** (${envMetaLabel}).\n\nUpload a build or paste a DOM snapshot in the workspace **Environments** tab.`,
          type: 'text',
        });
        setPhase('ready_for_query');
        return;
      }
    }

    setPhase('generating');
    setIsLoading(true);
    setIsStreaming(true);

    try {
      // Get user's auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Please log in to generate test cases');
      }

      // Prepare workspace brain — extracted text plus uploaded app/document inventory.
      const userStories = workspaceFiles
        .filter(f => f.file_type === 'user_story')
        .map(f => {
          const extracted = typeof f.content_extracted === 'string' && f.content_extracted.trim()
            ? f.content_extracted.trim()
            : 'Uploaded user story document is available, but extracted text is not stored yet. Use the filename as the only available document signal.';
          return `### User Story Document: ${f.file_name}\n${extracted}`;
        })
        .join('\n\n');

      const extractedContext = workspaceFiles
        .filter(f => f.file_type !== 'user_story' && f.content_extracted)
        .map(f => `### ${String(f.file_type).toUpperCase()} — ${f.file_name}\n${f.content_extracted}`)
        .join('\n\n');

      const appFiles = workspaceFiles.filter(f => ['apk', 'ipa'].includes(String(f.file_type).toLowerCase()));
      const appFileContext = appFiles.length > 0
        ? `### Uploaded Application Files\n${appFiles.map(f => `- ${f.file_name} (${String(f.file_type).toUpperCase()})`).join('\n')}`
        : '';

      const metadataContext = workspaceFiles
        .filter(f => f.metadata && typeof f.metadata === 'object' && Object.keys(f.metadata).length > 0)
        .map(f => `### Parsed Metadata — ${f.file_name}\n${JSON.stringify(f.metadata, null, 2)}`)
        .join('\n\n');

      const domContext = envCtx.domContent
        ? `### DOM Snapshot — ${envMetaLabel}\n${envCtx.domContent}`
        : '';

      const combinedContext = [userStories, extractedContext, appFileContext, metadataContext, domContext].filter(Boolean).join('\n\n');

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
              userStories: combinedContext,
              excelStructure,
              environment: selectedEnvironment,
              environmentLabel: envMetaLabel,
              domSnapshot: envCtx.domContent || null,
              buildName: envCtx.build?.file_name || null,
            },
            episodicMemory: episodicContext.length > 0 ? episodicContext : undefined,
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

      // Ensure we have a structure (default if user skipped template/upload)
      const defaultStructure: ParsedExcelStructure = {
        sheetName: 'Test Cases',
        sampleRows: [],
        columns: [
          { key: 'title', header: 'Title', index: 0 },
          { key: 'preconditions', header: 'Preconditions', index: 1 },
          { key: 'steps', header: 'Steps', index: 2 },
          { key: 'expected_result', header: 'Expected Result', index: 3 },
          { key: 'priority', header: 'Priority', index: 4 },
          { key: 'type', header: 'Type', index: 5 },
        ],
      };
      const activeStructure = excelStructure || defaultStructure;
      if (!excelStructure) setExcelStructure(defaultStructure);

      // Robustly parse generated test cases from the response
      const parsedRows: GeneratedTestCase[] = extractTestCasesFromAIResponse(fullContent, activeStructure);
      if (parsedRows.length === 0) {
        console.warn('Test case extraction returned no rows. Raw content:', fullContent.slice(0, 500));
      }

      setGeneratedTestCases(parsedRows);
      setPhase('completed');

      // Save to local history
      automationHistoryService.addEntry({
        toolType: 'testcase',
        title: query.slice(0, 50) + (query.length > 50 ? '...' : ''),
        summary: `Generated ${parsedRows.length} test cases${selectedWorkspace ? ` for ${selectedWorkspace.name}` : ''}`,
        metadata: { workspace: selectedWorkspace?.name },
      });

      // Save to persistent history and get log ID
      let logId = activeHistoryLogId;
      if (!logId) {
        logId = await addLog({
          module_name: 'test-case-generator',
          action_type: 'generate',
          input_prompt: query,
          output_summary: `Generated ${parsedRows.length} test cases${selectedWorkspace ? ` for ${selectedWorkspace.name}` : ' in manual mode'}`,
          workspace_id: selectedWorkspace?.id,
        }) || null;
        if (logId) setActiveHistoryLogId(logId);
      }

      // Save episode pair
      if (logId) {
        const turnIdx = await getNextTurnIndex(logId);
        await saveEpisodePair({
          historyLogId: logId,
          moduleName: 'test-case-generator',
          userPrompt: query,
          aiResponse: fullContent,
          turnIndex: turnIdx,
          workspaceId: selectedWorkspace?.id,
        });
        setEpisodicContext(prev => [...prev, { role: 'user', content: query }, { role: 'assistant', content: fullContent }]);
      }

      // Always show the editable grid + download UI
      addMessage({
        role: 'assistant',
        content: parsedRows.length > 0
          ? `✅ Generated **${parsedRows.length} test case${parsedRows.length === 1 ? '' : 's'}**. Edit any cell, add or remove rows, then download as Excel.`
          : '⚠️ I couldn\'t auto-extract structured rows from the AI response. You can add rows manually below and download as Excel.',
        type: 'grid_editor',
      });

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

  const downloadAsExcel = useCallback((rows: GeneratedTestCase[]) => {
    if (!excelStructure) return;
    const wb = XLSX.utils.book_new();
    const wsData = [
      excelStructure.columns.map(c => c.header),
      ...rows.map(tc => excelStructure.columns.map(c => tc[c.key] || '')),
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, excelStructure.sheetName || 'Test Cases');
    const fileName = `test_cases_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast({
      title: 'Download Complete',
      description: `${rows.length} test cases exported to ${fileName}`,
    });
  }, [excelStructure, toast]);

  const generateExcelDownload = useCallback(() => {
    if (generatedTestCases.length === 0 || !excelStructure) {
      toast({
        title: 'No test cases',
        description: 'Please generate test cases first.',
        variant: 'destructive',
      });
      return;
    }
    downloadAsExcel(generatedTestCases);
  }, [generatedTestCases, excelStructure, toast, downloadAsExcel]);

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
    setActiveHistoryLogId(null);
    setEpisodicContext([]);
    setTemplateBuilderOpen(false);

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

  /**
   * Resume a previous conversation by loading episodes from a history log
   */
  const resumeFromHistory = useCallback(async (historyLogId: string, initialPrompt: string) => {
    setIsLoading(true);
    try {
      const episodes = await loadEpisodes(historyLogId);
      
      if (episodes.length > 0) {
        // Rebuild conversation context
        const context = buildConversationContext(episodes);
        setEpisodicContext(context);
        setActiveHistoryLogId(historyLogId);
        
        // Set up the module in manual mode ready for query
        setSelectedMode('manual');
        setPhase('ready_for_query');
        setMessages([]);
        
        // Rebuild chat messages from episodes
        const rebuiltMessages: TestCaseChatMessage[] = [];
        rebuiltMessages.push({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '🔄 **Resumed from previous session.** Here\'s your conversation history:',
          type: 'text',
          timestamp: new Date().toISOString(),
        });
        
        for (const ep of episodes) {
          rebuiltMessages.push({
            id: crypto.randomUUID(),
            role: ep.role as 'user' | 'assistant',
            content: ep.content,
            type: 'text',
            timestamp: ep.created_at,
          });
        }

        rebuiltMessages.push({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '✅ **Context loaded.** You can continue the conversation from where you left off.',
          type: 'text',
          timestamp: new Date().toISOString(),
        });

        setMessages(rebuiltMessages);
      } else {
        // No episodes found, just set the prompt
        setSelectedMode('manual');
        setPhase('ready_for_query');
        setMessages([{
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `🔄 Resuming previous session. Your last prompt was:\n\n> ${initialPrompt}\n\nYou can continue or ask a new question.`,
          type: 'text',
          timestamp: new Date().toISOString(),
        }]);
      }
    } catch (error) {
      console.error('Error resuming from history:', error);
    } finally {
      setIsLoading(false);
    }
  }, [loadEpisodes, buildConversationContext, addMessage]);

  return {
    messages,
    phase,
    selectedMode,
    selectedWorkspace,
    selectedEnvironment,
    setSelectedEnvironment,
    excelStructure,
    generatedTestCases,
    isLoading,
    isStreaming,
    templateBuilderOpen,
    setTemplateBuilderOpen,
    handleModeSelect,
    handleWorkspaceSelect,
    handleFormatSelect,
    handleTemplateConfirm,
    handleExcelUpload,
    handleUserQuery,
    generateExcelDownload,
    downloadAsExcel,
    resetFlow,
    resumeFromHistory,
  };
};
