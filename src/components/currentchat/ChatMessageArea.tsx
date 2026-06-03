import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, MoreVertical, Reply, Copy, Pencil, Check, CheckCheck } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChatMessageData, ConversationParticipant } from '@/types/chat';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import { ReactionGroup } from '@/hooks/useReactions';
import EmojiReactionPicker from './EmojiReactionPicker';
import MessageReactions from './MessageReactions';
import CodeSnippet from './CodeSnippet';
import { toast } from 'sonner';

interface ChatMessageAreaProps {
  messages: ChatMessageData[];
  isLoading: boolean;
  participants?: ConversationParticipant[];
  onDeleteMessage: (messageId: string) => void;
  onReplyToMessage?: (msg: ChatMessageData) => void;
  onEditMessage?: (msg: ChatMessageData) => void;
  reactionGroups?: (messageId: string) => ReactionGroup[];
  onToggleReaction?: (messageId: string, emoji: string) => void;
}

function parseMessageContent(content: string): Array<{ type: 'text' | 'code'; content: string; language?: string }> {
  const parts: Array<{ type: 'text' | 'code'; content: string; language?: string }> = [];
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) parts.push({ type: 'text', content: content.slice(lastIndex, match.index) });
    parts.push({ type: 'code', content: match[2].trim(), language: match[1] || undefined });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) parts.push({ type: 'text', content: content.slice(lastIndex) });
  return parts.length > 0 ? parts : [{ type: 'text', content }];
}

