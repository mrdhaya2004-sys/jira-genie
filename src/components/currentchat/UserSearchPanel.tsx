import React, { useState, useEffect, useCallback } from 'react';
import { Search, MessageSquare, X, AtSign, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useUserSearch, SearchResult } from '@/hooks/useUserSearch';
import { usePresence } from '@/hooks/usePresence';
import { cn } from '@/lib/utils';

interface UserSearchPanelProps {
  open: boolean;
  onClose: () => void;
  onStartChat: (userId: string, userName: string) => void;
}

const UserSearchPanel: React.FC<UserSearchPanelProps> = ({
  open,
  onClose,
  onStartChat,
}) => {
  const { results, isSearching, searchUsers, clearResults } = useUserSearch();
  const { getStatus, fetchPresence } = usePresence();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (query.length >= 2) {
      const timer = setTimeout(() => searchUsers(query), 300);
      return () => clearTimeout(timer);
    } else {
      clearResults();
    }
  }, [query, searchUsers, clearResults]);

  useEffect(() => {
    if (results.length > 0) {
      fetchPresence(results.map(r => r.user_id));
    }
  }, [results, fetchPresence]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-10 bg-card flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Search Users</h3>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by @username or name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>
      </div>

      {/* Results */}
      <ScrollArea className="flex-1">
        {isSearching ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : results.length === 0 && query.length >= 2 ? (
          <div className="p-8 text-center text-muted-foreground">
            <AtSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No users found</p>
            <p className="text-xs mt-1">Try searching by @profile_id or name</p>
          </div>
        ) : query.length < 2 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Search for team members</p>
            <p className="text-xs mt-1">Type at least 2 characters to start searching</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {results.map((result) => {
              const status = getStatus(result.user_id);
              return (
                <div
                  key={result.user_id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={result.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(result.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card",
                      status === 'online' ? 'bg-success' : 'bg-muted-foreground/40'
                    )} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{result.full_name}</p>
                      {status === 'online' && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-success/10 text-success border-0">
                          Online
                        </Badge>
                      )}
                    </div>
                    {result.profile_id && (
                      <p className="text-xs text-primary font-medium">{result.profile_id}</p>
                    )}
                    <p className="text-xs text-muted-foreground truncate">{result.email}</p>
                  </div>

                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-shrink-0"
                    onClick={() => onStartChat(result.user_id, result.full_name)}
                  >
                    <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                    Chat
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default UserSearchPanel;
