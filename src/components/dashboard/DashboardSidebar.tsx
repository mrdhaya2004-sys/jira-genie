import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  AtSign, 
  MessageSquare, 
  History, 
  Settings, 
  LogOut,
  HelpCircle,
  Ticket,
  LayoutDashboard,
  Code2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActiveModule } from '@/pages/DashboardPage';
import { useMentions } from '@/hooks/useMentions';

interface DashboardSidebarProps {
  className?: string;
  activeModule: ActiveModule;
  onModuleChange: (module: ActiveModule) => void;
}

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ 
  className, 
  activeModule, 
  onModuleChange 
}) => {
  const { profile, signOut } = useAuth();
  const { unreadCount } = useMentions();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const menuItems = [
    { 
      icon: AtSign, 
      label: 'Mentioned on you', 
      module: 'mentions' as ActiveModule,
      badge: unreadCount > 0 ? unreadCount : undefined
    },
    { icon: MessageSquare, label: 'Current Chat', module: 'chat' as ActiveModule },
    { icon: History, label: 'History', module: 'history' as ActiveModule },
    { icon: Ticket, label: 'My Tickets', module: 'tickets' as ActiveModule },
  ];

  const automationItems = [
    { icon: LayoutDashboard, label: 'Agentic AI – Core Workspace', module: 'agentic-ai' as ActiveModule },
    { icon: Ticket, label: 'Jira Ticket Raiser', module: 'jira-ticket-raiser' as ActiveModule },
    { icon: Code2, label: 'Logic Scenario Creator', module: 'logic-scenario-creator' as ActiveModule },
  ];

  return (
    <aside className={cn(
      "flex flex-col h-full bg-sidebar text-sidebar-foreground",
      className
    )}>
      {/* Header */}
      <div className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
          <LayoutDashboard className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-semibold text-sidebar-foreground">Testzone</h1>
          <p className="text-xs text-sidebar-foreground/60">Dashboard</p>
        </div>
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <button
            key={item.label}
            onClick={() => onModuleChange(item.module)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
              activeModule === item.module
                ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge && (
              <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
          </button>
        ))}

        {/* Automation Tools Section */}
        <div className="pt-4 mt-4 border-t border-sidebar-border">
          <p className="px-3 py-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
            Automation Tools
          </p>
          {automationItems.map((item) => (
            <button
              key={item.label}
              onClick={() => onModuleChange(item.module)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                activeModule === item.module
                  ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span className="flex-1 text-left">{item.label}</span>
            </button>
          ))}
        </div>
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
            size="icon"
            className="text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent h-8 w-8"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
