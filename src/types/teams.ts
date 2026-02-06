export interface TeamsConnection {
  id: string;
  user_id: string;
  microsoft_user_id: string | null;
  microsoft_display_name: string | null;
  microsoft_email: string | null;
  tenant_id: string | null;
  is_connected: boolean;
  last_synced_at: string | null;
  sync_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export type TeamsConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'syncing' | 'error';
