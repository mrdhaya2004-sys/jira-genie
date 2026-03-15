import React, { useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChatMessageData } from '@/types/chat';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ReactionGroup } from '@/hooks/useReactions';
import EmojiReactionPicker from './EmojiReactionPicker';
import MessageReactions from './MessageReactions';
import CodeSnippet from './CodeSnippet';

interface ChatMessageAreaProps {
  messages: ChatMessageData[];
  isLoading: boolean;
  onDeleteMessage: (messageId: string) => void;
  reactionGroups?: (messageId: string) => ReactionGroup[];
  onToggleReaction?: (messageId: string, emoji: string) => void;
}

// Parse message content for code blocks
function parseMessageContent(content: string): Array<{ type: 'text' | 'code'; content: string; language?: string }> {
  const parts: Array<{ type: 'text' | 'code'; content: string; language?: string }> = [];
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'code', content: match[2].trim(), language: match[1] || undefined });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'text', content: content.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: 'text', content }];
}

const ChatMessageArea: React.FC<ChatMessageAreaProps> = ({
  messages,
  isLoading,
  onDeleteMessage,
  reactionGroups,
  onToggleReaction,
}) => {
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatMessageTime = (dateString: string) => {
    try { return format(new Date(dateString), 'HH:mm'); } catch { return ''; }
  };

  const formatMessageDate = (dateString: string) => {
    try { return format(new Date(dateString), 'MMMM d, yyyy'); } catch { return ''; }
  };

  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatMessageDate(message.created_at);
    if (!groups[date]) groups[date] = [];
    groups[date].push(message);
    return groups;
  }, {} as Record<string, ChatMessageData[]>);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg font-medium">No messages yet</p>
          <p className="text-sm">Send a message to start the conversation</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 p-4" ref={scrollRef}>
      <div className="space-y-6">
        {Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <div key={date}>
            <div className="flex items-center justify-center my-4">
              <div className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">{date}</div>
            </div>
            <div className="space-y-3">
              {dateMessages.map((message, index) => {
                const isOwn = message.sender_id === user?.id;
                const showAvatar = index === 0 || dateMessages[index - 1]?.sender_id !== message.sender_id;
                const msgReactions = reactionGroups?.(message.id) || [];
                const contentParts = parseMessageContent(message.content);

                return (
                  <div key={message.id} className={cn("flex gap-3 group", isOwn ? "flex-row-reverse" : "flex-row")}>
                    {!isOwn && (
                      <div className="w-8">
                        {showAvatar && (
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={message.sender?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">{getInitials(message.sender?.full_name || 'U')}</AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    )}
                    <div className={cn("max-w-[70%] flex flex-col", isOwn ? "items-end" : "items-start")}>
                      {!isOwn && showAvatar && message.sender?.full_name && (
                        <span className="text-xs text-muted-foreground mb-1 ml-1">{message.sender.full_name}</span>
                      )}
                      <div className="flex items-center gap-1">
                        {isOwn && !message.is_deleted && (
                          <div className="flex items-center gap-0.5">
                            {onToggleReaction && (
                              <EmojiReactionPicker onSelect={(emoji) => onToggleReaction(message.id, emoji)} />
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6">
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem className="text-destructive" onClick={() => onDeleteMessage(message.id)}>
                                  <Trash2 className="h-4 w-4 mr-2" />Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                        <div className={cn(
                          "px-4 py-2 rounded-2xl text-sm",
                          isOwn ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md",
                          message.is_deleted && "italic opacity-60"
                        )}>
                          {contentParts.map((part, i) => (
                            part.type === 'code' ? (
                              <CodeSnippet key={i} code={part.content} language={part.language} />
                            ) : (
                              <span key={i} className="whitespace-pre-wrap">{part.content}</span>
                            )
                          ))}
                        </div>
                        {!isOwn && !message.is_deleted && (
                          <div className="flex items-center gap-0.5">
                            {onToggleReaction && (
                              <EmojiReactionPicker onSelect={(emoji) => onToggleReaction(message.id, emoji)} />
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6">
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                <DropdownMenuItem className="text-destructive" onClick={() => onDeleteMessage(message.id)}>
                                  <Trash2 className="h-4 w-4 mr-2" />Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                      {/* Reactions */}
                      {msgReactions.length > 0 && onToggleReaction && (
                        <MessageReactions
                          reactions={msgReactions}
                          onToggle={(emoji) => onToggleReaction(message.id, emoji)}
                        />
                      )}
                      <span className="text-xs text-muted-foreground mt-1 mx-1">{formatMessageTime(message.created_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

export default ChatMessageArea;
