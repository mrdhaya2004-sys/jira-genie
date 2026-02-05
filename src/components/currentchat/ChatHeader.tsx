import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Settings
} from 'lucide-react';
import { Conversation, ConversationParticipant } from '@/types/chat';
import { useAuth } from '@/contexts/AuthContext';

interface ChatHeaderProps {
  conversation: Conversation;
  participants: ConversationParticipant[];
  onAddParticipant: () => void;
  onViewParticipants: () => void;
  onLeaveGroup: () => void;
  onDeleteConversation: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  conversation,
  participants,
  onAddParticipant,
  onViewParticipants,
  onLeaveGroup,
  onDeleteConversation
}) => {
  const { user } = useAuth();
  
  const isAdmin = participants.find(p => p.user_id === user?.id)?.is_admin || false;
  const isCreator = conversation.created_by === user?.id;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get other participant for direct chats
  const otherParticipant = conversation.type === 'direct' 
    ? participants.find(p => p.user_id !== user?.id)
    : null;

  const displayName = conversation.type === 'group' 
    ? conversation.name || 'Group Chat'
    : otherParticipant?.profile?.full_name || 'Direct Chat';

  return (
    <div className="h-16 border-b border-border bg-card flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage 
            src={conversation.type === 'group' 
              ? conversation.avatar_url || undefined 
              : otherParticipant?.profile?.avatar_url || undefined
            } 
          />
          <AvatarFallback className={conversation.type === 'group' ? 'bg-primary/10 text-primary' : ''}>
            {conversation.type === 'group' ? (
              <Users className="h-4 w-4" />
            ) : (
              getInitials(displayName)
            )}
          </AvatarFallback>
        </Avatar>

        <div>
          <h3 className="font-semibold text-sm">{displayName}</h3>
          <div className="flex items-center gap-2">
            {conversation.type === 'group' && (
              <span className="text-xs text-muted-foreground">
                {participants.length} members
              </span>
            )}
            {conversation.type === 'direct' && otherParticipant?.profile?.email && (
              <span className="text-xs text-muted-foreground">
                {otherParticipant.profile.email}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {conversation.type === 'group' && (
          <Button 
            variant="ghost" 
            size="icon-sm"
            onClick={onViewParticipants}
            title="View members"
          >
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
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Member
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={onViewParticipants}>
                  <Users className="h-4 w-4 mr-2" />
                  View Members
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLeaveGroup} className="text-warning">
                  <LogOut className="h-4 w-4 mr-2" />
                  Leave Group
                </DropdownMenuItem>
              </>
            )}
            {(isCreator || isAdmin) && (
              <DropdownMenuItem onClick={onDeleteConversation} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete {conversation.type === 'group' ? 'Group' : 'Chat'}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default ChatHeader;
