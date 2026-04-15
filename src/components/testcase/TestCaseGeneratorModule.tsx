import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, RotateCcw, FileSpreadsheet } from 'lucide-react';
import testcaseLogo from '@/assets/testcase-logo.png';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useTestCaseGenerator } from '@/hooks/useTestCaseGenerator';
import TestCaseChatMessage from './TestCaseChatMessage';
import TestCaseChatInput from './TestCaseChatInput';
import HistoryPanel from '@/components/automation/HistoryPanel';
import type { ResumeData } from '@/pages/DashboardPage';

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
    isLoading,
    isStreaming,
    handleModeSelect,
    handleWorkspaceSelect,
    handleExcelUpload,
    handleUserQuery,
    generateExcelDownload,
    resetFlow,
    resumeFromHistory,
  } = useTestCaseGenerator({ workspaces, isLoadingWorkspaces: workspacesLoading });

  const scrollRef = useRef<HTMLDivElement>(null);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  // Handle resume from history with episodic memory
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

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  const getModeLabel = () => {
    if (!selectedMode) return null;
    return selectedMode === 'workspace' ? '📁 Workspace Mode' : '✍️ Manual Mode';
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border/60 bg-card/50 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={testcaseLogo} alt="Test Case Generator" className="h-10 w-10 object-contain rounded-none shadow-none border-0 border-none" />
          <div>
            <h2 className="font-semibold tracking-tight flex items-center gap-2">
              Test Case Generator
              <Badge variant="secondary" className="text-xs">AI-Powered</Badge>
            </h2>
            <p className="text-xs text-muted-foreground">
              Generate test cases using AI and workspace brain data
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedMode && (
            <Badge variant="outline" className="text-xs">{getModeLabel()}</Badge>
          )}
          {selectedWorkspace && (
            <Badge variant="outline" className="text-xs">📁 {selectedWorkspace.name}</Badge>
          )}
          {excelStructure && (
            <Badge variant="outline" className="text-xs">
              <FileSpreadsheet className="h-3 w-3 mr-1" />
              {excelStructure.columns.length} columns
            </Badge>
          )}
          
          <HistoryPanel 
            toolType="testcase" 
            moduleName="test-case-generator"
            onResumePrompt={handleResumeFromPanel}
          />
          
          <Button variant="outline" size="sm" onClick={resetFlow}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Start Over
          </Button>
        </div>
      </div>

      {/* Chat Area */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 space-y-4 max-w-4xl mx-auto">
          {messages.map((message) => (
            <TestCaseChatMessage
              key={message.id}
              message={message}
              onModeSelect={phase === 'initial' ? handleModeSelect : undefined}
              onWorkspaceSelect={phase === 'workspace_selection' ? handleWorkspaceSelect : undefined}
              onDownload={message.type === 'download' ? generateExcelDownload : undefined}
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

      {/* Input Area */}
      {(phase === 'ready_for_query' || phase === 'completed') && (
        <TestCaseChatInput
          onSend={(msg) => { setPendingPrompt(null); handleUserQuery(msg); }}
          onExcelUpload={handleExcelUpload}
          disabled={isLoading || isStreaming}
          placeholder="Ask me to generate test cases..."
          showExcelUpload={true}
          initialValue={pendingPrompt || undefined}
        />
      )}

      {phase !== 'ready_for_query' && phase !== 'completed' && phase !== 'generating' && (
        <div className="border-t bg-muted/50 p-4">
          <p className="text-sm text-muted-foreground text-center">
            {phase === 'initial' 
              ? 'Please select a mode to continue' 
              : phase === 'workspace_selection'
              ? 'Please select a workspace to continue'
              : 'Complete the current step to continue'}
          </p>
        </div>
      )}
    </div>
  );
};

export default TestCaseGeneratorModule;
