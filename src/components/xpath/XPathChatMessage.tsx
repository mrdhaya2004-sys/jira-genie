import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Copy, Check, Bot, User, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { XPathChatMessage as ChatMessageType, Platform } from '@/types/xpath';

interface XPathChatMessageProps {
  message: ChatMessageType;
  onWorkspaceSelect?: (id: string, name: string) => void;
  onModuleSelect?: (module: string) => void;
  onPlatformSelect?: (platform: Platform) => void;
}

const XPathChatMessage: React.FC<XPathChatMessageProps> = ({
  message,
  onWorkspaceSelect,
  onModuleSelect,
  onPlatformSelect,
}) => {
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);
  const [copiedAll, setCopiedAll] = React.useState(false);
  const isBot = message.role === 'assistant';

  const handleCopyXPath = async (xpath: string, index: number) => {
    try {
      await navigator.clipboard.writeText(xpath);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const formatContent = (content: string) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br />');
  };

  // Parse XPath blocks from content for special rendering
  const renderXPathContent = (content: string) => {
    // Look for code blocks with XPath patterns
    const hasXPathBlocks = content.includes('```') || content.includes('//');
    
    if (message.type === 'xpath_result' && hasXPathBlocks) {
      return (
        <div className="space-y-3">
          <div 
            className="text-sm prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: formatContent(content) }}
          />
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyAll}
              className="h-7 px-2 text-xs"
            >
              {copiedAll ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy All
                </>
              )}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div 
        className={cn(
          "text-sm prose prose-sm max-w-none",
          !isBot && "text-primary-foreground prose-invert"
        )}
        dangerouslySetInnerHTML={{ __html: formatContent(content) }}
      />
    );
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
        <Card className={cn(
          "shadow-sm",
          isBot ? "bg-card" : "bg-primary text-primary-foreground"
        )}>
          <CardContent className="p-3">
            {renderXPathContent(message.content)}
          </CardContent>
        </Card>

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

        {/* Platform Selection */}
        {message.type === 'platform_select' && message.options && onPlatformSelect && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.options.map((option) => (
              <Button
                key={option.id}
                variant="outline"
                size="sm"
                onClick={() => onPlatformSelect(option.value as Platform)}
                className="text-sm flex items-center gap-2"
              >
                <span>{option.icon}</span>
                <span>{option.label}</span>
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

export default XPathChatMessage;
