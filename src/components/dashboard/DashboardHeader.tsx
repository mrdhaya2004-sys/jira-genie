import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Menu,
  Bell,
  Settings,
  LogOut,
  User,
  Key,
  HelpCircle,
  Sliders,
  ChevronRight,
  StickyNote,
  BookOpenText,
} from 'lucide-react';
import NotesPanel from '@/components/notes/NotesPanel';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import DashboardSidebar from './DashboardSidebar';
import { ActiveModule } from '@/pages/DashboardPage';
import testzoneLogo from '@/assets/testzone-logo.png';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationPanel from '@/components/notifications/NotificationPanel';
import ChangePasswordDialog from '@/components/profile/ChangePasswordDialog';
import HelpChatDialog from '@/components/help/HelpChatDialog';
import LogoutConfirmDialog from '@/components/auth/LogoutConfirmDialog';

const MODULE_LABELS: Record<ActiveModule, string> = {
  'intelligence-hub': 'TestZone Intelligence Hub',
  'mentions': 'Mentions',
  'chat': 'Chat',
  'tickets': 'My Tickets',
  'history': 'History',
  'agentic-ai': 'Hive AI',
  'jira-ticket-raiser': 'Jira Ticket Raiser',
  'logic-scenario-creator': 'Scenario Creator',
  'test-case-generator': 'Test Case Generator',
  'xpath-generator': 'XPath Generator',
  'defect-analyzer': 'AI Defect Analyzer',
  'gitlab-execution': 'GitLab AI',
  'code-analyzer': 'Hive Code Analyzer',
  'ai-settings': 'AI Configuration',
  'profile': 'Profile',
  'account-settings': 'Account Settings',
  'about': 'About Us',
  'founder': 'Founder',
};

