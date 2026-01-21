import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AUTOMATION_FRAMEWORKS } from '@/types/scenario';
import type { ScenarioChatMessage as ChatMessageType, AutomationFramework, CodeFramework } from '@/types/scenario';
import FrameworkCard from './FrameworkCard';
import CodeFrameworkSelector from './CodeFrameworkSelector';
import CodeEditor from './CodeEditor';
import ScenarioEditor from './ScenarioEditor';

interface ScenarioChatMessageProps {
  message: ChatMessageType;
  onFrameworkSelect?: (id: AutomationFramework, name: string) => void;
  onWorkspaceSelect?: (id: string, name: string) => void;
  onModuleSelect?: (module: string) => void;
  onCodeFrameworkSelect?: (framework: CodeFramework) => void;
  onCodeAction?: (action: string) => void;
  selectedFramework?: AutomationFramework;
  selectedModule?: string;
}

const ScenarioChatMessage: React.FC<ScenarioChatMessageProps> = ({
  message,
  onFrameworkSelect,
  onWorkspaceSelect,
  onModuleSelect,
  onCodeFrameworkSelect,
  onCodeAction,
  selectedFramework,
  selectedModule,
}) => {
  const isBot = message.role === 'assistant';

  const formatContent = (content: string) => {
    // Parse markdown-like syntax
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br />');
  };

  return (
    <div className={cn(
      "flex gap-3 max-w-4xl",
      isBot ? "mr-auto" : "ml-auto flex-row-reverse"
    )}>
      <Avatar className={cn(
        "h-8 w-8 flex-shrink-0",
        isBot ? "bg-primary" : "bg-muted"
      )}>
        <AvatarFallback className={isBot ? "bg-primary text-primary-foreground" : "bg-muted"}>
          {isBot ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      <div className={cn(
        "flex flex-col gap-2 max-w-[85%]",
        !isBot && "items-end"
      )}>
        {/* Don't show card for code_display or scenario types - show editor instead */}
        {message.type !== 'code_display' && message.type !== 'scenario' && (
          <Card className={cn(
            "shadow-sm",
            isBot ? "bg-card" : "bg-primary text-primary-foreground"
          )}>
            <CardContent className="p-3">
              <div 
                className={cn(
                  "text-sm prose prose-sm max-w-none",
                  !isBot && "text-primary-foreground prose-invert"
                )}
                dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
              />
            </CardContent>
          </Card>
        )}

        {/* Scenario Display with Monaco Editor */}
        {message.type === 'scenario' && message.content && (
          <ScenarioEditor
            scenario={message.content}
            framework={selectedFramework}
            module={selectedModule}
            className="w-full min-w-[600px]"
          />
        )}

        {/* Code Display with Monaco Editor */}
        {message.type === 'code_display' && message.generatedCode && (
          <CodeEditor
            generatedCode={message.generatedCode}
            onAskAI={onCodeAction}
            className="w-full min-w-[600px]"
          />
        )}

        {/* Framework Selection Cards */}
        {message.type === 'framework_select' && onFrameworkSelect && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full mt-2">
            {AUTOMATION_FRAMEWORKS.map((framework) => (
              <FrameworkCard
                key={framework.id}
                framework={framework}
                onClick={() => onFrameworkSelect(framework.id, framework.name)}
              />
            ))}
          </div>
        )}

        {/* Code Framework Selection */}
        {message.type === 'code_framework_select' && onCodeFrameworkSelect && (
          <CodeFrameworkSelector
            onSelect={onCodeFrameworkSelect}
            className="w-full mt-2"
          />
        )}

        {/* Workspace Selection */}
        {message.type === 'workspace_select' && message.options && onWorkspaceSelect && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.options.map((option) => (
              <Button
                key={option.id}
                variant="outline"
                size="sm"
                onClick={() => onWorkspaceSelect(option.id, option.label)}
                className="text-sm"
              >
                📁 {option.label}
              </Button>
            ))}
          </div>
        )}

        {/* Module Selection */}
        {message.type === 'module_select' && message.options && onModuleSelect && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.options.map((option) => (
              <Button
                key={option.id}
                variant="outline"
                size="sm"
                onClick={() => onModuleSelect(option.value)}
                className="text-sm"
              >
                {option.label}
              </Button>
            ))}
          </div>
        )}

        <span className="text-xs text-muted-foreground">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
};

export default ScenarioChatMessage;
