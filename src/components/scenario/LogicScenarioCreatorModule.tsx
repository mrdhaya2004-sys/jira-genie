import React, { useRef, useEffect } from 'react';
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

const LogicScenarioCreatorModule: React.FC = () => {
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
  } = useScenarioCreator({ workspaces });

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  const getFrameworkBadge = () => {
    if (!selectedFramework) return null;
    const frameworkNames: Record<AutomationFramework, string> = {
      cucumber: '🥒 Cucumber',
      testng: '☕ TestNG',
      playwright: '🎭 Playwright',
      pytest: '🐍 PyTest',
      custom: '⚙️ Custom',
    };
    return frameworkNames[selectedFramework];
  };

  const getCodeFrameworkBadge = () => {
    if (!selectedCodeFramework) return null;
    const codeFrameworkNames: Record<CodeFramework, string> = {
      selenium_java: '☕ Selenium Java',
      selenium_python: '🐍 Selenium Python',
      playwright_js: '🎭 Playwright JS',
      playwright_ts: '🎭 Playwright TS',
      cypress: '🌲 Cypress',
      pytest: '🧪 PyTest',
      appium_java: '📱 Appium Java',
      appium_python: '📱 Appium Python',
    };
    return codeFrameworkNames[selectedCodeFramework];
  };

  const isCodePhase = phase === 'code_framework_selection' || phase === 'code_generating' || phase === 'code_generated';

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            {isCodePhase ? (
              <Code2 className="h-5 w-5 text-primary" />
            ) : (
              <FileCode className="h-5 w-5 text-primary" />
            )}
          </div>
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              🧩 Logic Scenario Creator
              <Badge variant="secondary" className="text-xs">AI-Powered</Badge>
              {isCodePhase && (
                <Badge variant="default" className="text-xs">Code Mode</Badge>
              )}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isCodePhase 
                ? 'Convert scenarios to automation code' 
                : 'Generate automation-ready BDD-style logic scenarios'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Status badges */}
          {selectedFramework && (
            <Badge variant="outline" className="text-xs">
              {getFrameworkBadge()}
            </Badge>
          )}
          {selectedWorkspace && (
            <Badge variant="outline" className="text-xs">
              📁 {selectedWorkspace.name}
            </Badge>
          )}
          {selectedModule && (
            <Badge variant="outline" className="text-xs">
              📦 {selectedModule}
            </Badge>
          )}
          {selectedCodeFramework && (
            <Badge variant="secondary" className="text-xs">
              {getCodeFrameworkBadge()}
            </Badge>
          )}
          
          <HistoryPanel toolType="scenario" />
          
          <Button
            variant="outline"
            size="sm"
            onClick={resetFlow}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Start Over
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

          {/* Loading indicator */}
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
          onSend={phase === 'code_generated' ? handleCodeAction : handleUserQuery}
          disabled={isLoading || isStreaming}
          placeholder={
            phase === 'code_generated'
              ? "Ask to refactor, explain, or modify the code..."
              : `Ask me to generate ${selectedFramework?.toUpperCase()} scenarios for ${selectedModule}...`
          }
        />
      )}

      {/* Disabled input for other phases */}
      {phase !== 'ready_for_query' && phase !== 'scenario_generated' && phase !== 'generating' && phase !== 'code_framework_selection' && phase !== 'code_generating' && phase !== 'code_generated' && (
        <div className="border-t bg-muted/50 p-4">
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
            <FileCode className="h-4 w-4" />
            <span>Complete the setup above to start generating scenarios</span>
          </div>
        </div>
      )}

      {/* Code framework selection prompt */}
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