interface DashboardHeaderProps {
  activeModule: ActiveModule;
  onModuleChange: (module: ActiveModule) => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ activeModule, onModuleChange }) => {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [helpChatOpen, setHelpChatOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const {
    notifications,
    isLoading,
    unreadCount,
    hasMore,
    loadMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
    if (notification.type === 'chat' && notification.reference_id) {
      onModuleChange('chat');
    } else if (notification.type === 'jira' && notification.reference_id) {
      onModuleChange('tickets');
    } else if (notification.reference_type === 'mention') {
      onModuleChange('mentions');
    }
  };

  return (
    <header className="h-12 border-b border-border/60 bg-white dark:bg-card backdrop-blur-md flex items-center justify-between px-4 lg:px-6 relative overflow-hidden">
      {/* Celebration decorations — header only, edges only */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {/* Left cluster */}
        <span className="absolute -top-1 left-2 h-1.5 w-1.5 rounded-full bg-[#3b82f6] opacity-[0.12] dark:opacity-40 dark:shadow-[0_0_8px_#3b82f6] animate-[float_6s_ease-in-out_infinite]" />
        <span className="absolute top-3 left-8 h-1 w-3 rounded-full bg-[#06b6d4] opacity-[0.10] dark:opacity-40 dark:shadow-[0_0_8px_#06b6d4] rotate-[25deg] animate-[float_7s_ease-in-out_infinite]" />
        <span className="absolute bottom-1 left-16 h-1.5 w-1.5 rotate-45 bg-[#22c55e] opacity-[0.10] dark:opacity-40 dark:shadow-[0_0_8px_#22c55e] animate-[float_8s_ease-in-out_infinite_0.5s]" />
        <span className="absolute top-1 left-24 h-1 w-1 rounded-full bg-[#a855f7] opacity-[0.10] dark:opacity-40 dark:shadow-[0_0_8px_#a855f7] animate-[float_9s_ease-in-out_infinite_1s]" />
        <span className="absolute bottom-2 left-32 h-1 w-2 rounded-full bg-[#f97316] opacity-[0.10] dark:opacity-40 dark:shadow-[0_0_8px_#f97316] -rotate-12 animate-[float_7.5s_ease-in-out_infinite_0.3s]" />
        <div className="absolute -top-6 -left-6 h-16 w-16 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#a855f7] opacity-[0.06] dark:opacity-20 blur-2xl" />

        {/* Right cluster */}
        <span className="absolute top-2 right-4 h-1.5 w-1.5 rounded-full bg-[#a855f7] opacity-[0.12] dark:opacity-40 dark:shadow-[0_0_8px_#a855f7] animate-[float_6.5s_ease-in-out_infinite]" />
        <span className="absolute bottom-1 right-10 h-1 w-3 rounded-full bg-[#f97316] opacity-[0.10] dark:opacity-40 dark:shadow-[0_0_8px_#f97316] -rotate-[20deg] animate-[float_8s_ease-in-out_infinite_0.4s]" />
        <span className="absolute top-3 right-20 h-1.5 w-1.5 rotate-45 bg-[#22c55e] opacity-[0.10] dark:opacity-40 dark:shadow-[0_0_8px_#22c55e] animate-[float_7s_ease-in-out_infinite_1.2s]" />
        <span className="absolute -top-1 right-28 h-1 w-1 rounded-full bg-[#06b6d4] opacity-[0.10] dark:opacity-40 dark:shadow-[0_0_8px_#06b6d4] animate-[float_9s_ease-in-out_infinite_0.8s]" />
        <span className="absolute bottom-2 right-36 h-1 w-2 rounded-full bg-[#3b82f6] opacity-[0.10] dark:opacity-40 dark:shadow-[0_0_8px_#3b82f6] rotate-12 animate-[float_7.5s_ease-in-out_infinite_0.6s]" />
        <div className="absolute -top-6 -right-6 h-16 w-16 rounded-full bg-gradient-to-br from-[#06b6d4] via-[#22c55e] to-[#f97316] opacity-[0.06] dark:opacity-20 blur-2xl" />
      </div>

      {/* Subtle bottom gradient accent */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      
      {/* Left side - Logo & Mobile Menu & Breadcrumb */}
      <div className="flex items-center gap-3">
        {/* Mobile Menu */}
        <div className="lg:hidden">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <DashboardSidebar 
                activeModule={activeModule}
                onModuleChange={onModuleChange}
                onAfterNavigate={() => setMobileNavOpen(false)}
              />
            </SheetContent>
          </Sheet>
        </div>

        {/* Logo & Breadcrumb */}
        <div className="flex items-center gap-2">
          <img src={testzoneLogo} alt="Test Zone" className="h-7 w-7 rounded-md object-contain lg:hidden" />
          <span className="text-muted-foreground/60 hidden lg:inline">
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
          <span className="text-sm font-medium text-foreground/80 hidden lg:inline">
            {MODULE_LABELS[activeModule]}
          </span>
          <span className="font-semibold text-foreground sm:inline lg:hidden">Test Zone</span>
        </div>
      </div>

      {/* Right side - Actions & Profile */}
      <div className="flex items-center gap-1.5">
        {/* QA Mock Test */}
        <Button
          variant="ghost"
          size="icon"
          className="menu-item-shine h-9 w-9 group hover:bg-primary/10"
          aria-label="QA Mock Test"
          onClick={() => navigate('/qa-mock-test')}
        >
          <BookOpenText className="h-[18px] w-[18px] text-primary" />
        </Button>

        {/* Smart Notes */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="menu-item-shine h-9 w-9 group note-glow" aria-label="Smart Notes">
              <StickyNote className="h-[18px] w-[18px] note-amber" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="p-0 w-auto" sideOffset={8}>
            <NotesPanel />
          </PopoverContent>
        </Popover>

        {/* Notifications Bell */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className={`menu-item-shine relative h-9 w-9 group bell-glow ${unreadCount > 0 ? 'notification-pulse' : ''}`}>
              <Bell className="h-[18px] w-[18px] bell-golden" />
              <span className="bell-shine" aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-card" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="p-0 w-auto" sideOffset={8}>
            <NotificationPanel
              notifications={notifications}
              isLoading={isLoading}
              hasMore={hasMore}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
              onDelete={deleteNotification}
              onLoadMore={loadMore}
              onNotificationClick={handleNotificationClick}
            />
          </PopoverContent>
        </Popover>
        
        {/* Profile Dropdown — iOS 26 glassmorphism */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="menu-item-shine group flex items-center gap-2 h-9 px-2 rounded-full hover:bg-primary/10 transition-all duration-300"
            >
              <span className="relative">
                <Avatar className="h-7 w-7 ring-2 ring-primary/30 group-hover:ring-primary/60 transition-all duration-300 shadow-sm">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-xs font-semibold">
                    {profile?.full_name ? getInitials(profile.full_name) : 'U'}
                  </AvatarFallback>
                </Avatar>
                {/* Online indicator */}
                <span className="absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card shadow-[0_0_6px_hsl(var(--primary)/0.6)]" />
              </span>
              <span className="text-sm font-medium hidden md:inline">{profile?.full_name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={10}
            className="w-72 p-0 overflow-hidden rounded-[20px] border border-black/[0.08] dark:border-white/[0.08]
              bg-white dark:bg-[#111827]
              shadow-[0_20px_40px_rgba(0,0,0,0.12)]
              data-[state=open]:animate-in data-[state=closed]:animate-out
              data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
              data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95
              data-[side=bottom]:slide-in-from-top-2"
          >

            {/* Profile header */}
            <div className="relative px-4 pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-12 w-12 ring-2 ring-primary/40 shadow-[0_4px_18px_-4px_hsl(var(--primary)/0.5)]">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-sm font-semibold">
                      {profile?.full_name ? getInitials(profile.full_name) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-popover" />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate leading-tight">
                    {profile?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
                  <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary))]" />
                    Member
                  </span>
                </div>
              </div>
            </div>

            {/* Soft separator */}
            <div className="relative mx-3 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />

            {/* Menu items */}
            <div className="relative p-1.5">
              <DropdownMenuItem
                className="group cursor-pointer gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-200
                  hover:bg-[#F5F7FA] focus:bg-[#F5F7FA] hover:text-primary focus:text-primary hover:translate-x-0.5
                  data-[highlighted]:bg-[#F5F7FA] data-[highlighted]:text-primary"
                onClick={() => onModuleChange('profile')}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                  <User className="h-3.5 w-3.5" />
                </span>
                Profile
              </DropdownMenuItem>

              <DropdownMenuItem
                className="group cursor-pointer gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-200
                  hover:bg-[#F5F7FA] focus:bg-[#F5F7FA] hover:text-primary focus:text-primary hover:translate-x-0.5
                  data-[highlighted]:bg-[#F5F7FA] data-[highlighted]:text-primary"
                onClick={() => setChangePasswordOpen(true)}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                  <Key className="h-3.5 w-3.5" />
                </span>
                Change Password
              </DropdownMenuItem>

              <DropdownMenuItem
                className="group cursor-pointer gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-200
                  hover:bg-[#F5F7FA] focus:bg-[#F5F7FA] hover:text-primary focus:text-primary hover:translate-x-0.5
                  data-[highlighted]:bg-[#F5F7FA] data-[highlighted]:text-primary"
                onClick={() => onModuleChange('account-settings')}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                  <Settings className="h-3.5 w-3.5" />
                </span>
                Account Settings
              </DropdownMenuItem>

              <DropdownMenuItem
                className="group cursor-pointer gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-200
                  hover:bg-[#F5F7FA] focus:bg-[#F5F7FA] hover:text-primary focus:text-primary hover:translate-x-0.5
                  data-[highlighted]:bg-[#F5F7FA] data-[highlighted]:text-primary"
                onClick={() => onModuleChange('account-settings')}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                  <Sliders className="h-3.5 w-3.5" />
                </span>
                Preferences
              </DropdownMenuItem>

              <div className="my-1.5 mx-2 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />

              <DropdownMenuItem
                className="group cursor-pointer gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-200
                  hover:bg-[#F5F7FA] focus:bg-[#F5F7FA] hover:text-primary focus:text-primary hover:translate-x-0.5
                  data-[highlighted]:bg-[#F5F7FA] data-[highlighted]:text-primary"
                onClick={() => setHelpChatOpen(true)}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                  <HelpCircle className="h-3.5 w-3.5" />
                </span>
                Help
              </DropdownMenuItem>

              <div className="my-1.5 mx-2 h-px bg-gradient-to-r from-transparent via-destructive/30 to-transparent" />

              <DropdownMenuItem
                className="group cursor-pointer gap-3 rounded-xl px-3 py-2 text-sm text-destructive transition-all duration-200
                  hover:bg-red-50 focus:bg-red-50 hover:translate-x-0.5
                  data-[highlighted]:bg-red-50 data-[highlighted]:text-destructive"
                onClick={() => setLogoutOpen(true)}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-destructive/10 text-destructive transition-all group-hover:bg-destructive/20 group-hover:animate-pulse">
                  <LogOut className="h-3.5 w-3.5" />
                </span>
                Logout
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
      <HelpChatDialog open={helpChatOpen} onOpenChange={setHelpChatOpen} />
      <LogoutConfirmDialog open={logoutOpen} onOpenChange={setLogoutOpen} onConfirm={signOut} />
      
    </header>
  );
};

export default DashboardHeader;
