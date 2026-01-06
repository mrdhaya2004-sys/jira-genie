import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  Bot, 
  Plus, 
  MessageSquare, 
  History, 
  Settings, 
  LogOut,
  HelpCircle,
  Ticket
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const { profile, signOut } = useAuth();
  const { startNewTicket, resetChat } = useChat();

  const handleNewTicket = () => {
    resetChat();
    setTimeout(() => startNewTicket(), 100);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const menuItems = [
    { icon: MessageSquare, label: 'Current Chat', active: true },
    { icon: History, label: 'History', active: false },
    { icon: Ticket, label: 'My Tickets', active: false },
  ];

  return (
    <aside className={cn(
      "flex flex-col h-full bg-sidebar text-sidebar-foreground",
      className
    )}>
      {/* Header */}
      <div className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-sidebar-primary flex items-center justify-center">
          <Bot className="h-6 w-6 text-sidebar-primary-foreground" />
        </div>
        <div>
          <h1 className="font-semibold text-sidebar-foreground">TicketBot</h1>
          <p className="text-xs text-sidebar-foreground/60">AI Jira Assistant</p>
        </div>
      </div>

      <Separator className="bg-sidebar-border" />

      {/* New Ticket Button */}
      <div className="p-3">
        <Button 
          variant="sidebar" 
          className="w-full justify-start gap-2"
          onClick={handleNewTicket}
        >
          <Plus className="h-4 w-4" />
          New Ticket
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.label}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
              item.active 
                ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </nav>

      <Separator className="bg-sidebar-border" />

      {/* Bottom Section */}
      <div className="p-3 space-y-1">
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors">
          <HelpCircle className="h-4 w-4" />
          Help & Support
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors">
          <Settings className="h-4 w-4" />
          Settings
        </button>
      </div>

      <Separator className="bg-sidebar-border" />

      {/* User Profile */}
      <div className="p-3">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent/50">
          <Avatar className="h-9 w-9">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm">
              {profile?.full_name ? getInitials(profile.full_name) : 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile?.full_name}</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">{profile?.employee_id}</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon-sm"
            className="text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