const ChatMessageArea: React.FC<ChatMessageAreaProps> = ({
  messages,
  isLoading,
  participants = [],
  onDeleteMessage,
  onReplyToMessage,
  onEditMessage,
  reactionGroups,
  onToggleReaction,
}) => {
  const { user } = useAuth();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const prevCount = useRef(messages.length);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const scrollToLatest = () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      const v = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
      if (v) v.scrollTo({ top: 0, behavior: 'auto' });
      frameRef.current = null;
    });
  };

  useEffect(() => {
    if (messages.length >= prevCount.current) scrollToLatest();
    prevCount.current = messages.length;
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [messages.length]);

  useEffect(() => {
    if (!isLoading && messages.length > 0) scrollToLatest();
  }, [isLoading, messages.length]);

  const getInitials = (n: string) => n.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
  const formatTime = (s: string) => { try { return format(new Date(s), 'HH:mm'); } catch { return ''; } };
  const formatDay = (s: string) => {
    try {
      const d = new Date(s);
      if (isToday(d)) return 'Today';
      if (isYesterday(d)) return 'Yesterday';
      return format(d, 'MMMM d, yyyy');
    } catch { return ''; }
  };

  const grouped = useMemo(() => messages.reduce((acc, m) => {
    const k = formatDay(m.created_at);
    if (!acc[k]) acc[k] = [];
    acc[k].push(m);
    return acc;
  }, {} as Record<string, ChatMessageData[]>), [messages]);

  // Read receipt: read when ALL other participants' last_read_at >= message.created_at
  const isMessageRead = (msg: ChatMessageData): boolean => {
    if (!user || msg.sender_id !== user.id) return false;
    const others = participants.filter(p => p.user_id !== user.id);
    if (others.length === 0) return false;
    return others.every(p => p.last_read_at && new Date(p.last_read_at) >= new Date(msg.created_at));
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Copy failed');
    }
  };

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
    <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
      <div className="space-y-6">
        {Object.entries(grouped).map(([day, dayMsgs]) => (
          <div key={day}>
            <div className="flex items-center justify-center my-4">
              <div className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">{day}</div>
            </div>
            <div className="space-y-3">
              {dayMsgs.map((message, index) => {
                const isOwn = message.sender_id === user?.id;
                const showAvatar = index === 0 || dayMsgs[index - 1]?.sender_id !== message.sender_id;
                const msgReactions = reactionGroups?.(message.id) || [];
                const parts = parseMessageContent(message.content);
                const read = isMessageRead(message);

                return (
                  <div
                    key={message.id}
                    className={cn('flex gap-3 group', isOwn ? 'flex-row-reverse' : 'flex-row')}
                    onMouseEnter={() => setHoveredId(message.id)}
                    onMouseLeave={() => setHoveredId(prev => prev === message.id ? null : prev)}
                  >
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
                    <div className={cn('max-w-[min(70%,42rem)] min-w-0 flex flex-col', isOwn ? 'items-end' : 'items-start')}>
                      {!isOwn && showAvatar && message.sender?.full_name && (
                        <span className="text-xs text-muted-foreground mb-1 ml-1">{message.sender.full_name}</span>
                      )}
                      <div className="flex items-center gap-1">
                        {isOwn && !message.is_deleted && (
                          <div className={cn('flex items-center gap-0.5 transition-opacity', hoveredId === message.id ? 'opacity-100' : 'opacity-0')}>
                            {onToggleReaction && <EmojiReactionPicker onSelect={(e) => onToggleReaction(message.id, e)} />}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon-sm" className="h-6 w-6">
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {onReplyToMessage && (
                                  <DropdownMenuItem onClick={() => onReplyToMessage(message)}>
                                    <Reply className="h-4 w-4 mr-2" />Reply
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => handleCopy(message.content)}>
                                  <Copy className="h-4 w-4 mr-2" />Copy
                                </DropdownMenuItem>
                                {onEditMessage && (
                                  <DropdownMenuItem onClick={() => onEditMessage(message)}>
                                    <Pencil className="h-4 w-4 mr-2" />Edit
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => onDeleteMessage(message.id)}>
                                  <Trash2 className="h-4 w-4 mr-2" />Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                        <div className={cn(
                          'min-w-0 max-w-full overflow-hidden px-4 py-2 rounded-2xl text-sm transition-colors break-words',
                          isOwn ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-muted rounded-bl-md',
                          message.is_deleted && 'italic opacity-60'
                        )}>
                          {message.reply_to && !message.is_deleted && (
                            <div className={cn(
                              'mb-1.5 px-2 py-1 rounded-lg border-l-2 text-xs',
                              isOwn ? 'bg-primary-foreground/10 border-primary-foreground/40' : 'bg-background/40 border-primary/60'
                            )}>
                              <div className={cn('font-semibold truncate', isOwn ? 'text-primary-foreground/90' : 'text-primary')}>
                                {message.reply_to.sender_name || 'User'}
                              </div>
                              <div className={cn('truncate opacity-80', isOwn ? 'text-primary-foreground/80' : 'text-foreground/70')}>
                                {message.reply_to.is_deleted ? 'Message deleted' : message.reply_to.content}
                              </div>
                            </div>
                          )}
                          {parts.map((part, i) => (
                            part.type === 'code' ? (
                              <CodeSnippet key={i} code={part.content} language={part.language} />
                            ) : (
                              <span key={i} className="whitespace-pre-wrap break-words">{part.content}</span>
                            )
                          ))}
                        </div>
                        {!isOwn && !message.is_deleted && (
                          <div className={cn('flex items-center gap-0.5 transition-opacity', hoveredId === message.id ? 'opacity-100' : 'opacity-0')}>
                            {onToggleReaction && <EmojiReactionPicker onSelect={(e) => onToggleReaction(message.id, e)} />}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon-sm" className="h-6 w-6">
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                {onReplyToMessage && (
                                  <DropdownMenuItem onClick={() => onReplyToMessage(message)}>
                                    <Reply className="h-4 w-4 mr-2" />Reply
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => handleCopy(message.content)}>
                                  <Copy className="h-4 w-4 mr-2" />Copy
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                      {msgReactions.length > 0 && onToggleReaction && (
                        <MessageReactions
                          reactions={msgReactions}
                          onToggle={(emoji) => onToggleReaction(message.id, emoji)}
                        />
                      )}
                      <div className="flex items-center gap-1 mt-1 mx-1 text-xs text-muted-foreground">
                        <span>{formatTime(message.created_at)}</span>
                        {message.edited_at && <span className="italic opacity-70">· edited</span>}
                        {isOwn && !message.is_deleted && (
                          read
                            ? <CheckCheck className="h-3.5 w-3.5 text-primary" aria-label="Read" />
                            : <Check className="h-3.5 w-3.5 opacity-60" aria-label="Sent" />
                        )}
                      </div>
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
