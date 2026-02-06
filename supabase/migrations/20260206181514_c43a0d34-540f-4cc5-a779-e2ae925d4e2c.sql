
-- Table to store Microsoft Teams account connections
CREATE TABLE public.teams_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  microsoft_user_id TEXT,
  microsoft_display_name TEXT,
  microsoft_email TEXT,
  tenant_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  is_connected BOOLEAN NOT NULL DEFAULT false,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_teams_connection UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.teams_connections ENABLE ROW LEVEL SECURITY;

-- Users can only see their own connection
CREATE POLICY "Users can view own teams connection"
ON public.teams_connections FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own connection
CREATE POLICY "Users can create own teams connection"
ON public.teams_connections FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own connection
CREATE POLICY "Users can update own teams connection"
ON public.teams_connections FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own connection
CREATE POLICY "Users can delete own teams connection"
ON public.teams_connections FOR DELETE
USING (auth.uid() = user_id);

-- Timestamp trigger
CREATE TRIGGER update_teams_connections_updated_at
BEFORE UPDATE ON public.teams_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add teams_chat_id to conversations for synced conversations
ALTER TABLE public.conversations ADD COLUMN teams_chat_id TEXT;
ALTER TABLE public.conversations ADD COLUMN is_teams_synced BOOLEAN NOT NULL DEFAULT false;

-- Index for quick lookup
CREATE INDEX idx_conversations_teams_chat_id ON public.conversations (teams_chat_id) WHERE teams_chat_id IS NOT NULL;
