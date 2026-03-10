
CREATE TABLE public.history_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  module_name TEXT NOT NULL,
  action_type TEXT NOT NULL DEFAULT 'generate',
  input_prompt TEXT,
  output_summary TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.history_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own history logs"
  ON public.history_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own history logs"
  ON public.history_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own history logs"
  ON public.history_logs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_history_logs_user_id ON public.history_logs(user_id);
CREATE INDEX idx_history_logs_workspace_id ON public.history_logs(workspace_id);
CREATE INDEX idx_history_logs_module_name ON public.history_logs(module_name);
CREATE INDEX idx_history_logs_created_at ON public.history_logs(created_at DESC);
CREATE INDEX idx_history_logs_session_id ON public.history_logs(session_id);
