import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LinkIcon, RefreshCw, X } from 'lucide-react';
import jiraLogo from '@/assets/jira-logo.png';
import { ConnectionStatus } from '@/hooks/useJiraConnection';

interface JiraConnectionGateProps {
  status: ConnectionStatus;
  loading: boolean;
  onConnect: () => void;
  onCancel: () => void;
}

const JiraConnectionGate: React.FC<JiraConnectionGateProps> = ({
  status,
  loading,
  onConnect,
  onCancel,
}) => {
  if (loading || status === 'connected') return null;

  const isExpired = false; // only true when we detect an actual expired connection

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="sm:max-w-[440px] bg-card border-border/50 shadow-2xl p-0 overflow-hidden">
        <DialogTitle className="sr-only">
          {isExpired ? 'Reconnect to Jira' : 'Connect to Jira'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {isExpired
            ? 'Your Jira connection has expired. Please reconnect to continue using the Jira Ticket Raiser.'
            : 'To use Jira Ticket Raiser, please connect your Jira account.'}
        </DialogDescription>
        {/* Header gradient */}
        <div className="bg-gradient-to-br from-blue-600/10 via-blue-500/5 to-transparent px-8 pt-8 pb-6 text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <img src={jiraLogo} alt="Jira" className="h-10 w-10 object-contain rounded-none shadow-none border-0 border-none text-sm font-thin" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight">
            {isExpired ? 'Reconnect to Jira' : 'Connect to Jira'}
          </h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-[320px] mx-auto">
            {isExpired
              ? 'Your Jira connection has expired. Please reconnect to continue using the Jira Ticket Raiser.'
              : 'To use Jira Ticket Raiser, please connect your Jira account.'}
          </p>
        </div>

        {/* Actions */}
        <div className="px-8 pb-8 pt-2 flex flex-col gap-3">
          <Button
            onClick={onConnect}
            className="w-full gap-2 h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/25 transition-all"
          >
            {isExpired ? (
              <>
                <RefreshCw className="h-4 w-4" />
                Reconnect Jira
              </>
            ) : (
              <>
                <LinkIcon className="h-4 w-4" />
                Connect Jira
              </>
            )}
          </Button>
          <Button
            onClick={onCancel}
            variant="ghost"
            className="w-full gap-2 h-10 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JiraConnectionGate;
