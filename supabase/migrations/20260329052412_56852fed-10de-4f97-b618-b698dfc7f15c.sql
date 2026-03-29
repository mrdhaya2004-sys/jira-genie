
CREATE TABLE public.jira_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  jira_domain TEXT NOT NULL,
  jira_email TEXT NOT NULL,
  jira_api_token TEXT NOT NULL,
  jira_project_key TEXT NOT NULL,
  is_connected BOOLEAN NOT NULL DEFAULT false,
  connection_status TEXT NOT NULL DEFAULT 'not_connected',
  last_validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.jira_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own jira connection"
ON public.jira_connections
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_jira_connections_updated_at
  BEFORE UPDATE ON public.jira_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
