import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import TeamsConnectionPanel from './TeamsConnectionPanel';

interface TeamsSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TeamsSettingsDialog: React.FC<TeamsSettingsDialogProps> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Teams Integration</DialogTitle>
          <DialogDescription>
            Connect your Microsoft Teams account to sync your 1:1 and group chats directly into Current Chat.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <TeamsConnectionPanel />

          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
            <h4 className="text-sm font-medium">How it works</h4>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="font-semibold text-primary mt-0.5">1.</span>
                <span>Sign in with your Microsoft account to grant access</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-primary mt-0.5">2.</span>
                <span>Your Teams 1:1 and group chats will appear in the sidebar with a Teams badge</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-primary mt-0.5">3.</span>
                <span>Send replies from Current Chat — they sync back to Teams automatically</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-primary mt-0.5">4.</span>
                <span>Toggle auto-sync to keep conversations up to date in real-time</span>
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-1.5">
            <h4 className="text-sm font-medium">Required permissions</h4>
            <p className="text-xs text-muted-foreground">
              This integration requires <code className="text-xs bg-muted px-1 py-0.5 rounded">Chat.ReadWrite</code> and <code className="text-xs bg-muted px-1 py-0.5 rounded">User.Read</code> Microsoft Graph API permissions. Your admin may need to consent to these permissions.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TeamsSettingsDialog;
