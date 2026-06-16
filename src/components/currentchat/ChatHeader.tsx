import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreVertical, 
  Users, 
  UserPlus, 
  LogOut, 
  Trash2,
} from 'lucide-react';
import { Conversation, ConversationParticipant } from '@/types/chat';
import { useAuth } from '@/contexts/AuthContext';
import TeamsBadge from '@/components/teams/TeamsBadge';
import OnlineStatusIndicator from './OnlineStatusIndicator';

interface ChatHeaderProps {
  conversation: Conversation;
  participants: ConversationParticipant[];
  onAddParticipant: () => void;
  onViewParticipants: () => void;
  onLeaveGroup: () => void;
  onDeleteConversation: () => void;
  isTestChat?: boolean;
  getPresenceStatus?: (userId: string) => 'online' | 'offline';
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  conversation,
  participants,
  onAddParticipant,
  onViewParticipants,
  onLeaveGroup,
  onDeleteConversation,
  isTestChat = false,
  getPresenceStatus,
}) => {
  const { user } = useAuth();
  
  const isAdmin = participants.find(p => p.user_id === user?.id)?.is_admin || false;
  const isCreator = conversation.created_by === user?.id;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const otherParticipant = conversation.type === 'direct' 
    ? participants.find(p => p.user_id !== user?.id)
    : null;

  const displayName = conversation.type === 'group' 
    ? conversation.name || 'Group Chat'
    : otherParticipant?.profile?.full_name || 'Direct Chat';

  const otherStatus = otherParticipant && getPresenceStatus 
    ? getPresenceStatus(otherParticipant.user_id) 
    : 'offline';

  // Count online members for groups
  const onlineCount = conversation.type === 'group' && getPresenceStatus
    ? participants.filter(p => getPresenceStatus(p.user_id) === 'online').length
    : 0;

  return (
    <div className="relative h-16 border-b border-white/10 bg-card/40 backdrop-blur-2xl backdrop-saturate-150 flex items-center justify-between px-4 gap-3 shadow-[0_4px_20px_-12px_hsl(var(--primary)/0.2)]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 rounded-full bg-primary/30 blur-md" />
          <Avatar className="relative h-10 w-10 ring-1 ring-white/15">
            <AvatarImage
              src={conversation.type === 'group'
                ? conversation.avatar_url || undefined
                : otherParticipant?.profile?.avatar_url || undefined
              }
            />
            <AvatarFallback className={conversation.type === 'group' ? 'bg-primary/15 text-primary' : 'bg-gradient-to-br from-primary/20 to-cyan-400/20'}>
              {conversation.type === 'group' ? (
                <Users className="h-4 w-4" />
              ) : (
                getInitials(displayName)
              )}
            </AvatarFallback>
          </Avatar>
          {conversation.type === 'direct' && !isTestChat && (
            <div className="absolute -bottom-0.5 -right-0.5">
              <OnlineStatusIndicator status={otherStatus} size="md" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-semibold text-sm truncate">{displayName}</h3>
            {conversation.is_teams_synced && <TeamsBadge />}
          </div>
          <div className="flex items-center gap-2 min-w-0">
            {conversation.type === 'group' && (
              <span className="text-xs text-muted-foreground truncate">
                {participants.length} members{getPresenceStatus ? ` · ${onlineCount} online` : ''}
              </span>
            )}
            {conversation.type === 'direct' && !isTestChat && (
              <OnlineStatusIndicator status={otherStatus} showLabel size="sm" />
            )}
            {/* Email previously shown here removed for privacy — emails are owner-only. */}
          </div>
        </div>
      </div>


      <div className="flex items-center gap-2">
        {conversation.type === 'group' && (
          <Button variant="ghost" size="icon-sm" onClick={onViewParticipants} title="View members">
            <Users className="h-4 w-4" />
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {conversation.type === 'group' && (
              <>
                {isAdmin && (
                  <DropdownMenuItem onClick={onAddParticipant}>
                    <UserPlus className="h-4 w-4 mr-2" />Add Member
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={onViewParticipants}>
                  <Users className="h-4 w-4 mr-2" />View Members
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLeaveGroup} className="text-warning">
                  <LogOut className="h-4 w-4 mr-2" />Leave Group
                </DropdownMenuItem>
              </>
            )}
            {(isCreator || isAdmin || isTestChat) && (
              <DropdownMenuItem onClick={onDeleteConversation} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />Delete {conversation.type === 'group' ? 'Group' : 'Chat'}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default ChatHeader;
