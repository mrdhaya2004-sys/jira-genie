import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserMinus, Crown } from 'lucide-react';
import { ConversationParticipant } from '@/types/chat';
import { useAuth } from '@/contexts/AuthContext';

interface ParticipantsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participants: ConversationParticipant[];
  isAdmin: boolean;
  onRemoveParticipant: (userId: string) => void;
}

const ParticipantsDialog: React.FC<ParticipantsDialogProps> = ({
  open,
  onOpenChange,
  participants,
  isAdmin,
  onRemoveParticipant
}) => {
  const { user } = useAuth();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Group Members ({participants.length})</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-96">
          <div className="space-y-2">
            {participants.map(participant => {
              const isCurrentUser = participant.user_id === user?.id;
              
              return (
                <div
                  key={participant.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={participant.profile?.avatar_url || undefined} />
                    <AvatarFallback>
                      {getInitials(participant.profile?.full_name || 'U')}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {participant.profile?.full_name || 'Unknown User'}
                        {isCurrentUser && ' (You)'}
                      </p>
                      {participant.is_admin && (
                        <Badge variant="secondary" className="text-xs flex items-center gap-1">
                          <Crown className="h-3 w-3" />
                          Admin
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {participant.profile?.email}
                    </p>
                  </div>

                  {isAdmin && !isCurrentUser && !participant.is_admin && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onRemoveParticipant(participant.user_id)}
                      title="Remove from group"
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ParticipantsDialog;
