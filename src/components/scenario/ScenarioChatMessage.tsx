import React from 'react';
import DOMPurify from 'dompurify';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import HiveAIAvatar from '@/components/ai/HiveAIAvatar';
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
  selectedWorkspaceId?: string;
  selectedModule?: string;
  selectedCodeFramework?: CodeFramework | null;
}

const ScenarioChatMessage: React.FC<ScenarioChatMessageProps> = ({
  message,
  onFrameworkSelect,
  onWorkspaceSelect,
  onModuleSelect,
  onCodeFrameworkSelect,
  onCodeAction,
  selectedFramework,
  selectedWorkspaceId,
  selectedModule,
  selectedCodeFramework,
}) => {
  const isBot = message.role === 'assistant';

  const sanitizeConfig = {
    ALLOWED_TAGS: ['strong', 'br', 'em'],
    ALLOWED_ATTR: [],
  };

  const formatContent = (content: string) => {
    const html = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br />');
    return DOMPurify.sanitize(html, sanitizeConfig);
  };

  return (
    <div className={cn(
      "flex gap-3 max-w-4xl",
      isBot ? "mr-auto" : "ml-auto flex-row-reverse"
    )}>
      {isBot ? (
        <HiveAIAvatar size={32} />
      ) : (
        <Avatar className="h-8 w-8 flex-shrink-0 bg-muted">
          <AvatarFallback className="bg-muted">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}

      <div className={cn(
        "group flex flex-col gap-1.5 max-w-[70%]",
        !isBot && "items-end"
      )}>
        {/* Don't show card for code_display or scenario types - show editor instead */}
        {message.type !== 'code_display' && message.type !== 'scenario' && (
          <div
            className={cn(
              "relative text-sm leading-relaxed transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 min-h-[48px]",
              isBot
                ? "rounded-[24px] px-5 py-4 bg-white/75 dark:bg-white/[0.08] backdrop-blur-2xl border border-white/30 dark:border-white/10 text-[#111827] dark:text-white shadow-[0_10px_30px_rgba(0,0,0,0.08)] hover:shadow-[0_14px_36px_rgba(0,0,0,0.12)]"
                : "rounded-[20px] px-5 py-4 text-white font-semibold border border-white/20 shadow-[0_2px_8px_rgba(0,0,0,0.15)] hover:shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
            )}
            style={
              !isBot
                ? { background: 'linear-gradient(135deg, #2563EB 0%, #10B981 100%)' }
                : undefined
            }
          >
            <div
              className={cn(
                "prose prose-sm max-w-none [&_strong]:font-semibold",
                isBot ? "text-[#111827] dark:text-white" : "text-white prose-invert [&_strong]:text-white"
              )}
              dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
            />
          </div>
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
                isSelected={selectedFramework === framework.id}
                onClick={() => onFrameworkSelect(framework.id, framework.name)}
              />
            ))}
          </div>
        )}

        {/* Code Framework Selection */}
        {message.type === 'code_framework_select' && onCodeFrameworkSelect && (
          <CodeFrameworkSelector
            onSelect={onCodeFrameworkSelect}
            selected={selectedCodeFramework}
            className="w-full mt-2"
          />
        )}

        {/* Workspace Selection */}
        {message.type === 'workspace_select' && message.options && onWorkspaceSelect && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.options.map((option) => {
              const isActive = selectedWorkspaceId === option.id;
              return (
                <Button
                  key={option.id}
                  variant="outline"
                  size="sm"
                  onClick={() => onWorkspaceSelect(option.id, option.label)}
                  className={cn(
                    "menu-item-shine text-sm",
                    isActive && "is-active border-primary/70"
                  )}
                >
                  📁 {option.label}
                </Button>
              );
            })}
          </div>
        )}

        {/* Module Selection */}
        {message.type === 'module_select' && message.options && onModuleSelect && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.options.map((option) => {
              const isActive = selectedModule === option.value;
              return (
                <Button
                  key={option.id}
                  variant="outline"
                  size="sm"
                  onClick={() => onModuleSelect(option.value)}
                  className={cn(
                    "menu-item-shine text-sm",
                    isActive && "is-active border-primary/70"
                  )}
                >
                  {option.label}
                </Button>
              );
            })}
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
