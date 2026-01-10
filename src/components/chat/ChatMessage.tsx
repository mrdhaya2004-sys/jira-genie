import React from 'react';
import DOMPurify from 'dompurify';
import { ChatMessage as ChatMessageType } from '@/types/ticket';
import { Bot, User, Info, ExternalLink, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ChatOptions from './ChatOptions';
import TicketPreview from './TicketPreview';

// Configure DOMPurify to allow only safe HTML tags and attributes
const sanitizeConfig = {
  ALLOWED_TAGS: ['strong', 'a', 'br', 'li'],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
};
interface ChatMessageProps {
  message: ChatMessageType;
  onOptionSelect?: (option: any) => void;
  onConfirm?: () => void;
  onCancel?: () => void;
  onEdit?: () => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  onOptionSelect,
  onConfirm,
  onCancel,
  onEdit
}) => {
  const isUser = message.type === 'user';
  const isSystem = message.type === 'system';
  const isBot = message.type === 'bot';

  const formatContent = (content: string) => {
    // Simple markdown-like formatting
    return content
      .split('\n')
      .map((line, i) => {
        // Bold text
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Links
        line = line.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline inline-flex items-center gap-1">$1</a>');
        // Bullet points
        if (line.startsWith('• ')) {
          return `<li class="ml-4">${line.substring(2)}</li>`;
        }
        return line;
      })
      .join('<br />');
  };

  return (
    <div
      className={cn(
        "flex gap-3 animate-slide-in-up",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center",
          isUser && "bg-primary",
          isBot && "bg-accent",
          isSystem && "bg-muted"
        )}
      >
        {isUser && <User className="h-4 w-4 text-primary-foreground" />}
        {isBot && <Bot className="h-4 w-4 text-accent-foreground" />}
        {isSystem && <Info className="h-4 w-4 text-muted-foreground" />}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          "flex flex-col gap-2 max-w-[80%]",
          isUser && "items-end"
        )}
      >
        <div
          className={cn(
            "px-4 py-3 rounded-2xl text-sm leading-relaxed",
            isUser && "bg-chat-user-bg text-chat-user-fg rounded-br-md",
            isBot && "bg-chat-bot-bg text-chat-bot-fg rounded-bl-md",
            isSystem && "bg-chat-system-bg text-chat-system-fg rounded-lg border border-accent/20"
          )}
        >
          <div 
            dangerouslySetInnerHTML={{ 
              __html: DOMPurify.sanitize(formatContent(message.content), sanitizeConfig) 
            }}
            className="[&_li]:list-disc [&_a]:inline-flex [&_a]:items-center [&_a]:gap-1"
          />
        </div>

        {/* Duplicate Tickets Warning */}
        {message.duplicates && message.duplicates.length > 0 && (
          <div className="w-full space-y-2 mt-2">
            {message.duplicates.map((duplicate) => (
              <div
                key={duplicate.key}
                className="flex items-start gap-3 p-3 bg-warning/10 border border-warning/20 rounded-lg"
              >
                <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-medium text-warning">
                      {duplicate.key}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {duplicate.status}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {Math.round(duplicate.similarity * 100)}% match
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground mt-1 line-clamp-2">
                    {duplicate.summary}
                  </p>
                  <a
                    href={duplicate.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                  >
                    View in Jira <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Options */}
        {message.options && message.options.length > 0 && (
          <ChatOptions options={message.options} onSelect={onOptionSelect!} />
        )}

        {/* Ticket Preview */}
        {message.ticketPreview && (
          <TicketPreview 
            ticket={message.ticketPreview} 
            onConfirm={onConfirm!}
            onCancel={onCancel!}
            onEdit={onEdit}
          />
        )}

        {/* Timestamp */}
        <span className="text-xs text-muted-foreground px-1">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
};

export default ChatMessage;
