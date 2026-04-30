import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, RotateCcw, Sparkles } from 'lucide-react';
import xpathLogo from '@/assets/xpath-logo.png';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useXPathGenerator } from '@/hooks/useXPathGenerator';
import XPathChatMessage from './XPathChatMessage';
import XPathChatInput from './XPathChatInput';
import HistoryPanel from '@/components/automation/HistoryPanel';
import EnvironmentSelector from '@/components/workspace/EnvironmentSelector';
import type { Platform } from '@/types/xpath';
import type { ResumeData } from '@/pages/DashboardPage';

interface XPathGeneratorModuleProps {
  resumeData?: ResumeData | null;
}

const XPathGeneratorModule: React.FC<XPathGeneratorModuleProps> = ({ resumeData }) => {
  const { workspaces, isLoading: workspacesLoading } = useWorkspaces();
  const {
    messages,
    phase,
    selectedWorkspace,
    selectedModule,
    selectedPlatform,
    selectedEnvironment,
    setSelectedEnvironment,
    isLoading,
    isStreaming,
    handleWorkspaceSelect,
    handleModuleSelect,
    handlePlatformSelect,
    handleUserQuery,
    resetFlow,
    resumeFromHistory,
  } = useXPathGenerator({ workspaces, isLoadingWorkspaces: workspacesLoading });

  const scrollRef = useRef<HTMLDivElement>(null);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  useEffect(() => {
    if (resumeData && resumeData.module === 'xpath-generator') {
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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  const getPlatformBadge = () => {
    if (!selectedPlatform) return null;
    return selectedPlatform === 'android' ? '🤖 Android' : '🍎 iOS';
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <img src={xpathLogo} alt="XPath Generator" className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg object-contain shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold flex items-center gap-2 text-sm sm:text-base truncate">
              <span className="truncate">🧬 XPath Generator</span>
              <Badge variant="secondary" className="text-[10px] sm:text-xs hidden sm:inline-flex shrink-0">AI-Powered</Badge>
            </h2>
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
              Generate accurate Android & iOS XPaths from DOM analysis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {selectedWorkspace && <Badge variant="outline" className="text-xs hidden lg:inline-flex max-w-[140px] truncate">📁 {selectedWorkspace.name}</Badge>}
          {selectedModule && <Badge variant="outline" className="text-xs hidden lg:inline-flex max-w-[120px] truncate">📦 {selectedModule}</Badge>}
          {selectedPlatform && <Badge variant="outline" className="text-xs hidden md:inline-flex">{getPlatformBadge()}</Badge>}

          {selectedWorkspace && (
            <EnvironmentSelector
              value={selectedEnvironment}
              onChange={setSelectedEnvironment}
              size="sm"
              showLabel={false}
              className="hidden md:flex"
            />
          )}

          <HistoryPanel 
            toolType="xpath" 
            moduleName="xpath-generator"
            onResumePrompt={handleResumeFromPanel}
          />
          
          <Button variant="outline" size="sm" onClick={resetFlow} className="px-2 sm:px-3">
            <RotateCcw className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Start Over</span>
          </Button>
        </div>
      </div>

      {/* Chat Area */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 space-y-4 max-w-4xl mx-auto">
          {messages.map((message) => (
            <XPathChatMessage
              key={message.id}
              message={message}
              onWorkspaceSelect={phase === 'workspace_selection' ? handleWorkspaceSelect : undefined}
              onModuleSelect={phase === 'module_selection' ? handleModuleSelect : undefined}
              onPlatformSelect={phase === 'platform_selection' ? handlePlatformSelect : undefined}
            />
          ))}

          {(isLoading || isStreaming) && phase === 'generating' && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Generating XPaths...</span>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      {(phase === 'ready_for_query' || phase === 'xpath_generated') && (
        <XPathChatInput
          onSend={(msg) => { setPendingPrompt(null); handleUserQuery(msg); }}
          disabled={isLoading || isStreaming}
          placeholder={`Describe the element you need ${selectedPlatform === 'android' ? 'Android' : 'iOS'} XPaths for...`}
          initialValue={pendingPrompt || undefined}
        />
      )}

      {phase !== 'ready_for_query' && phase !== 'xpath_generated' && phase !== 'generating' && (
        <div className="border-t bg-muted/50 p-4">
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
            <Sparkles className="h-4 w-4" />
            <span>Complete the setup above to start generating XPaths</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default XPathGeneratorModule;
