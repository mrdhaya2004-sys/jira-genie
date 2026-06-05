import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPreferences } from '@/hooks/useUserPreferences';

import { useJiraConnection } from '@/hooks/useJiraConnection';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import AvatarUpload from '@/components/auth/AvatarUpload';
import ChangePasswordDialog from '@/components/profile/ChangePasswordDialog';
import TwoFactorSection from '@/components/profile/TwoFactorSection';
import HiveAIDisableDialog from '@/components/hiveai/HiveAIDisableDialog';
import {
  User, Shield, Brain, Bot, Bell, FlaskConical, Link2, Palette,
  Pencil, Lock, Key, Monitor, Smartphone, Loader2, Save,
  CheckCircle, XCircle, AtSign, Mail, IdCard, Phone, Calendar,
  Settings2, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

// Section navigation items
const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'ai-preferences', label: 'AI Preferences', icon: Brain },
  { id: 'hive-ai', label: 'Hive AI', icon: Bot },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'testing', label: 'Testing', icon: FlaskConical },
  { id: 'integrations', label: 'Integrations', icon: Link2 },
  { id: 'appearance', label: 'Appearance', icon: Palette },
] as const;

type SectionId = typeof SECTIONS[number]['id'];

const AccountSettingsModule: React.FC = () => {
  const { profile, user, refreshProfile } = useAuth();
  const { preferences, isLoading, isSaving, savePreferences } = useUserPreferences();
  const hiveEnabled = preferences.hive_chat_enabled;
  
  const jiraState = useJiraConnection();
  const [activeSection, setActiveSection] = useState<SectionId>('profile');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showDisableHive, setShowDisableHive] = useState(false);

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // ─── Profile Section ──────────────────────
  const ProfileSection = () => (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <AvatarUpload
              currentAvatarUrl={profile?.avatar_url}
              userId={profile?.user_id || ''}
              userName={profile?.full_name}
              onAvatarUpdated={() => refreshProfile()}
              size="md"
            />
            <div className="space-y-1 text-center sm:text-left flex-1">
              <h2 className="text-xl font-bold text-foreground">{profile?.full_name}</h2>
              {profile?.profile_id && (
                <Badge variant="secondary" className="text-sm font-medium gap-1">
                  <AtSign className="h-3.5 w-3.5" />
                  {profile.profile_id.replace('@', '')}
                </Badge>
              )}
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-primary" />
            Profile Details
          </CardTitle>
          <CardDescription>Your personal information. Edit via the Profile module.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoRow icon={<User className="h-4 w-4" />} label="Full Name" value={profile?.full_name} />
            <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={profile?.email} />
            <InfoRow icon={<IdCard className="h-4 w-4" />} label="Employee ID" value={profile?.employee_id} />
            <InfoRow icon={<Phone className="h-4 w-4" />} label="Mobile" value={profile?.mobile_number || 'N/A'} />
            {profile?.profile_id && (
              <InfoRow icon={<AtSign className="h-4 w-4" />} label="Username" value={profile.profile_id} />
            )}
            {profile?.date_of_birth && (
              <InfoRow icon={<Calendar className="h-4 w-4" />} label="Date of Birth" value={profile.date_of_birth} />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ─── Security Section ──────────────────────
  const SecuritySection = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5 text-primary" />
            Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-3">
              <Key className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Account Password</p>
                <p className="text-xs text-muted-foreground">Update your account password</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowChangePassword(true)}>
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>

      <TwoFactorSection />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Monitor className="h-5 w-5 text-primary" />
            Active Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-3">
              <Monitor className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Current Session</p>
                <p className="text-xs text-muted-foreground">This device • Active now</p>
              </div>
            </div>
            <Badge variant="default" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100">
              Active
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ─── AI Preferences Section ──────────────────────
  const AIPreferencesSection = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="h-5 w-5 text-primary" />
          AI Preferences
        </CardTitle>
        <CardDescription>Configure how AI modules respond to your requests.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <SettingSelect
          label="Preferred Programming Language"
          description="AI will default to this language for code generation"
          value={preferences.preferred_language}
          onChange={(v) => savePreferences({ preferred_language: v })}
          options={[
            { value: 'javascript', label: 'JavaScript' },
            { value: 'typescript', label: 'TypeScript' },
            { value: 'python', label: 'Python' },
            { value: 'java', label: 'Java' },
            { value: 'csharp', label: 'C#' },
            { value: 'go', label: 'Go' },
            { value: 'ruby', label: 'Ruby' },
          ]}
        />
        <Separator />
        <SettingSelect
          label="Response Style"
          description="How detailed AI responses should be"
          value={preferences.response_style}
          onChange={(v) => savePreferences({ response_style: v })}
          options={[
            { value: 'concise', label: 'Concise' },
            { value: 'detailed', label: 'Detailed' },
            { value: 'step-by-step', label: 'Step by Step' },
          ]}
        />
        <Separator />
        <SettingToggle
          label="Auto Code Playground"
          description="Automatically open code playground with generated code"
          checked={preferences.auto_code_playground}
          onChange={(v) => savePreferences({ auto_code_playground: v })}
        />
        <Separator />
        <SettingToggle
          label="Module Suggestions"
          description="Show smart module suggestions based on context"
          checked={preferences.module_suggestions}
          onChange={(v) => savePreferences({ module_suggestions: v })}
        />
      </CardContent>
    </Card>
  );

  // ─── Hive AI Section ──────────────────────
  const HiveAISection = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bot className="h-5 w-5 text-primary" />
          Hive AI Settings
        </CardTitle>
        <CardDescription>Control the Hive AI floating assistant behavior.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <SettingToggle
          label="Enable Hive AI Chat"
          description={hiveEnabled ? 'Floating assistant is visible on all pages' : 'Floating assistant is hidden'}
          checked={hiveEnabled}
          onChange={(checked) => {
            if (!checked) setShowDisableHive(true);
            else {
              savePreferences({ hive_chat_enabled: true });
              toast("🐝 Hive AI Chat is back!", { description: "The floating assistant is now visible." });
            }
          }}
        />
        <Separator />
        <SettingToggle
          label="Auto Open on Page Load"
          description="Automatically open the chat when navigating to a new module"
          checked={preferences.hive_auto_open}
          onChange={(v) => savePreferences({ hive_auto_open: v })}
        />
        <Separator />
        <SettingSelect
          label="Button Behavior"
          description="How the floating button behaves"
          value={preferences.hive_button_behavior}
          onChange={(v) => savePreferences({ hive_button_behavior: v })}
          options={[
            { value: 'float', label: 'Floating (draggable)' },
            { value: 'fixed', label: 'Fixed position' },
            { value: 'minimized', label: 'Minimized icon' },
          ]}
        />
      </CardContent>
    </Card>
  );

  // ─── Notifications Section ──────────────────────
  const NotificationsSection = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="h-5 w-5 text-primary" />
          Notification Settings
        </CardTitle>
        <CardDescription>Choose what notifications you receive and how.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Notification Types</p>
          <div className="space-y-4">
            <SettingToggle
              label="Mentions"
              description="Get notified when someone mentions you"
              checked={preferences.notify_mentions}
              onChange={(v) => savePreferences({ notify_mentions: v })}
            />
            <SettingToggle
              label="Jira Alerts"
              description="Ticket creation, updates, and assignments"
              checked={preferences.notify_jira}
              onChange={(v) => savePreferences({ notify_jira: v })}
            />
            <SettingToggle
              label="Test Updates"
              description="Test case generation and execution results"
              checked={preferences.notify_tests}
              onChange={(v) => savePreferences({ notify_tests: v })}
            />
          </div>
        </div>
        <Separator />
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Delivery Channels</p>
          <div className="space-y-4">
            <SettingToggle
              label="In-App Notifications"
              description="Show notifications in the bell icon"
              checked={preferences.notify_inapp}
              onChange={(v) => savePreferences({ notify_inapp: v })}
            />
            <SettingToggle
              label="Email Notifications"
              description="Receive important notifications via email"
              checked={preferences.notify_email}
              onChange={(v) => savePreferences({ notify_email: v })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // ─── Testing Section ──────────────────────
  const TestingSection = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FlaskConical className="h-5 w-5 text-primary" />
          Testing Preferences
        </CardTitle>
        <CardDescription>Configure default testing behavior.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <SettingSelect
          label="Default Device"
          description="Default browser/device for test execution"
          value={preferences.default_device}
          onChange={(v) => savePreferences({ default_device: v })}
          options={[
            { value: 'chrome', label: 'Google Chrome' },
            { value: 'firefox', label: 'Firefox' },
            { value: 'safari', label: 'Safari' },
            { value: 'edge', label: 'Microsoft Edge' },
            { value: 'mobile-android', label: 'Android Mobile' },
            { value: 'mobile-ios', label: 'iOS Mobile' },
          ]}
        />
        <Separator />
        <SettingSelect
          label="Default Test Mode"
          description="How tests should run by default"
          value={preferences.default_test_mode}
          onChange={(v) => savePreferences({ default_test_mode: v })}
          options={[
            { value: 'manual', label: 'Manual' },
            { value: 'automated', label: 'Automated' },
            { value: 'hybrid', label: 'Hybrid' },
          ]}
        />
        <Separator />
        <SettingToggle
          label="Auto-Run Tests"
          description="Automatically run tests after generation"
          checked={preferences.auto_run_tests}
          onChange={(v) => savePreferences({ auto_run_tests: v })}
        />
        <Separator />
        <SettingToggle
          label="Screenshot on Failure"
          description="Capture screenshots when a test step fails"
          checked={preferences.screenshot_on_failure}
          onChange={(v) => savePreferences({ screenshot_on_failure: v })}
        />
      </CardContent>
    </Card>
  );

  // ─── Integrations Section ──────────────────────
  const IntegrationsSection = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Link2 className="h-5 w-5 text-primary" />
          Integrations
        </CardTitle>
        <CardDescription>Manage external service connections.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">J</span>
            </div>
            <div>
              <p className="text-sm font-medium">Jira</p>
              <p className="text-xs text-muted-foreground">
                {jiraState.status === 'connected' ? `Connected to ${jiraState.data.jiraDomain}` : 'Not connected'}
              </p>
            </div>
          </div>
          <Badge
            variant={jiraState.status === 'connected' ? 'default' : 'destructive'}
            className={jiraState.status === 'connected'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100'
              : ''
            }
          >
            {jiraState.status === 'connected' ? '● Connected' : 'Disconnected'}
          </Badge>
        </div>

        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <span className="text-orange-600 dark:text-orange-400 font-bold text-sm">G</span>
            </div>
            <div>
              <p className="text-sm font-medium">GitLab</p>
              <p className="text-xs text-muted-foreground">Not connected</p>
            </div>
          </div>
          <Badge variant="secondary">Coming Soon</Badge>
        </div>

        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Key className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium">API Keys</p>
              <p className="text-xs text-muted-foreground">Manage via AI Configuration module</p>
            </div>
          </div>
          <Badge variant="secondary">AI Config</Badge>
        </div>
      </CardContent>
    </Card>
  );

  // ─── Appearance Section ──────────────────────
  const AppearanceSection = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Palette className="h-5 w-5 text-primary" />
          Appearance
        </CardTitle>
        <CardDescription>Customize the look and feel of Test Zone.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <SettingSelect
          label="Theme"
          description="Choose your preferred color scheme"
          value={preferences.theme}
          onChange={(v) => {
            savePreferences({ theme: v });
            // Apply theme
            const root = document.documentElement;
            if (v === 'dark') {
              root.classList.add('dark');
              localStorage.setItem('theme', 'dark');
            } else if (v === 'light') {
              root.classList.remove('dark');
              localStorage.setItem('theme', 'light');
            } else {
              localStorage.removeItem('theme');
              if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                root.classList.add('dark');
              } else {
                root.classList.remove('dark');
              }
            }
          }}
          options={[
            { value: 'system', label: 'System Default' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
        />
        <Separator />
        <SettingToggle
          label="Compact UI"
          description="Reduce spacing and padding for a denser layout"
          checked={preferences.compact_ui}
          onChange={(v) => savePreferences({ compact_ui: v })}
        />
      </CardContent>
    </Card>
  );

  const sectionContent: Record<SectionId, React.ReactNode> = {
    'profile': <ProfileSection />,
    'security': <SecuritySection />,
    'ai-preferences': <AIPreferencesSection />,
    'hive-ai': <HiveAISection />,
    'notifications': <NotificationsSection />,
    'testing': <TestingSection />,
    'integrations': <IntegrationsSection />,
    'appearance': <AppearanceSection />,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex bg-gradient-to-br from-background via-background to-primary/[0.03]">
      {/* Left: Section Nav */}
      <aside className="w-64 flex-shrink-0 hidden md:flex flex-col p-3 animate-fade-in">
        <div className="relative flex-1 flex flex-col rounded-3xl border border-white/10 bg-card/40 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.25),0_8px_24px_-12px_hsl(0_0%_0%/0.15)] overflow-hidden">
          {/* Glow accents */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          <div className="pointer-events-none absolute -top-24 -left-12 h-48 w-48 rounded-full bg-primary/20 blur-3xl opacity-60" />
          <div className="pointer-events-none absolute -bottom-24 -right-12 h-48 w-48 rounded-full bg-cyan-400/15 blur-3xl opacity-50" />

          {/* Header */}
          <div className="relative px-5 pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 rounded-2xl bg-gradient-to-br from-primary/25 to-cyan-400/15 border border-primary/30 flex items-center justify-center shadow-[0_0_20px_-4px_hsl(var(--primary)/0.5)]">
                <Settings2 className="h-5 w-5 text-primary" />
                <span className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/15" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-foreground tracking-tight leading-tight">Account Settings</h2>
                <p className="text-[11px] text-muted-foreground/80 leading-tight mt-0.5">Manage your workspace</p>
              </div>
            </div>
          </div>

          <div className="mx-4 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />

          {/* Nav */}
          <nav className="relative flex-1 px-2.5 py-3 overflow-y-auto scrollbar-thin">
            {SECTIONS.map((section, idx) => {
              const isActive = activeSection === section.id;
              const isHive = section.id === 'hive-ai';
              return (
                <React.Fragment key={section.id}>
                  <button
                    onClick={() => setActiveSection(section.id)}
                    style={{ animationDelay: `${idx * 30}ms` }}
                    className={cn(
                      "group relative w-full flex items-center gap-3 pl-3.5 pr-3 py-2.5 rounded-xl text-[13px] font-medium",
                      "transition-all duration-300 ease-out animate-fade-in",
                      isActive
                        ? "text-foreground bg-gradient-to-r from-primary/15 via-primary/10 to-cyan-400/5 border border-primary/25 shadow-[0_4px_16px_-6px_hsl(var(--primary)/0.4),inset_0_1px_0_0_hsl(0_0%_100%/0.08)] -translate-y-px"
                        : "text-muted-foreground border border-transparent hover:text-foreground hover:bg-white/[0.04] hover:border-white/10 hover:translate-x-0.5"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-gradient-to-b from-primary to-cyan-400 transition-all duration-300",
                        isActive ? "h-6 opacity-100 shadow-[0_0_8px_hsl(var(--primary)/0.8)]" : "h-0 opacity-0"
                      )}
                    />
                    <span
                      className={cn(
                        "relative flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-300",
                        isActive
                          ? "bg-primary/15 text-primary shadow-[0_0_12px_-2px_hsl(var(--primary)/0.6)]"
                          : "text-muted-foreground/80 group-hover:text-foreground group-hover:bg-white/[0.04]"
                      )}
                    >
                      <section.icon className="h-4 w-4" />
                      {isHive && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75 animate-ping" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_6px_hsl(190_100%_60%)]" />
                        </span>
                      )}
                    </span>
                    <span className="flex-1 text-left tracking-tight">{section.label}</span>
                  </button>
                  {idx < SECTIONS.length - 1 && (
                    <div
                      className="h-px mx-3 my-2.5 bg-gradient-to-r from-transparent via-black/[0.06] to-transparent dark:via-white/[0.08]"
                      aria-hidden="true"
                    />
                  )}
                </React.Fragment>
              );
            })}
          </nav>

          {/* Pro upgrade card */}
          <div className="relative p-3">
            <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-cyan-400/10 p-3 backdrop-blur-xl">
              <div className="pointer-events-none absolute -top-6 -right-6 h-20 w-20 rounded-full bg-primary/30 blur-2xl" />
              <div className="relative flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center shadow-[0_0_16px_-2px_hsl(var(--primary)/0.7)]">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-foreground leading-tight">Test Zone Pro</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">Unlock advanced AI</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile section selector */}
      <div className="md:hidden w-full">
        <div className="border-b border-border/60 px-4 py-3">
          <Select value={activeSection} onValueChange={(v) => setActiveSection(v as SectionId)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SECTIONS.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ScrollArea className="h-[calc(100vh-8rem)]">
          <div className="p-4 max-w-2xl mx-auto">
            {sectionContent[activeSection]}
          </div>
        </ScrollArea>
      </div>

      {/* Right: Content */}
      <div className="flex-1 hidden md:block">
        <ScrollArea className="h-full">
          <div className="p-6 lg:p-8 max-w-2xl animate-fade-in-page">
            <div className="mb-6">
              <h1 className="text-xl font-bold text-foreground">
                {SECTIONS.find(s => s.id === activeSection)?.label}
              </h1>
            </div>
            {sectionContent[activeSection]}
          </div>
        </ScrollArea>
      </div>

      {/* Dialogs */}
      <ChangePasswordDialog open={showChangePassword} onOpenChange={setShowChangePassword} />
      <HiveAIDisableDialog
        open={showDisableHive}
        onConfirm={() => { setShowDisableHive(false); savePreferences({ hive_chat_enabled: false }); }}
        onCancel={() => setShowDisableHive(false)}
      />
    </div>
  );
};

// ─── Reusable Sub-components ──────────────────────

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
      <span className="text-muted-foreground flex-shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value || 'N/A'}</p>
      </div>
    </div>
  );
}

function SettingToggle({ label, description, checked, onChange }: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5 flex-1 mr-4">
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function SettingSelect({ label, description, value, onChange, options }: {
  label: string;
  description: string;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5 flex-1 mr-4">
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default AccountSettingsModule;
