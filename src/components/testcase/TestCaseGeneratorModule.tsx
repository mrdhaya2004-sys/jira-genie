import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, RotateCcw, ClipboardList, FileSpreadsheet, ArrowDown } from 'lucide-react';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useTestCaseGenerator } from '@/hooks/useTestCaseGenerator';
import TestCaseChatMessage from './TestCaseChatMessage';
import TestCaseChatInput from './TestCaseChatInput';
import TemplateBuilderDialog from './TemplateBuilderDialog';
import HistoryPanel from '@/components/automation/HistoryPanel';
import type { ResumeData } from '@/pages/DashboardPage';
import testCaseLogo from '@/assets/test-case-generator-logo.webp';

interface TestCaseGeneratorModuleProps {
  resumeData?: ResumeData | null;
}

const TestCaseGeneratorModule: React.FC<TestCaseGeneratorModuleProps> = ({ resumeData }) => {
  const { workspaces, isLoading: workspacesLoading } = useWorkspaces();
  const {
    messages,
    phase,
    selectedMode,
    selectedWorkspace,
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
  } = useTestCaseGenerator({ workspaces, isLoadingWorkspaces: workspacesLoading });

  const scrollRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Resolve the actual scrollable viewport inside Radix ScrollArea
  useEffect(() => {
    if (scrollRef.current) {
      viewportRef.current = scrollRef.current.querySelector(
        '[data-radix-scroll-area-viewport]'
      ) as HTMLDivElement | null;
    }
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    const vp = viewportRef.current;
    if (!vp) return;
    vp.scrollTo({ top: vp.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  // Track user scroll to enable smart auto-scroll
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onScroll = () => {
      const distance = vp.scrollHeight - vp.scrollTop - vp.clientHeight;
      const atBottom = distance < 80;
      setAutoScroll(atBottom);
      setShowScrollButton(!atBottom);
    };
    vp.addEventListener('scroll', onScroll, { passive: true });
    return () => vp.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (resumeData && resumeData.module === 'test-case-generator') {
      if (resumeData.historyLogId) {
        resumeFromHistory(resumeData.historyLogId, resumeData.prompt);
      } else {
        setPendingPrompt(resumeData.prompt);
      }
    }
  }, [resumeData]);

  const handleResumeFromPanel = (prompt: string) => {
    setPendingPrompt(prompt);
  };

  // Auto-scroll on new messages / streaming updates when user is at bottom
  useEffect(() => {
    if (autoScroll) scrollToBottom(true);
  }, [messages, isStreaming, isLoading, autoScroll, scrollToBottom]);

  // Continuous scroll during streaming
  useEffect(() => {
    if (!isStreaming || !autoScroll) return;
    const interval = setInterval(() => scrollToBottom(false), 150);
    return () => clearInterval(interval);
  }, [isStreaming, autoScroll, scrollToBottom]);

  const getModeLabel = () => {
    if (!selectedMode) return null;
    return selectedMode === 'workspace' ? '📁 Workspace Mode' : '✍️ Manual Mode';
  };

  const inputEnabled = phase === 'ready_for_query' || phase === 'completed';
  const showUploadButton = phase === 'ready_for_query' && !excelStructure;

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="border-b border-border/60 bg-card/50 backdrop-blur-sm px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-white flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-border/50">
            <img
              src={testCaseLogo}
              alt="Test Case Generator logo"
              loading="eager"
              decoding="async"
              fetchPriority="high"
              width={40}
              height={40}
              className="h-full w-full object-contain"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold tracking-tight flex items-center gap-2 text-sm sm:text-base truncate">
              <span className="truncate">Test Case Generator</span>
              <Badge variant="secondary" className="text-[10px] sm:text-xs hidden sm:inline-flex shrink-0">AI-Powered</Badge>
            </h2>
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
              Generate test cases using AI and workspace brain data
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {selectedMode && (
            <Badge variant="outline" className="text-xs hidden md:inline-flex">{getModeLabel()}</Badge>
          )}
          {selectedWorkspace && (
            <Badge variant="outline" className="text-xs hidden lg:inline-flex max-w-[160px] truncate">📁 {selectedWorkspace.name}</Badge>
          )}
          {excelStructure && (
            <Badge variant="outline" className="text-xs hidden md:inline-flex">
              <FileSpreadsheet className="h-3 w-3 mr-1" />
              {excelStructure.columns.length} cols
            </Badge>
          )}
          
          <HistoryPanel 
            toolType="testcase" 
            moduleName="test-case-generator"
            onResumePrompt={handleResumeFromPanel}
          />
          
          <Button variant="outline" size="sm" onClick={resetFlow} className="px-2 sm:px-3">
            <RotateCcw className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Start Over</span>
          </Button>
        </div>
      </div>

      <div className="relative flex-1 min-h-0">
        <ScrollArea className="h-full" ref={scrollRef}>
          <div className="p-4 space-y-4 max-w-4xl mx-auto">
            {messages.map((message) => (
              <TestCaseChatMessage
                key={message.id}
                message={message}
                onModeSelect={phase === 'initial' ? handleModeSelect : undefined}
                onWorkspaceSelect={phase === 'workspace_selection' ? handleWorkspaceSelect : undefined}
                onFormatSelect={phase === 'format_selection' ? handleFormatSelect : undefined}
                onDownload={message.type === 'download' ? generateExcelDownload : undefined}
                gridStructure={message.type === 'grid_editor' ? excelStructure : undefined}
                gridRows={message.type === 'grid_editor' ? generatedTestCases : undefined}
                onGridDownload={message.type === 'grid_editor' ? downloadAsExcel : undefined}
              />
            ))}

            {(isLoading || isStreaming) && phase === 'generating' && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Generating test cases...</span>
              </div>
            )}
          </div>
        </ScrollArea>

        {showScrollButton && (
          <Button
            size="icon"
            variant="secondary"
            onClick={() => { setAutoScroll(true); scrollToBottom(true); }}
            className="absolute bottom-4 right-6 h-9 w-9 rounded-full shadow-lg border border-border/60 z-10 animate-fade-in"
            aria-label="Scroll to bottom"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        )}
      </div>

      <TemplateBuilderDialog
        open={templateBuilderOpen}
        onOpenChange={setTemplateBuilderOpen}
        onConfirm={handleTemplateConfirm}
      />

      {inputEnabled && (
        <TestCaseChatInput
          onSend={(msg) => { setPendingPrompt(null); handleUserQuery(msg); }}
          onExcelUpload={handleExcelUpload}
          disabled={isLoading || isStreaming}
          placeholder="Ask me to generate test cases..."
          showExcelUpload={showUploadButton}
          initialValue={pendingPrompt || undefined}
        />
      )}

      {!inputEnabled && phase !== 'generating' && (
        <div className="border-t bg-muted/50 p-4">
          <p className="text-sm text-muted-foreground text-center">
            {phase === 'initial' 
              ? 'Please select a mode to continue' 
              : phase === 'workspace_selection'
              ? 'Please select a workspace to continue'
              : phase === 'format_selection'
              ? 'Please choose a format to continue'
              : phase === 'template_building'
              ? 'Build your template in the dialog to continue'
              : 'Complete the current step to continue'}
          </p>
        </div>
      )}
    </div>
  );
};

export default TestCaseGeneratorModule;
