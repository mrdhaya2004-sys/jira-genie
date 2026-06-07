import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AtSign,
  MessageSquare,
  History,
  Settings,
  LogOut,
  HelpCircle,
  Ticket,
  LayoutDashboard,
  Code2,
  ClipboardList,
  FileCode2,
  Brain,
  Info,
  ShieldAlert,
  GitBranch } from
'lucide-react';
import { cn } from '@/lib/utils';
import { ActiveModule } from '@/pages/DashboardPage';
import { preloadModule } from '@/lib/modulePreloader';
import testzoneLogo from '@/assets/testzone-logo.png';
import { useMentions } from '@/hooks/useMentions';
import HelpChatDialog from '@/components/help/HelpChatDialog';
import LogoutConfirmDialog from '@/components/auth/LogoutConfirmDialog';

interface DashboardSidebarProps {
  className?: string;
  activeModule: ActiveModule;
  onModuleChange: (module: ActiveModule) => void;
  onAfterNavigate?: () => void;
}

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  className,
  activeModule,
  onModuleChange,
  onAfterNavigate
}) => {
  const navigate = (m: ActiveModule) => {
    onModuleChange(m);
    onAfterNavigate?.();
  };
  const { profile, signOut } = useAuth();
  const { unreadCount } = useMentions();
  const [helpChatOpen, setHelpChatOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const getInitials = (name: string) => {
    return name.
    split(' ').
    map((n) => n[0]).
    join('').
    toUpperCase().
    slice(0, 2);
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
  { icon: Ticket, label: 'My Tickets', module: 'tickets' as ActiveModule }];


  const automationItems = [
  { icon: LayoutDashboard, label: 'Hive AI – Core Workspace', module: 'agentic-ai' as ActiveModule },
  { icon: ClipboardList, label: 'Test Case Generator', module: 'test-case-generator' as ActiveModule },
  { icon: Code2, label: 'Logic Scenario Creator', module: 'logic-scenario-creator' as ActiveModule },
  { icon: FileCode2, label: 'XPath Generator', module: 'xpath-generator' as ActiveModule },
  { icon: ShieldAlert, label: 'AI Defect Analyzer', module: 'defect-analyzer' as ActiveModule },
  { icon: Ticket, label: 'Jira Ticket Raiser', module: 'jira-ticket-raiser' as ActiveModule },
  { icon: GitBranch, label: 'GitLab AI', module: 'gitlab-execution' as ActiveModule }];


  return (
    <>
    <aside className={cn(
      "flex flex-col h-full bg-sidebar text-sidebar-foreground",
      className
    )}>
      {/* Subtle top gradient overlay */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-sidebar-primary/5 to-transparent pointer-events-none z-0" />
      
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 relative z-10">
        <img src={testzoneLogo} alt="Test Zone" className="h-9 w-9 rounded-lg object-contain" />
        <div>
          <h1 className="font-semibold text-sm text-sidebar-foreground tracking-tight">Test Zone</h1>
          <p className="text-[11px] text-sidebar-foreground/50">Dashboard</p>
        </div>
      </div>

      <div className="mx-3 h-px bg-sidebar-border/60" />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2.5 space-y-0.5 overflow-y-auto scrollbar-thin relative z-10">
        {menuItems.map((item) =>
        <button
          key={item.label}
          onClick={() => navigate(item.module)}
          onMouseEnter={() => preloadModule(item.module)}
          onFocus={() => preloadModule(item.module)}
          onTouchStart={() => preloadModule(item.module)}
          className={cn("menu-item", activeModule === item.module && "is-active")}>

            <item.icon className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge &&
          <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center animate-pulse-dot">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
          }
          </button>
        )}

        {/* Automation Tools Section */}
        <div className="pt-3 mt-3 border-t border-sidebar-border/40">
          <div className="px-3 py-1.5 mb-0.5">
            <span className="text-[10px] font-semibold text-sidebar-foreground/35 uppercase tracking-[0.15em]">
              Automation Tools
            </span>
          </div>
          {automationItems.map((item) =>
          <button
            key={item.label}
            onClick={() => navigate(item.module)}
            onMouseEnter={() => preloadModule(item.module)}
            onFocus={() => preloadModule(item.module)}
            onTouchStart={() => preloadModule(item.module)}
            className={cn("menu-item", activeModule === item.module && "is-active")}>

              <item.icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
            </button>
          )}
        </div>
      </nav>

      <div className="mx-3 h-px bg-sidebar-border/60" />

      {/* Bottom Section */}
      <div className="px-3 py-2 space-y-0.5 relative z-10">
        <button
          onClick={() => navigate("ai-settings")}
          onMouseEnter={() => preloadModule('ai-settings')}
          onFocus={() => preloadModule('ai-settings')}
          className={cn("menu-item", activeModule === 'ai-settings' && "is-active")}>
          <Brain className="h-4 w-4" />
          AI Configuration
        </button>
        <button
          onClick={() => setHelpChatOpen(true)}
          className="menu-item"
        >
          <HelpCircle className="h-4 w-4" />
          Help & Support
        </button>
        <button
          onClick={() => navigate("about")}
          onMouseEnter={() => preloadModule('about')}
          onFocus={() => preloadModule('about')}
          className={cn("menu-item", activeModule === 'about' && "is-active")}>
          <Info className="h-4 w-4" />
          About Us
        </button>
        <button
          onClick={() => navigate("account-settings")}
          onMouseEnter={() => preloadModule('account-settings')}
          onFocus={() => preloadModule('account-settings')}
          className={cn("menu-item", activeModule === 'account-settings' && "is-active")}>
          <Settings className="h-4 w-4" />
          Settings
        </button>
      </div>

      <div className="mx-3 h-px bg-sidebar-border/60" />

      {/* User Profile */}
      <div className="p-3 relative z-10">
        <div className="flex items-center gap-3 p-2.5 rounded-lg border border-sidebar-border/40 bg-sidebar-accent/30 transition-colors hover:bg-sidebar-accent/50">
          <button onClick={() => navigate("profile")} className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative">
              <Avatar className="h-9 w-9 ring-2 ring-sidebar-primary/20">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm">
                  {profile?.full_name ? getInitials(profile.full_name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-sidebar" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium truncate">{profile?.full_name}</p>
              <p className="text-[11px] text-sidebar-foreground/50 truncate">{profile?.employee_id}</p>
            </div>
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent h-8 w-8"
            onClick={() => setLogoutOpen(true)}>
            
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
    <HelpChatDialog open={helpChatOpen} onOpenChange={setHelpChatOpen} />
    <LogoutConfirmDialog open={logoutOpen} onOpenChange={setLogoutOpen} onConfirm={signOut} />
    </>);
};

export default DashboardSidebar;
