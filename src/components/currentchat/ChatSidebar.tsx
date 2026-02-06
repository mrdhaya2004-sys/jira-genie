import React, { useState } from 'react';
import { Search, Plus, Users, User, MoreVertical, Trash2, Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Conversation } from '@/types/chat';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import TeamsBadge from '@/components/teams/TeamsBadge';
import TeamsIcon from '@/components/teams/TeamsIcon';

interface ChatSidebarProps {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  onSelectConversation: (conversation: Conversation) => void;
  onNewChat: () => void;
  onNewGroup: () => void;
  onDeleteConversation: (conversationId: string) => void;
  onOpenTeamsSettings: () => void;
  isLoading: boolean;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  conversations,
  selectedConversation,
  onSelectConversation,
  onNewChat,
  onNewGroup,
  onDeleteConversation,
  onOpenTeamsSettings,
  isLoading
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = conversations.filter(conv => {
    const name = conv.name || 'Direct Chat';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return '';
    }
  };

  return (
    <div className="w-80 border-r border-border flex flex-col bg-card">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Chats</h2>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon-sm" onClick={onOpenTeamsSettings} title="Teams Integration">
              <TeamsIcon className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={onNewChat} title="New Chat">
              <User className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={onNewGroup} title="New Group">
              <Users className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 bg-muted rounded" />
                  <div className="h-3 w-32 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs mt-1">Start a new chat or create a group</p>
          </div>
        ) : (
          <div className="p-2">
            {filteredConversations.map(conv => (
              <div
                key={conv.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg cursor-pointer group transition-colors",
                  selectedConversation?.id === conv.id
                    ? "bg-accent"
                    : "hover:bg-muted/50"
                )}
                onClick={() => onSelectConversation(conv)}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={conv.avatar_url || undefined} />
                  <AvatarFallback className={conv.type === 'group' ? 'bg-primary/10 text-primary' : 'bg-accent'}>
                    {conv.type === 'group' ? (
                      <Users className="h-4 w-4" />
                    ) : (
                      getInitials(conv.name || 'DC')
                    )}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm truncate">
                      {conv.name || 'Direct Chat'}
                    </span>
                    {conv.last_message && (
                      <span className="text-xs text-muted-foreground">
                        {formatTime(conv.last_message.created_at)}
                      </span>
                    )}
                  </div>
                  {conv.last_message && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {conv.last_message.is_deleted 
                        ? 'Message deleted' 
                        : conv.last_message.content}
                    </p>
                  )}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(conv.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Chat
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {conv.is_teams_synced ? (
                  <TeamsBadge />
                ) : conv.type === 'group' ? (
                  <Badge variant="secondary" className="text-xs">
                    Group
                  </Badge>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default ChatSidebar;
