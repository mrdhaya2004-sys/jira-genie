-- Add environment + platform to workspace_files
ALTER TABLE public.workspace_files
  ADD COLUMN IF NOT EXISTS environment TEXT,
  ADD COLUMN IF NOT EXISTS platform TEXT;

-- Add validation check (NULL allowed for legacy rows)
ALTER TABLE public.workspace_files
  DROP CONSTRAINT IF EXISTS workspace_files_environment_check;
ALTER TABLE public.workspace_files
  ADD CONSTRAINT workspace_files_environment_check
  CHECK (environment IS NULL OR environment IN ('dev', 'uat', 'beta', 'prod'));

ALTER TABLE public.workspace_files
  DROP CONSTRAINT IF EXISTS workspace_files_platform_check;
ALTER TABLE public.workspace_files
  ADD CONSTRAINT workspace_files_platform_check
  CHECK (platform IS NULL OR platform IN ('android', 'ios'));

CREATE INDEX IF NOT EXISTS idx_workspace_files_env_platform
  ON public.workspace_files (workspace_id, environment, platform);

-- Add default_environment to workspaces
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS default_environment TEXT;

ALTER TABLE public.workspaces
  DROP CONSTRAINT IF EXISTS workspaces_default_environment_check;
ALTER TABLE public.workspaces
  ADD CONSTRAINT workspaces_default_environment_check
  CHECK (default_environment IS NULL OR default_environment IN ('dev', 'uat', 'beta', 'prod'));

-- DOM snapshots table
CREATE TABLE IF NOT EXISTS public.dom_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  environment TEXT NOT NULL CHECK (environment IN ('dev', 'uat', 'beta', 'prod')),
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios')),
  dom_content TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'auto')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, environment, platform)
);

CREATE INDEX IF NOT EXISTS idx_dom_snapshots_workspace
  ON public.dom_snapshots (workspace_id, environment, platform);

ALTER TABLE public.dom_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dom snapshots"
  ON public.dom_snapshots FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dom snapshots"
  ON public.dom_snapshots FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid())
  );

CREATE POLICY "Users can update own dom snapshots"
  ON public.dom_snapshots FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own dom snapshots"
  ON public.dom_snapshots FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_dom_snapshots_updated_at
  BEFORE UPDATE ON public.dom_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();