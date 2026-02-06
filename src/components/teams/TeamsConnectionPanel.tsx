import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  RefreshCw, 
  Unplug, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Clock,
  Mail
} from 'lucide-react';
import { useTeamsConnection } from '@/hooks/useTeamsConnection';
import TeamsIcon from './TeamsIcon';
import { formatDistanceToNow } from 'date-fns';

const TeamsConnectionPanel: React.FC = () => {
  const {
    connection,
    status,
    isLoading,
    initiateConnection,
    disconnect,
    syncNow,
    toggleSync
  } = useTeamsConnection();

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 animate-pulse">
          <div className="h-10 w-10 rounded-lg bg-muted" />
          <div className="space-y-2 flex-1">
            <div className="h-4 w-40 bg-muted rounded" />
            <div className="h-3 w-60 bg-muted rounded" />
          </div>
        </div>
      </Card>
    );
  }

  if (!connection || !connection.is_connected) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-[#5B5FC7]/10 flex items-center justify-center">
            <TeamsIcon className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">Microsoft Teams</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Connect your Microsoft Teams account to sync 1:1 and group chats
            </p>
          </div>
          <Button
            onClick={initiateConnection}
            disabled={status === 'connecting'}
            className="bg-[#5B5FC7] hover:bg-[#4B4FB7] text-white"
          >
            {status === 'connecting' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <TeamsIcon className="h-4 w-4 mr-2" />
                Connect Teams
              </>
            )}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-[#5B5FC7]/10 flex items-center justify-center">
          <TeamsIcon className="h-7 w-7" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">Microsoft Teams</h3>
            <Badge variant="outline" className="text-xs border-emerald-500/50 text-emerald-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {connection.microsoft_display_name && (
              <span className="flex items-center gap-1">
                {connection.microsoft_display_name}
              </span>
            )}
            {connection.microsoft_email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {connection.microsoft_email}
              </span>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Sync Controls */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Auto-sync</p>
            <p className="text-xs text-muted-foreground">
              Automatically sync new Teams messages
            </p>
          </div>
          <Switch
            checked={connection.sync_enabled}
            onCheckedChange={toggleSync}
          />
        </div>

        {connection.last_synced_at && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            Last synced {formatDistanceToNow(new Date(connection.last_synced_at), { addSuffix: true })}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={syncNow}
            disabled={status === 'syncing'}
          >
            {status === 'syncing' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Sync Now
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={disconnect}
            className="text-destructive hover:text-destructive"
          >
            <Unplug className="h-4 w-4 mr-2" />
            Disconnect
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default TeamsConnectionPanel;
