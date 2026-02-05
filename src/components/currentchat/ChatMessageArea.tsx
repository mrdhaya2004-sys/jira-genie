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

interface ChatMessageAreaProps {
  messages: ChatMessageData[];
  isLoading: boolean;
  onDeleteMessage: (messageId: string) => void;
}

const ChatMessageArea: React.FC<ChatMessageAreaProps> = ({
  messages,
  isLoading,
  onDeleteMessage
}) => {
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatMessageTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'HH:mm');
    } catch {
      return '';
    }
  };

  const formatMessageDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMMM d, yyyy');
    } catch {
      return '';
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatMessageDate(message.created_at);
    if (!groups[date]) {
      groups[date] = [];
    }
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
            {/* Date Separator */}
            <div className="flex items-center justify-center my-4">
              <div className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
                {date}
              </div>
            </div>

            {/* Messages for this date */}
            <div className="space-y-3">
              {dateMessages.map((message, index) => {
                const isOwn = message.sender_id === user?.id;
                const showAvatar = index === 0 || 
                  dateMessages[index - 1]?.sender_id !== message.sender_id;

                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3 group",
                      isOwn ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    {/* Avatar */}
                    {!isOwn && (
                      <div className="w-8">
                        {showAvatar && (
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={message.sender?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(message.sender?.full_name || 'U')}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    )}

                    {/* Message Content */}
                    <div
                      className={cn(
                        "max-w-[70%] flex flex-col",
                        isOwn ? "items-end" : "items-start"
                      )}
                    >
                      {/* Sender name (for group chats) */}
                      {!isOwn && showAvatar && message.sender?.full_name && (
                        <span className="text-xs text-muted-foreground mb-1 ml-1">
                          {message.sender.full_name}
                        </span>
                      )}

                      <div className="flex items-center gap-1">
                        {/* Message actions (before message if own) */}
                        {isOwn && !message.is_deleted && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                              >
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => onDeleteMessage(message.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}

                        {/* Message bubble */}
                        <div
                          className={cn(
                            "px-4 py-2 rounded-2xl text-sm",
                            isOwn
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-muted rounded-bl-md",
                            message.is_deleted && "italic opacity-60"
                          )}
                        >
                          {message.content}
                        </div>

                        {/* Message actions (after message if not own) */}
                        {!isOwn && !message.is_deleted && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                              >
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => onDeleteMessage(message.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>

                      {/* Timestamp */}
                      <span className="text-xs text-muted-foreground mt-1 mx-1">
                        {formatMessageTime(message.created_at)}
                      </span>
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
