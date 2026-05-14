import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, RotateCcw, ClipboardList, FileSpreadsheet, Sparkles } from 'lucide-react';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useTestCaseGenerator } from '@/hooks/useTestCaseGenerator';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import ScrollToBottomButton from '@/components/common/ScrollToBottomButton';
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

  const { containerRef: scrollRef, scrollToBottom, isAtBottom } = useAutoScroll<HTMLDivElement>({
    dependencies: [messages, isStreaming, isLoading],
    enabled: true,
  });
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

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
    <div className="h-full flex flex-col bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="relative overflow-hidden border-b border-border/60 bg-gradient-to-r from-primary/10 via-card to-[hsl(var(--chart-2))]/10 dark:from-primary/15 dark:via-card dark:to-[hsl(var(--chart-2))]/15 backdrop-blur-md px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-[hsl(var(--chart-2))] to-success" />
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-[hsl(var(--chart-2))]/10 blur-3xl pointer-events-none animate-pulse" />

        <div className="relative flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="h-10 w-10 sm:h-11 sm:w-11 bg-gradient-to-br from-primary to-[hsl(var(--chart-2))] flex items-center justify-center shrink-0 shadow-primary/30 ring-1 ring-white/20 p-1.5 rounded-sm shadow-sm">
            <div className="h-full w-full rounded-sm bg-white flex items-center justify-center overflow-hidden">
              <img
                src={testCaseLogo}
                alt="Test Case Generator logo"
                loading="eager"
                decoding="async"
                fetchPriority="high"
                width={40}
                height={40}
                className="h-full w-full object-contain rounded-full"
              />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold tracking-tight flex items-center gap-2 text-sm sm:text-base truncate">
              <span className="truncate text-foreground">Test Case Generator</span>
              <Sparkles className="h-4 w-4 text-primary shrink-0 hidden sm:inline-block" />
              <Badge className="text-[10px] sm:text-xs hidden md:inline-flex shrink-0 border-0 bg-gradient-to-r from-primary to-[hsl(var(--chart-2))] text-primary-foreground shadow-sm">AI-Powered</Badge>
            </h2>
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate mt-0.5">
              Generate test cases using AI and workspace brain data
            </p>
          </div>
        </div>

        <div className="relative flex items-center gap-1.5 sm:gap-2 shrink-0">
          {selectedMode && (
            <Badge variant="outline" className="text-xs hidden md:inline-flex border-primary/40 bg-primary/10 text-foreground">{getModeLabel()}</Badge>
          )}
          {selectedWorkspace && (
            <Badge variant="outline" className="text-xs hidden lg:inline-flex max-w-[160px] truncate border-[hsl(var(--chart-2))]/40 bg-[hsl(var(--chart-2))]/10 text-foreground">📁 {selectedWorkspace.name}</Badge>
          )}
          {excelStructure && (
            <Badge variant="outline" className="text-xs hidden md:inline-flex border-success/40 bg-success/10 text-foreground">
              <FileSpreadsheet className="h-3 w-3 mr-1" />
              {excelStructure.columns.length} cols
            </Badge>
          )}

          <div className="[&_button]:relative [&_button]:bg-card/70 [&_button]:backdrop-blur-sm [&_button]:border [&_button]:border-primary/30 [&_button]:text-foreground [&_button]:shadow-sm [&_button]:transition-all [&_button]:duration-300 [&_button]:hover:bg-primary/10 [&_button]:hover:border-primary/60 [&_button]:hover:text-primary [&_button]:hover:shadow-[0_0_18px_-2px_hsl(var(--primary)/0.45)] [&_button]:hover:-translate-y-px [&_button]:active:translate-y-0 [&_button]:active:scale-[0.97] [&_button]:active:shadow-inner [&_button]:disabled:opacity-50 [&_button]:disabled:hover:translate-y-0 [&_button]:disabled:hover:shadow-none [&_button]:disabled:cursor-not-allowed">
            <HistoryPanel
              toolType="testcase"
              moduleName="test-case-generator"
              onResumePrompt={handleResumeFromPanel}
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={resetFlow}
            className="relative px-2 sm:px-3 bg-card/70 backdrop-blur-sm border-destructive/30 text-foreground shadow-sm transition-all duration-300 hover:bg-destructive/10 hover:border-destructive/60 hover:text-destructive hover:shadow-[0_0_18px_-2px_hsl(var(--destructive)/0.5)] hover:-translate-y-px active:translate-y-0 active:scale-[0.97] active:shadow-inner disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:cursor-not-allowed group"
          >
            <RotateCcw className="h-4 w-4 sm:mr-1 group-hover:-rotate-180 group-active:rotate-0 transition-transform duration-500" />
            <span className="hidden sm:inline font-medium">Start Over</span>
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
