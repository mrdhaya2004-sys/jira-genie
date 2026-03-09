import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  AtSign, 
  MessageSquare, 
  History, 
  LogOut,
  HelpCircle,
  Ticket,
  LayoutDashboard,
  Code2,
  ClipboardList,
  FileCode2,
  Brain,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActiveModule } from '@/pages/DashboardPage';
import testzoneLogo from '@/assets/testzone-logo.png';
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
  const [collapsed, setCollapsed] = useState(false);

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const menuItems = [
    { icon: AtSign, label: 'Mentions', module: 'mentions' as ActiveModule, badge: unreadCount > 0 ? unreadCount : undefined },
    { icon: MessageSquare, label: 'Current Chat', module: 'chat' as ActiveModule },
    { icon: History, label: 'History', module: 'history' as ActiveModule },
    { icon: Ticket, label: 'My Tickets', module: 'tickets' as ActiveModule },
  ];

  const automationItems = [
    { icon: LayoutDashboard, label: 'Agentic AI Workspace', module: 'agentic-ai' as ActiveModule },
    { icon: ClipboardList, label: 'Test Case Generator', module: 'test-case-generator' as ActiveModule },
    { icon: Ticket, label: 'Jira Ticket Raiser', module: 'jira-ticket-raiser' as ActiveModule },
    { icon: Code2, label: 'Scenario Creator', module: 'logic-scenario-creator' as ActiveModule },
    { icon: FileCode2, label: 'XPath Generator', module: 'xpath-generator' as ActiveModule },
  ];

  const bottomItems = [
    { icon: Brain, label: 'AI Configuration', module: 'ai-settings' as ActiveModule },
    { icon: HelpCircle, label: 'Help & Support', module: null },
    { icon: Settings, label: 'Settings', module: null },
  ];

  const NavButton = ({ icon: Icon, label, module, badge, onClick }: {
    icon: React.ElementType;
    label: string;
    module: ActiveModule | null;
    badge?: number;
    onClick?: () => void;
  }) => {
    const isActive = module !== null && activeModule === module;
    const handleClick = onClick || (module ? () => onModuleChange(module) : undefined);

    const button = (
      <button
        onClick={handleClick}
        className={cn(
          "group relative w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200",
          collapsed ? "justify-center p-2.5" : "px-3 py-2.5",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm shadow-sidebar-accent/30"
            : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-foreground/[0.06]"
        )}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-sidebar-primary transition-all duration-300" />
        )}
        <Icon className={cn("h-[18px] w-[18px] shrink-0 transition-colors", isActive && "text-sidebar-primary")} />
        {!collapsed && <span className="flex-1 text-left truncate">{label}</span>}
        {badge && !collapsed && (
          <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-destructive text-destructive-foreground text-[11px] font-semibold flex items-center justify-center animate-fade-in">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
        {badge && collapsed && (
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-sidebar" />
        )}
      </button>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {label}
            {badge ? ` (${badge})` : ''}
          </TooltipContent>
        </Tooltip>
      );
    }

    return button;
  };

  return (
    <TooltipProvider>
      <aside className={cn(
        "flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border/50 transition-all duration-300 ease-in-out",
        collapsed ? "w-[68px]" : "w-[260px]",
        className
      )}>
        {/* Header */}
        <div className={cn("flex items-center gap-3 p-4", collapsed && "justify-center px-2")}>
          <div className="relative shrink-0">
            <img
              src={testzoneLogo}
              alt="Test Zone"
              className="h-9 w-9 rounded-lg object-contain ring-1 ring-sidebar-foreground/10"
            />
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-sidebar" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0 animate-fade-in">
              <h1 className="font-bold text-sidebar-foreground tracking-tight leading-none">Test Zone</h1>
              <p className="text-[11px] text-sidebar-foreground/40 mt-0.5 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> AI-Powered Testing
              </p>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <div className={cn("px-3 mb-1", collapsed && "px-2")}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center p-1.5 rounded-lg text-sidebar-foreground/30 hover:text-sidebar-foreground/60 hover:bg-sidebar-foreground/[0.04] transition-colors"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className={cn("flex-1 overflow-y-auto scrollbar-thin space-y-0.5", collapsed ? "px-2" : "px-3")}>
          {!collapsed && (
            <p className="px-3 pt-2 pb-1.5 text-[10px] font-bold text-sidebar-foreground/30 uppercase tracking-[0.12em]">
              Workspace
            </p>
          )}
          {menuItems.map((item) => (
            <NavButton key={item.label} {...item} />
          ))}

          <div className={cn("my-3", collapsed ? "mx-1" : "mx-3")}>
            <div className="h-px bg-sidebar-foreground/[0.08]" />
          </div>

          {!collapsed && (
            <p className="px-3 pt-1 pb-1.5 text-[10px] font-bold text-sidebar-foreground/30 uppercase tracking-[0.12em]">
              Automation
            </p>
          )}
          {automationItems.map((item) => (
            <NavButton key={item.label} {...item} />
          ))}
        </nav>

        {/* Bottom Section */}
        <div className={cn("border-t border-sidebar-foreground/[0.08] space-y-0.5 pt-2 pb-1", collapsed ? "px-2" : "px-3")}>
          {bottomItems.map((item) => (
            <NavButton key={item.label} {...item} />
          ))}
        </div>

        {/* User Profile */}
        <div className={cn("p-3", collapsed && "p-2")}>
          <div className={cn(
            "flex items-center gap-2.5 p-2 rounded-xl bg-sidebar-foreground/[0.04] ring-1 ring-sidebar-foreground/[0.06] transition-colors hover:bg-sidebar-foreground/[0.07]",
            collapsed && "justify-center p-2"
          )}>
            <Avatar className={cn("h-8 w-8 ring-1 ring-sidebar-foreground/10", collapsed && "h-8 w-8")}>
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-sidebar-primary/20 text-sidebar-primary text-xs font-semibold">
                {profile?.full_name ? getInitials(profile.full_name) : 'U'}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold truncate text-sidebar-foreground/90">{profile?.full_name}</p>
                  <p className="text-[11px] text-sidebar-foreground/40 truncate">{profile?.employee_id}</p>
                </div>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-sidebar-foreground/30 hover:text-destructive hover:bg-destructive/10 h-7 w-7 rounded-lg transition-colors"
                      onClick={signOut}
                    >
                      <LogOut className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Sign out</TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
};

export default DashboardSidebar;
