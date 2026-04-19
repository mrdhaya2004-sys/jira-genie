import React, { useState } from 'react';
import { ChatProvider, useChat } from '@/contexts/ChatContext';
import ChatContainer from '@/components/chat/ChatContainer';
import { Settings, FolderKanban } from 'lucide-react';
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
    <div className="border-b border-border/60 bg-muted/30 px-6 py-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <FolderKanban className="h-3.5 w-3.5 text-primary" />
        <span>
          Connected to{' '}
          <span className="font-semibold text-foreground">
            {jiraMetadata.projectName || jiraMetadata.projectKey}
          </span>{' '}
          <span className="text-muted-foreground/80">({jiraMetadata.projectKey})</span>
          <span className="ml-1.5 text-muted-foreground/70">— tickets will be created in this project</span>
        </span>
      </div>
    </div>
  );
};

const LiveStatusIndicator: React.FC = () => (
  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25">
    <div className="relative">
      <div className="h-2 w-2 rounded-full bg-emerald-500" />
      <div className="absolute inset-0 h-2 w-2 rounded-full bg-emerald-500 animate-ping opacity-50" />
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
      <div className="h-full flex flex-col bg-background">
        <div className="border-b border-border/60 px-6 py-4 bg-card/50 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl module-icon-gradient flex items-center justify-center p-1">
                <img src={jiraLogo} alt="Jira Ticket Raiser" className="h-8 w-8 rounded-lg object-contain" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold tracking-tight">Jira Ticket Raiser</h1>
                  {connection.status === 'connected' && <LiveStatusIndicator />}
                </div>
                <p className="text-xs text-muted-foreground">AI-powered ticket creation assistant</p>
              </div>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSettingsOpen(true)}
                  className="relative h-9 w-9 rounded-lg hover:bg-muted/60"
                >
                  <Settings className="h-4.5 w-4.5 text-muted-foreground" />
                  {connection.status === 'connected' && (
                    <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-background" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Jira Settings</TooltipContent>
            </Tooltip>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
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
