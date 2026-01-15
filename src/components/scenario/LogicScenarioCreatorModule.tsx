import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, RotateCcw, Sparkles, Code2, FileCode } from 'lucide-react';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useScenarioCreator } from '@/hooks/useScenarioCreator';
import ScenarioChatMessage from './ScenarioChatMessage';
import ScenarioChatInput from './ScenarioChatInput';
import type { AutomationFramework } from '@/types/scenario';

const LogicScenarioCreatorModule: React.FC = () => {
  const { workspaces, isLoading: workspacesLoading } = useWorkspaces();
  const {
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

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileCode className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              🧩 Logic Scenario Creator
              <Badge variant="secondary" className="text-xs">AI-Powered</Badge>
            </h2>
            <p className="text-xs text-muted-foreground">
              Generate automation-ready BDD-style logic scenarios
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
          
          <Button
            variant="outline"
            size="sm"
            onClick={resetFlow}
            className="ml-2"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Start Over
          </Button>
        </div>
      </div>

      {/* Chat Area */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 space-y-4 max-w-4xl mx-auto">
          {messages.map((message) => (
            <ScenarioChatMessage
              key={message.id}
              message={message}
              onFrameworkSelect={phase === 'framework_selection' ? handleFrameworkSelect : undefined}
              onWorkspaceSelect={phase === 'workspace_selection' ? handleWorkspaceSelect : undefined}
              onModuleSelect={phase === 'module_selection' ? handleModuleSelect : undefined}
            />
          ))}

          {/* Loading indicator */}
          {(isLoading || isStreaming) && phase === 'generating' && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Generating scenarios...</span>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      {(phase === 'ready_for_query' || phase === 'scenario_generated') && (
        <ScenarioChatInput
          onSend={handleUserQuery}
          disabled={isLoading || isStreaming}
          placeholder={`Ask me to generate ${selectedFramework?.toUpperCase()} scenarios for ${selectedModule}...`}
        />
      )}

      {/* Disabled input for other phases */}
      {phase !== 'ready_for_query' && phase !== 'scenario_generated' && phase !== 'generating' && (
        <div className="border-t bg-muted/50 p-4">
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
            <Sparkles className="h-4 w-4" />
            <span>Complete the setup above to start generating scenarios</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogicScenarioCreatorModule;
