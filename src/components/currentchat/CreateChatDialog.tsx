import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CreateConversationData } from '@/types/chat';

interface UserProfile {
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

interface CreateChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'direct' | 'group';
  onCreateConversation: (data: CreateConversationData) => Promise<void>;
}

const CreateChatDialog: React.FC<CreateChatDialogProps> = ({
  open,
  onOpenChange,
  type,
  onCreateConversation
}) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (open) {
      fetchUsers();
    } else {
      // Reset state when dialog closes
      setSearchQuery('');
      setSelectedUsers([]);
      setGroupName('');
    }
  }, [open]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url')
        .neq('user_id', user?.id || '')
        .limit(50);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleUserSelection = (userId: string) => {
    if (type === 'direct') {
      setSelectedUsers([userId]);
    } else {
      setSelectedUsers(prev => 
        prev.includes(userId)
          ? prev.filter(id => id !== userId)
          : [...prev, userId]
      );
    }
  };

  const handleCreate = async () => {
    if (selectedUsers.length === 0) return;
    if (type === 'group' && !groupName.trim()) return;

    setIsCreating(true);
    try {
      await onCreateConversation({
        name: type === 'group' ? groupName.trim() : undefined,
        type,
        participant_ids: selectedUsers
      });
      onOpenChange(false);
    } finally {
      setIsCreating(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === 'group' ? (
              <>
                <Users className="h-5 w-5" />
                Create New Group
              </>
            ) : (
              'Start New Chat'
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {type === 'group' && (
            <div className="space-y-2">
              <Label htmlFor="groupName">Group Name</Label>
              <Input
                id="groupName"
                placeholder="Enter group name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>
              {type === 'group' ? 'Add Members' : 'Select User'}
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <ScrollArea className="h-64 border rounded-lg">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">
                Loading users...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No users found
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredUsers.map(userProfile => (
                  <div
                    key={userProfile.user_id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => toggleUserSelection(userProfile.user_id)}
                  >
                    <Checkbox
                      checked={selectedUsers.includes(userProfile.user_id)}
                      onCheckedChange={() => toggleUserSelection(userProfile.user_id)}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={userProfile.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(userProfile.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {userProfile.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {userProfile.email}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {selectedUsers.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={
              selectedUsers.length === 0 || 
              (type === 'group' && !groupName.trim()) ||
              isCreating
            }
          >
            {isCreating ? 'Creating...' : type === 'group' ? 'Create Group' : 'Start Chat'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateChatDialog;
