import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, XCircle, Eye, EyeOff, Pencil, Shield, Unplug } from 'lucide-react';
import { toast } from 'sonner';
import { ConnectionStatus, JiraConnectionData, useJiraConnection } from '@/hooks/useJiraConnection';
import { cn } from '@/lib/utils';
import jiraLogo from '@/assets/jira-logo.png';

interface JiraSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: ReturnType<typeof useJiraConnection>;
}

const StatusBadge: React.FC<{ status: ConnectionStatus }> = ({ status }) => {
  if (status === 'connecting') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/30">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-yellow-500" />
        <span className="text-xs font-medium text-yellow-500">Connecting...</span>
      </div>
    );
  }
  if (status === 'connected') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
        <div className="relative">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <div className="absolute inset-0 h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping opacity-40" />
        </div>
        <span className="text-xs font-medium text-emerald-500">Connected</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30">
      <XCircle className="h-3.5 w-3.5 text-red-500" />
      <span className="text-xs font-medium text-red-500">Not Connected</span>
    </div>
  );
};

const JiraSettingsDialog: React.FC<JiraSettingsDialogProps> = ({ open, onOpenChange, connection }) => {
  const [formData, setFormData] = useState<JiraConnectionData>({
    jiraDomain: '',
    jiraEmail: '',
    jiraApiToken: '',
    jiraProjectKey: '',
  });
  const [showToken, setShowToken] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    if (open && connection.data) {
      setFormData(connection.data);
      setIsEditing(connection.status !== 'connected');
    }
  }, [open, connection.data, connection.status]);

  const fieldsDisabled = connection.status === 'connected' && !isEditing;

  const handleConnect = async () => {
    if (!formData.jiraDomain || !formData.jiraEmail || !formData.jiraApiToken || !formData.jiraProjectKey) {
      toast.error('Please fill in all fields');
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await connection.connect(formData);
      if (result.success) {
        toast.success(`Jira connected successfully! Project: ${result.projectName}`);
        setIsEditing(false);
      } else {
        toast.error(result.error || 'Failed to connect. Please check credentials.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setShowToken(false);
  };

  const handleCancel = () => {
    setFormData(connection.data);
    setIsEditing(false);
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await connection.disconnect();
      setFormData({ jiraDomain: '', jiraEmail: '', jiraApiToken: '', jiraProjectKey: '' });
      setIsEditing(false);
      toast.success('Jira disconnected successfully');
    } catch {
      toast.error('Failed to disconnect');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const maskedToken = formData.jiraApiToken
    ? '•'.repeat(Math.min(formData.jiraApiToken.length, 32))
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-card border-border/50 shadow-2xl">
        <DialogHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg">Jira Configuration</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Manage your Jira integration</p>
              </div>
            </div>
            <StatusBadge status={connection.status} />
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Domain */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Jira Domain
            </Label>
            <Input
              placeholder="company.atlassian.net"
              value={formData.jiraDomain}
              onChange={(e) => setFormData(prev => ({ ...prev, jiraDomain: e.target.value }))}
              disabled={fieldsDisabled}
              className={cn(
                "h-10 transition-all",
                fieldsDisabled && "opacity-60 bg-muted/30"
              )}
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Jira User Email
            </Label>
            <Input
              type="email"
              placeholder="user@company.com"
              value={formData.jiraEmail}
              onChange={(e) => setFormData(prev => ({ ...prev, jiraEmail: e.target.value }))}
              disabled={fieldsDisabled}
              className={cn(
                "h-10 transition-all",
                fieldsDisabled && "opacity-60 bg-muted/30"
              )}
            />
          </div>

          {/* API Token */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              API Token
            </Label>
            <div className="relative">
              <Input
                type={showToken && isEditing ? 'text' : 'password'}
                placeholder="Enter your Jira API token"
                value={isEditing ? formData.jiraApiToken : maskedToken}
                onChange={(e) => setFormData(prev => ({ ...prev, jiraApiToken: e.target.value }))}
                disabled={fieldsDisabled}
                className={cn(
                  "h-10 pr-10 transition-all",
                  fieldsDisabled && "opacity-60 bg-muted/30"
                )}
              />
              {isEditing && (
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              )}
            </div>
          </div>

          {/* Project Key */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Project Key
            </Label>
            <Input
              placeholder="e.g., PROJ"
              value={formData.jiraProjectKey}
              onChange={(e) => setFormData(prev => ({ ...prev, jiraProjectKey: e.target.value.toUpperCase() }))}
              disabled={fieldsDisabled}
              className={cn(
                "h-10 transition-all",
                fieldsDisabled && "opacity-60 bg-muted/30"
              )}
            />
          </div>

          {/* Last validated */}
          {connection.status === 'connected' && connection.lastValidatedAt && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span className="text-xs text-emerald-600">
                Last verified: {new Date(connection.lastValidatedAt).toLocaleString()}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {connection.status === 'connected' && !isEditing ? (
              <>
                <Button
                  onClick={handleEdit}
                  variant="outline"
                  className="flex-1 gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  Edit Credentials
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      disabled={isDisconnecting}
                      variant="outline"
                      className="flex-1 gap-2 border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      {isDisconnecting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Unplug className="h-4 w-4" />
                      )}
                      Disconnect
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Disconnect Jira?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove your Jira credentials and disconnect the integration. You'll need to re-enter your credentials to reconnect.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDisconnect}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Disconnect
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : (
              <>
                {connection.status === 'connected' && isEditing && (
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  onClick={handleConnect}
                  disabled={isSubmitting}
                  className={cn(
                    "flex-1 gap-2 transition-all",
                    "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/25"
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : connection.status === 'connected' ? (
                    'Save Changes'
                  ) : (
                    'Connect'
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JiraSettingsDialog;
