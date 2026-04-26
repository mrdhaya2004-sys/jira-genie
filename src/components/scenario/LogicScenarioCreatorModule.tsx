import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, RotateCcw, FileCode, Code2 } from 'lucide-react';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useScenarioCreator } from '@/hooks/useScenarioCreator';
import ScenarioChatMessage from './ScenarioChatMessage';
import ScenarioChatInput from './ScenarioChatInput';
import HistoryPanel from '@/components/automation/HistoryPanel';
import type { AutomationFramework, CodeFramework } from '@/types/scenario';
import type { ResumeData } from '@/pages/DashboardPage';
import scenarioLogo from '@/assets/xpath-generator-logo.png';

interface LogicScenarioCreatorModuleProps {
  resumeData?: ResumeData | null;
}

const LogicScenarioCreatorModule: React.FC<LogicScenarioCreatorModuleProps> = ({ resumeData }) => {
  const { workspaces, isLoading: workspacesLoading } = useWorkspaces();
  const {
    messages,
    phase,
    selectedFramework,
    selectedWorkspace,
    selectedModule,
    selectedCodeFramework,
    generatedCode,
    isLoading,
    isStreaming,
    handleFrameworkSelect,
    handleWorkspaceSelect,
    handleModuleSelect,
    handleUserQuery,
    handleCodeFrameworkSelect,
    handleCodeAction,
    resetFlow,
    resumeFromHistory,
  } = useScenarioCreator({ workspaces, isLoadingWorkspaces: workspacesLoading });

  const scrollRef = useRef<HTMLDivElement>(null);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  useEffect(() => {
    if (resumeData && resumeData.module === 'logic-scenario-creator') {
      if (resumeData.historyLogId) {
        resumeFromHistory(resumeData.historyLogId, resumeData.prompt);
      } else {
        setPendingPrompt(resumeData.prompt);
      }
    }
  }, [resumeData]);

  const handleResumeFromPanel = (prompt: string, historyLogId?: string) => {
    if (historyLogId) {
      resumeFromHistory(historyLogId, prompt);
    } else {
      setPendingPrompt(prompt);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  const getFrameworkBadge = () => {
    if (!selectedFramework) return null;
    const frameworkNames: Record<AutomationFramework, string> = {
      cucumber: '🥒 Cucumber', testng: '☕ TestNG', playwright: '🎭 Playwright',
      pytest: '🐍 PyTest', custom: '⚙️ Custom',
    };
    return frameworkNames[selectedFramework];
  };

  const getCodeFrameworkBadge = () => {
    if (!selectedCodeFramework) return null;
    const codeFrameworkNames: Record<CodeFramework, string> = {
      selenium_java: '☕ Selenium Java', selenium_python: '🐍 Selenium Python',
      playwright_js: '🎭 Playwright JS', playwright_ts: '🎭 Playwright TS',
      cypress: '🌲 Cypress', pytest: '🧪 PyTest',
      appium_java: '📱 Appium Java', appium_python: '📱 Appium Python',
    };
    return codeFrameworkNames[selectedCodeFramework];
  };

  const isCodePhase = phase === 'code_framework_selection' || phase === 'code_generating' || phase === 'code_generated';

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg overflow-hidden bg-background ring-1 ring-border flex items-center justify-center shrink-0">
            <img src={scenarioLogo} alt="Logic Scenario Creator logo" className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold flex items-center gap-2 text-sm sm:text-base truncate">
              <span className="truncate">🧩 Logic Scenario Creator</span>
              <Badge variant="secondary" className="text-[10px] sm:text-xs hidden sm:inline-flex shrink-0">AI-Powered</Badge>
              {isCodePhase && <Badge variant="default" className="text-[10px] sm:text-xs hidden md:inline-flex shrink-0">Code Mode</Badge>}
            </h2>
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
              {isCodePhase ? 'Convert scenarios to automation code' : 'Generate automation-ready BDD-style logic scenarios'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {selectedFramework && <Badge variant="outline" className="text-xs hidden md:inline-flex">{getFrameworkBadge()}</Badge>}
          {selectedWorkspace && <Badge variant="outline" className="text-xs hidden lg:inline-flex max-w-[140px] truncate">📁 {selectedWorkspace.name}</Badge>}
          {selectedModule && <Badge variant="outline" className="text-xs hidden lg:inline-flex max-w-[120px] truncate">📦 {selectedModule}</Badge>}
          {selectedCodeFramework && <Badge variant="secondary" className="text-xs hidden md:inline-flex">{getCodeFrameworkBadge()}</Badge>}
          
          <HistoryPanel 
            toolType="scenario" 
            moduleName="logic-scenario-creator"
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
        <div className="p-4 space-y-4 max-w-5xl mx-auto">
          {messages.map((message) => (
            <ScenarioChatMessage
              key={message.id}
              message={message}
              onFrameworkSelect={phase === 'framework_selection' ? handleFrameworkSelect : undefined}
              onWorkspaceSelect={phase === 'workspace_selection' ? handleWorkspaceSelect : undefined}
              onModuleSelect={phase === 'module_selection' ? handleModuleSelect : undefined}
              onCodeFrameworkSelect={phase === 'code_framework_selection' ? handleCodeFrameworkSelect : undefined}
              onCodeAction={phase === 'code_generated' ? handleCodeAction : undefined}
              selectedFramework={selectedFramework}
              selectedModule={selectedModule}
            />
          ))}

          {(isLoading || isStreaming) && (phase === 'generating' || phase === 'code_generating') && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">
                {phase === 'code_generating' ? 'Generating automation code...' : 'Generating scenarios...'}
              </span>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      {(phase === 'ready_for_query' || phase === 'scenario_generated' || phase === 'code_generated') && (
        <ScenarioChatInput
          onSend={(msg) => { setPendingPrompt(null); (phase === 'code_generated' ? handleCodeAction : handleUserQuery)(msg); }}
          disabled={isLoading || isStreaming}
          placeholder={
            phase === 'code_generated'
              ? "Ask to refactor, explain, or modify the code..."
              : `Ask me to generate ${selectedFramework?.toUpperCase()} scenarios for ${selectedModule}...`
          }
          initialValue={pendingPrompt || undefined}
        />
      )}

      {phase !== 'ready_for_query' && phase !== 'scenario_generated' && phase !== 'generating' && phase !== 'code_framework_selection' && phase !== 'code_generating' && phase !== 'code_generated' && (
        <div className="border-t bg-muted/50 p-4">
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
            <FileCode className="h-4 w-4" />
            <span>Complete the setup above to start generating scenarios</span>
          </div>
        </div>
      )}

      {phase === 'code_framework_selection' && !isLoading && (
        <div className="border-t bg-muted/50 p-4">
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
            <Code2 className="h-4 w-4" />
            <span>Select a programming framework above to generate automation code</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogicScenarioCreatorModule;
