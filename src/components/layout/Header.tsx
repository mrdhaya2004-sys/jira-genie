import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Menu, Bell, Sparkles } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import Sidebar from './Sidebar';

const Header: React.FC = () => {
  const { profile } = useAuth();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header
      className="h-14 lg:h-16 border-b border-border bg-card/95 backdrop-blur-sm flex items-center justify-between px-3 lg:px-6 sticky top-0 z-30 shrink-0"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* Mobile Menu + Brand */}
      <div className="flex items-center gap-2 min-w-0 lg:min-w-0">
        <div className="lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu" className="h-10 w-10">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[85vw] max-w-[320px]">
              <Sidebar />
            </SheetContent>
          </Sheet>
        </div>
        <div className="lg:hidden min-w-0">
          <p className="text-sm font-semibold truncate leading-tight">Test Zone</p>
          <p className="text-[10px] text-muted-foreground truncate">AI Jira Assistant</p>
        </div>
      </div>

      {/* Center - Status (desktop only) */}
      <div className="hidden lg:flex items-center gap-2">
        <Badge variant="secondary" className="gap-1.5 px-3 py-1">
          <Sparkles className="h-3 w-3 text-primary" />
          <span className="text-xs font-medium">AI Assistant Active</span>
        </Badge>
      </div>

      {/* Right - Actions */}
      <div className="flex items-center gap-1 lg:gap-2">
        <Button variant="ghost" size="icon" className="relative h-10 w-10" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive" />
        </Button>

        <Avatar className="h-8 w-8 lg:ml-2">
          <AvatarImage src={profile?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            {profile?.full_name ? getInitials(profile.full_name) : 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="hidden md:block text-sm ml-1">
          <p className="font-medium truncate max-w-[140px]">{profile?.full_name}</p>
        </div>
      </div>
    </header>
  );
};

export default Header;
