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
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
  'mentions': 'Mentions',
  'chat': 'Chat',
  'tickets': 'My Tickets',
  'history': 'History',
  'agentic-ai': 'Hive AI',
  'jira-ticket-raiser': 'Jira Ticket Raiser',
  'logic-scenario-creator': 'Scenario Creator',
  'test-case-generator': 'Test Case Generator',
  'xpath-generator': 'XPath Generator',
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
    <header className="h-12 border-b border-border/60 bg-gradient-to-r from-primary/5 via-card/90 to-primary/5 backdrop-blur-md flex items-center justify-between px-4 lg:px-6 relative">
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
          className="h-9 w-9 group hover:bg-primary/10"
          aria-label="QA Mock Test"
          onClick={() => navigate('/qa-mock-test')}
        >
          <BookOpenText className="h-[18px] w-[18px] text-primary" />
        </Button>

        {/* Smart Notes */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 group note-glow" aria-label="Smart Notes">
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
            <Button variant="ghost" size="icon" className={`relative h-9 w-9 group bell-glow ${unreadCount > 0 ? 'notification-pulse' : ''}`}>
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
        
        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 h-9 px-2 hover:bg-accent/60">
              <Avatar className="h-7 w-7 ring-1 ring-border/50">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {profile?.full_name ? getInitials(profile.full_name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden md:inline">{profile?.full_name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-popover border border-border shadow-lg z-50">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{profile?.full_name}</p>
                <p className="text-xs text-muted-foreground">{profile?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => onModuleChange('profile')}>
              <User className="h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => setChangePasswordOpen(true)}>
              <Key className="h-4 w-4" />
              Change Password
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => onModuleChange('account-settings')}>
              <Settings className="h-4 w-4" />
              Account Settings
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => onModuleChange('account-settings')}>
              <Sliders className="h-4 w-4" />
              Preferences
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => setHelpChatOpen(true)}>
              <HelpCircle className="h-4 w-4" />
              Help
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-destructive gap-2" onClick={() => setLogoutOpen(true)}>
              <LogOut className="h-4 w-4" />
              Logout
            </DropdownMenuItem>
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
