import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, RotateCcw, Sparkles, FileCode2 } from 'lucide-react';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useXPathGenerator } from '@/hooks/useXPathGenerator';
import XPathChatMessage from './XPathChatMessage';
import XPathChatInput from './XPathChatInput';
import HistoryPanel from '@/components/automation/HistoryPanel';
import type { Platform } from '@/types/xpath';

const XPathGeneratorModule: React.FC = () => {
  const { workspaces, isLoading: workspacesLoading } = useWorkspaces();
  const {
    messages,
    phase,
    selectedWorkspace,
    selectedModule,
    selectedPlatform,
    isLoading,
    isStreaming,
    handleWorkspaceSelect,
    handleModuleSelect,
    handlePlatformSelect,
    handleUserQuery,
    resetFlow,
  } = useXPathGenerator({ workspaces });

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
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
      <div className="border-b bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileCode2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              🧬 XPath Generator
              <Badge variant="secondary" className="text-xs">AI-Powered</Badge>
            </h2>
            <p className="text-xs text-muted-foreground">
              Generate accurate Android & iOS XPaths from DOM analysis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status badges */}
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
          {selectedPlatform && (
            <Badge variant="outline" className="text-xs">
              {getPlatformBadge()}
            </Badge>
          )}
          
          <HistoryPanel toolType="xpath" />
          
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

          {/* Loading indicator */}
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
          onSend={handleUserQuery}
          disabled={isLoading || isStreaming}
          placeholder={`Describe the element you need ${selectedPlatform === 'android' ? 'Android' : 'iOS'} XPaths for...`}
        />
      )}

      {/* Disabled input for other phases */}
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
