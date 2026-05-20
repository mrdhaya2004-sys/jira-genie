import React, { useState } from 'react';
import { ChatProvider, useChat } from '@/contexts/ChatContext';
import ChatContainer from '@/components/chat/ChatContainer';
import { Settings, FolderKanban, Sparkles, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import JiraSettingsDialog from '@/components/jira/JiraSettingsDialog';
import JiraConnectionGate from '@/components/jira/JiraConnectionGate';
import { useJiraConnection } from '@/hooks/useJiraConnection';
import jiraLogo from '@/assets/jira-logo.png';

const ConnectedProjectBanner: React.FC = () => {
  const { jiraMetadata } = useChat();
  if (!jiraMetadata?.projectKey) return null;
  return (
    <div className="relative px-3 sm:px-6 py-2 border-b border-white/10 bg-gradient-to-r from-primary/[0.06] via-cyan-400/[0.04] to-transparent backdrop-blur-xl">
      <div className="flex items-center gap-2 text-xs">
        <div className="flex items-center justify-center h-6 w-6 rounded-lg bg-primary/15 ring-1 ring-inset ring-primary/25 shadow-[0_0_12px_-2px_hsl(var(--primary)/0.5)]">
          <FolderKanban className="h-3.5 w-3.5 text-primary" />
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

const LiveStatusIndicator: React.FC = () => (
  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 backdrop-blur-md shadow-[0_0_16px_-4px_hsl(150_80%_45%/0.5)]">
    <div className="relative">
      <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_hsl(150_80%_45%)]" />
      <div className="absolute inset-0 h-2 w-2 rounded-full bg-emerald-500 animate-ping opacity-60" />
    </div>
    <span className="text-[10px] font-bold tracking-widest text-emerald-500 uppercase">Live</span>
  </div>
);

interface JiraTicketRaiserModuleProps {
  onNavigateBack?: () => void;
}

const JiraTicketRaiserModule: React.FC<JiraTicketRaiserModuleProps> = ({ onNavigateBack }) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [gateDismissed, setGateDismissed] = useState(false);
  const connection = useJiraConnection();

  const handleGateConnect = () => {
    setSettingsOpen(true);
  };

  const handleGateCancel = () => {
    if (onNavigateBack) {
      onNavigateBack();
    } else {
      setGateDismissed(true);
    }
  };

  const showGate = !connection.loading && connection.status !== 'connected' && !settingsOpen && !gateDismissed;

  return (
    <ChatProvider>
      <div className="relative h-full flex flex-col bg-background overflow-hidden">
        {/* Ambient glow background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl opacity-60" />
          <div className="absolute -top-20 right-0 h-80 w-80 rounded-full bg-cyan-400/15 blur-3xl opacity-50" />
          <div className="absolute top-1/3 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-sky-500/10 blur-3xl" />
        </div>

        {/* Premium glass header */}
        <div className="relative z-10 px-3 sm:px-6 py-3 sm:py-4 border-b border-white/10 bg-card/40 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_8px_32px_-12px_hsl(var(--primary)/0.15)]">
          {/* Top edge highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/40 to-cyan-400/30 blur-md opacity-70" />
                <div className="relative h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-white/90 backdrop-blur-xl flex items-center justify-center p-1.5 ring-1 ring-inset ring-white/30 shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.5)]">
                  <img src={jiraLogo} alt="Jira Ticket Raiser" className="h-full w-full rounded-lg object-contain" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <h1 className="text-base sm:text-lg font-semibold tracking-tight truncate bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text">
                    Jira Ticket Raiser
                  </h1>
                  {connection.status === 'connected' && <LiveStatusIndicator />}
                </div>
                <p className="flex items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground/80 truncate">
                  <Sparkles className="h-3 w-3 text-primary/70" />
                  AI-powered ticket creation assistant
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {connection.status === 'connected' && (
                <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl">
                  <Activity className="h-3 w-3 text-cyan-400" />
                  <span className="text-[10px] font-medium text-muted-foreground tracking-wide">Sync healthy</span>
                </div>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSettingsOpen(true)}
                    className="relative h-9 w-9 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/10 hover:border-primary/40 hover:shadow-[0_0_20px_-4px_hsl(var(--primary)/0.5)] active:scale-95 transition-all duration-200"
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    {connection.status === 'connected' && (
                      <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-background shadow-[0_0_8px_hsl(150_80%_45%)]" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Jira Settings</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
        <div className="relative z-10">
          <ConnectedProjectBanner />
        </div>
        <div className="relative z-10 flex-1 overflow-hidden">
          <ChatContainer />
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
