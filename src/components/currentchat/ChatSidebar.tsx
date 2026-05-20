import React, { useState } from 'react';
import chatLogo from '@/assets/chat-logo.png';
import { Search, Plus, Users, User, MoreVertical, Trash2, AtSign } from 'lucide-react';
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
import OnlineStatusIndicator from './OnlineStatusIndicator';

interface ChatSidebarProps {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  onSelectConversation: (conversation: Conversation) => void;
  onNewChat: () => void;
  onNewGroup: () => void;
  onDeleteConversation: (conversationId: string) => void;
  onOpenTeamsSettings: () => void;
  onOpenUserSearch: () => void;
  isLoading: boolean;
  getPresenceStatus?: (userId: string) => 'online' | 'offline';
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  conversations,
  selectedConversation,
  onSelectConversation,
  onNewChat,
  onNewGroup,
  onDeleteConversation,
  onOpenTeamsSettings,
  onOpenUserSearch,
  isLoading,
  getPresenceStatus,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = conversations.filter(conv => {
    const name = conv.name || 'Direct Chat';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatTime = (dateString: string) => {
    try { return formatDistanceToNow(new Date(dateString), { addSuffix: true }); } catch { return ''; }
  };

  return (
    <div className="relative h-full w-full flex flex-col bg-card/40 backdrop-blur-2xl border-r border-white/10">
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent">
        <div className="flex items-center justify-between mb-4 gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 rounded-xl bg-primary/30 blur-md" />
              <img src={chatLogo} alt="Chats" className="relative h-9 w-9 rounded-xl object-contain ring-1 ring-white/15" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold truncate bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Messages</h2>
              <p className="text-[10px] text-muted-foreground truncate">{conversations.length} conversation{conversations.length === 1 ? '' : 's'}</p>
            </div>
          </div>
          <div className="flex gap-0.5 flex-shrink-0">
            <Button variant="ghost" size="icon-sm" onClick={onOpenUserSearch} title="Search Users" className="rounded-lg hover:bg-white/10">
              <AtSign className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={onOpenTeamsSettings} title="Teams Integration" className="rounded-lg hover:bg-white/10">
              <TeamsIcon className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={onNewChat} title="New Chat" className="rounded-lg hover:bg-white/10">
              <User className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={onNewGroup} title="New Group" className="rounded-lg hover:bg-white/10">
              <Users className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 rounded-xl"
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
                <div className="flex-1 space-y-2 min-w-0">
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
            <p className="text-xs mt-1">Search users with @ or start a new chat</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredConversations.map(conv => {
              const hasUnread = (conv.unread_count ?? 0) > 0;
              const isActive = selectedConversation?.id === conv.id;
              return (
                <div
                  key={conv.id}
                  className={cn(
                    "group relative flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-200 animate-fade-in min-w-0",
                    isActive
                      ? "bg-gradient-to-r from-primary/15 via-primary/10 to-cyan-400/5 shadow-[0_4px_20px_-8px_hsl(var(--primary)/0.4)] ring-1 ring-inset ring-white/10"
                      : hasUnread
                        ? "bg-primary/5 hover:bg-white/[0.06]"
                        : "hover:bg-white/[0.06]"
                  )}
                  onClick={() => onSelectConversation(conv)}
                >
                  {isActive && (
                    <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-gradient-to-b from-primary to-cyan-400 shadow-[0_0_8px_hsl(var(--primary)/0.8)]" />
                  )}

                  <div className="relative flex-shrink-0">
                    <Avatar className="h-10 w-10 ring-1 ring-white/10">
                      <AvatarImage src={conv.avatar_url || undefined} />
                      <AvatarFallback className={conv.type === 'group' ? 'bg-primary/15 text-primary text-xs' : 'bg-gradient-to-br from-primary/20 to-cyan-400/20 text-xs'}>
                        {conv.type === 'group' ? <Users className="h-4 w-4" /> : getInitials(conv.name || 'DC')}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-baseline justify-between gap-2 min-w-0">
                      <span className={cn(
                        "text-sm truncate flex-1 min-w-0",
                        hasUnread ? "font-semibold text-foreground" : "font-medium text-foreground/90"
                      )}>
                        {conv.name || 'Direct Chat'}
                      </span>
                      {conv.last_message && (
                        <span className={cn(
                          "text-[10px] flex-shrink-0 whitespace-nowrap tabular-nums",
                          hasUnread ? "text-primary font-semibold" : "text-muted-foreground"
                        )}>
                          {formatTime(conv.last_message.created_at)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5 min-w-0">
                      <p className={cn(
                        "text-xs truncate flex-1 min-w-0",
                        hasUnread ? "text-foreground/80 font-medium" : "text-muted-foreground"
                      )}>
                        {conv.last_message
                          ? (conv.last_message.is_deleted ? 'Message deleted' : conv.last_message.content)
                          : 'No messages yet'}
                      </p>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {conv.is_teams_synced ? (
                          <TeamsBadge />
                        ) : conv.type === 'group' ? (
                          <Badge variant="secondary" className="text-[9px] px-1.5 h-4">Group</Badge>
                        ) : null}
                        {hasUnread && (
                          <Badge className="h-4 min-w-4 flex items-center justify-center px-1.5 text-[10px] font-bold rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.6)]">
                            {conv.unread_count! > 99 ? '99+' : conv.unread_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 flex-shrink-0 rounded-md hover:bg-white/10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => { e.stopPropagation(); onDeleteConversation(conv.id); }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />Delete Chat
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default ChatSidebar;

