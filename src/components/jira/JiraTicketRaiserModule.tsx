import React, { useState } from 'react';
import { ChatProvider, useChat } from '@/contexts/ChatContext';
import ChatContainer from '@/components/chat/ChatContainer';
import { Settings, FolderKanban, Sparkles, Activity, Zap, Link2, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import JiraSettingsDialog from '@/components/jira/JiraSettingsDialog';
import JiraConnectionGate from '@/components/jira/JiraConnectionGate';
import { useJiraConnection } from '@/hooks/useJiraConnection';
import jiraLogo from '@/assets/jira-logo.png';

import SmartBackButton from '@/components/common/SmartBackButton';
const ConnectedProjectBanner: React.FC = () => {
  const { jiraMetadata } = useChat();
  if (!jiraMetadata?.projectKey) return null;
  return (
    <div className="relative px-3 sm:px-6 py-2 border-b border-white/10 bg-gradient-to-r from-[#4F46E5]/[0.08] via-[#8B5CF6]/[0.05] to-[#F59E0B]/[0.04] backdrop-blur-xl">
      <div className="flex items-center gap-2 text-xs">
        <div className="flex items-center justify-center h-6 w-6 rounded-lg bg-[#4F46E5]/15 ring-1 ring-inset ring-[#4F46E5]/30 shadow-[0_0_12px_-2px_rgba(79,70,229,0.5)]">
          <FolderKanban className="h-3.5 w-3.5 text-[#4F46E5] dark:text-[#8B5CF6]" />
        </div>
        <span className="text-muted-foreground">
          Connected to{' '}
          <span className="font-semibold text-foreground">
            {jiraMetadata.projectName || jiraMetadata.projectKey}
          </span>{' '}
          <span className="text-muted-foreground/70">({jiraMetadata.projectKey})</span>
          <span className="hidden sm:inline ml-1.5 text-muted-foreground/60">— tickets will be created in this project</span>
        </span>
      </div>
    </div>
  );
};

const GlassChip: React.FC<{
  icon: React.ReactNode;
  label: string;
  color: string;
  glow: string;
  pulse?: boolean;
}> = ({ icon, label, color, glow, pulse }) => (
  <div
    className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/[0.06] border border-white/15 backdrop-blur-2xl backdrop-saturate-150 transition-all duration-250 hover:-translate-y-[1px]"
    style={{ boxShadow: `0 8px 24px -12px ${glow}` }}
  >
    <div className="relative flex items-center justify-center">
      <span style={{ color }} className="flex">{icon}</span>
      {pulse && (
        <span
          className="absolute inset-0 rounded-full animate-ping opacity-50"
          style={{ background: color }}
        />
      )}
    </div>
    <span className="text-[10px] font-semibold tracking-wide uppercase" style={{ color }}>
      {label}
    </span>
  </div>
);

interface JiraTicketRaiserModuleProps {
  onNavigateBack?: () => void;
}

const JiraTicketRaiserModule: React.FC<JiraTicketRaiserModuleProps> = ({ onNavigateBack }) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [gateDismissed, setGateDismissed] = useState(false);
  const connection = useJiraConnection();

  const handleGateConnect = () => setSettingsOpen(true);
  const handleGateCancel = () => {
    if (onNavigateBack) onNavigateBack();
    else setGateDismissed(true);
  };

  const showGate = !connection.loading && connection.status !== 'connected' && !settingsOpen && !gateDismissed;
  const isConnected = connection.status === 'connected';

  return (
    <ChatProvider>
      <div className="relative h-full flex flex-col overflow-hidden bg-[#F7F9FC] dark:bg-[#0B0D14]">
        {/* Premium ambient aurora background — Indigo / Azure / Orange / Purple */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-32 h-[420px] w-[420px] rounded-full blur-[80px] opacity-[0.22]"
               style={{ background: 'radial-gradient(circle, #4F46E5 0%, transparent 70%)' }} />
          <div className="absolute -top-32 -right-24 h-[440px] w-[440px] rounded-full blur-[80px] opacity-[0.20]"
               style={{ background: 'radial-gradient(circle, #2563EB 0%, transparent 70%)' }} />
          <div className="absolute -bottom-40 -left-20 h-[400px] w-[400px] rounded-full blur-[80px] opacity-[0.18]"
               style={{ background: 'radial-gradient(circle, #F59E0B 0%, transparent 70%)' }} />
          <div className="absolute -bottom-32 -right-32 h-[440px] w-[440px] rounded-full blur-[80px] opacity-[0.20]"
               style={{ background: 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)' }} />
          <div className="absolute top-1/2 left-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.08] blur-[50px]" />
        </div>

        {/* Compact floating glass header */}
        <div className="relative z-10 mx-2 sm:mx-4 mt-2 sm:mt-3 rounded-2xl border border-white/15 bg-white/[0.08] backdrop-blur-[35px] backdrop-saturate-150 shadow-[0_20px_60px_-20px_rgba(79,70,229,0.25)]">
          {/* Top edge highlight */}
          <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#4F46E5]/50 to-transparent" />

          <div className="flex items-center justify-between gap-2 px-3 sm:px-5 py-3">
              <SmartBackButton className="mr-1 shrink-0" showBreadcrumb={false} />
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
              <div className="relative shrink-0">
                {/* Multi-color halo */}
                <div className="absolute -inset-1 rounded-2xl opacity-70 blur-lg"
                     style={{ background: 'conic-gradient(from 0deg, #4F46E5, #2563EB, #8B5CF6, #F59E0B, #FB7185, #4F46E5)' }} />
                <div className="relative h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-white/95 backdrop-blur-xl flex items-center justify-center p-1.5 ring-1 ring-inset ring-white/40 shadow-[0_8px_24px_-8px_rgba(79,70,229,0.6)]">
                  <img src={jiraLogo} alt="Jira Ticket Raiser" className="h-full w-full rounded-lg object-contain" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <h1 className="text-[18px] sm:text-[20px] font-bold tracking-tight truncate bg-gradient-to-r from-[#4F46E5] via-[#8B5CF6] to-[#F59E0B] bg-clip-text text-transparent">
                    🎫 Jira Ticket Raiser
                  </h1>
                </div>
                <p className="flex items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground/80 truncate">
                  <Sparkles className="h-3 w-3 text-[#8B5CF6]" />
                  AI-powered defect analysis and enterprise ticket creation
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <GlassChip
                icon={<Zap className="h-3 w-3" />}
                label="AI Ready"
                color="#8B5CF6"
                glow="rgba(139,92,246,0.6)"
                pulse
              />
              {isConnected && (
                <GlassChip
                  icon={<Link2 className="h-3 w-3" />}
                  label="Jira Connected"
                  color="#14B8A6"
                  glow="rgba(20,184,166,0.6)"
                />
              )}
              <GlassChip
                icon={<Layers className="h-3 w-3" />}
                label="Workspace"
                color="#2563EB"
                glow="rgba(37,99,235,0.5)"
              />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSettingsOpen(true)}
                    className="relative h-9 w-9 rounded-full bg-white/[0.06] border border-white/15 backdrop-blur-xl hover:bg-white/[0.12] hover:border-[#4F46E5]/40 hover:-translate-y-[1px] hover:shadow-[0_8px_24px_-8px_rgba(79,70,229,0.6)] active:scale-95 transition-all duration-250"
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    {isConnected && (
                      <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#14B8A6] border-2 border-background shadow-[0_0_8px_rgba(20,184,166,0.9)]" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Jira Settings</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-2">
          <ConnectedProjectBanner />
        </div>

        <div className="relative z-10 flex-1 overflow-hidden px-2 sm:px-4 pb-2 sm:pb-3 pt-2">
          <div className="h-full rounded-2xl border border-white/15 bg-white/[0.06] backdrop-blur-[35px] backdrop-saturate-150 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.15)] overflow-hidden">
            <ChatContainer />
          </div>
        </div>
      </div>

      {showGate && (
        <JiraConnectionGate
          status={connection.status}
          loading={connection.loading}
          onConnect={handleGateConnect}
          onCancel={handleGateCancel}
        />
      )}

      <JiraSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        connection={connection}
      />
    </ChatProvider>
  );
};

export default JiraTicketRaiserModule;
