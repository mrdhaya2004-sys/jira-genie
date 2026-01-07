import React, { useState } from 'react';
import { useMentions, Mention } from '@/hooks/useMentions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  AtSign, 
  MessageSquare, 
  Ticket, 
  MessageCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const MentionsPanel: React.FC = () => {
  const { mentions, isLoading, unreadCount, markAsRead, markAllAsRead } = useMentions();

  if (isLoading) {
    return (
      <div className="h-full p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 pb-4 border-b border-border bg-background">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <AtSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Mentioned on you</h1>
                <p className="text-sm text-muted-foreground">
                  You have {unreadCount} unread mention{unreadCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={markAllAsRead}
                className="gap-2"
              >
                <Check className="h-4 w-4" />
                Mark all as read
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 pt-4">
          <div className="max-w-4xl mx-auto">
            {mentions.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <AtSign className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-1">No mentions yet</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-sm">
                    When someone mentions you using @username or @everyone, you'll see it here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {mentions.map((mention) => (
                  <MentionCard 
                    key={mention.id} 
                    mention={mention} 
                    onMarkAsRead={markAsRead}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

interface MentionCardProps {
  mention: Mention;
  onMarkAsRead: (id: string) => void;
}

const MentionCard: React.FC<MentionCardProps> = ({ mention, onMarkAsRead }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getSourceIcon = () => {
    switch (mention.source_type) {
      case 'ticket':
        return <Ticket className="h-4 w-4" />;
      case 'comment':
        return <MessageCircle className="h-4 w-4" />;
      case 'chat':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getSourceLabel = () => {
    switch (mention.source_type) {
      case 'ticket':
        return 'Ticket';
      case 'comment':
        return 'Comment';
      case 'chat':
        return 'Chat';
      default:
        return 'Message';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const timeAgo = formatDistanceToNow(new Date(mention.created_at), { addSuffix: true });

  return (
    <Card 
      className={cn(
        "transition-all duration-200 cursor-pointer hover:shadow-md",
        !mention.is_read && "border-l-4 border-l-primary bg-primary/5"
      )}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={mention.mentioned_by?.avatar_url || undefined} />
            <AvatarFallback className="bg-secondary text-secondary-foreground text-sm">
              {mention.mentioned_by?.full_name 
                ? getInitials(mention.mentioned_by.full_name) 
                : 'U'}
            </AvatarFallback>
          </Avatar>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-medium text-sm">
                {mention.mentioned_by?.full_name || 'Unknown User'}
              </span>
              <span className="text-muted-foreground text-sm">mentioned you</span>
              {mention.mention_type === 'everyone' && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Users className="h-3 w-3" />
                  @everyone
                </Badge>
              )}
            </div>

            {/* Source info */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              {getSourceIcon()}
              <span>{getSourceLabel()}</span>
              {mention.source_title && (
                <>
                  <span>•</span>
                  <span className="truncate">{mention.source_title}</span>
                </>
              )}
              <span>•</span>
              <span>{timeAgo}</span>
            </div>

            {/* Content snippet */}
            <div className={cn(
              "text-sm text-foreground/80 bg-muted/50 rounded-lg p-3",
              !isExpanded && "line-clamp-2"
            )}>
              <HighlightedContent content={mention.content_snippet} />
            </div>

            {/* Expand indicator */}
            {mention.content_snippet.length > 100 && (
              <div className="flex items-center justify-center mt-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-xs text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                  }}
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      Show more
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex-shrink-0">
            {!mention.is_read && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsRead(mention.id);
                }}
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Highlight @mentions in content
const HighlightedContent: React.FC<{ content: string }> = ({ content }) => {
  const parts = content.split(/(@\w+)/g);
  
  return (
    <span>
      {parts.map((part, index) => {
        if (part.startsWith('@')) {
          return (
            <span key={index} className="text-primary font-medium">
              {part}
            </span>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};

export default MentionsPanel;
