
-- gitlab_connections
CREATE TABLE public.gitlab_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  base_url text NOT NULL DEFAULT 'https://gitlab.com',
  encrypted_token text NOT NULL,
  gitlab_username text,
  gitlab_user_id bigint,
  is_active boolean NOT NULL DEFAULT true,
  last_sync_at timestamptz,
  last_sync_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gitlab_connections TO authenticated;
GRANT ALL ON public.gitlab_connections TO service_role;
ALTER TABLE public.gitlab_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own gitlab connection" ON public.gitlab_connections
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- gitlab_projects
CREATE TABLE public.gitlab_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  connection_id uuid NOT NULL REFERENCES public.gitlab_connections(id) ON DELETE CASCADE,
  project_id bigint NOT NULL,
  name text NOT NULL,
  path_with_namespace text NOT NULL,
  default_branch text,
  web_url text,
  avatar_url text,
  last_activity_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (connection_id, project_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gitlab_projects TO authenticated;
GRANT ALL ON public.gitlab_projects TO service_role;
ALTER TABLE public.gitlab_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own gitlab projects" ON public.gitlab_projects
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX gitlab_projects_user_idx ON public.gitlab_projects(user_id);

-- gitlab_branches
CREATE TABLE public.gitlab_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_row_id uuid NOT NULL REFERENCES public.gitlab_projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  last_commit_sha text,
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_row_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gitlab_branches TO authenticated;
GRANT ALL ON public.gitlab_branches TO service_role;
ALTER TABLE public.gitlab_branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own gitlab branches" ON public.gitlab_branches
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX gitlab_branches_project_idx ON public.gitlab_branches(project_row_id);

-- gitlab_pipeline_runs
CREATE TABLE public.gitlab_pipeline_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_row_id uuid NOT NULL REFERENCES public.gitlab_projects(id) ON DELETE CASCADE,
  gitlab_project_id bigint NOT NULL,
  pipeline_id bigint,
  branch text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  web_url text,
  started_at timestamptz,
  finished_at timestamptz,
  duration_seconds integer,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  triggered_via text NOT NULL DEFAULT 'chat',
  last_polled_at timestamptz,
  conversation_id text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gitlab_pipeline_runs TO authenticated;
GRANT ALL ON public.gitlab_pipeline_runs TO service_role;
ALTER TABLE public.gitlab_pipeline_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own pipeline runs" ON public.gitlab_pipeline_runs
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX gitlab_pipeline_runs_user_idx ON public.gitlab_pipeline_runs(user_id, created_at DESC);
CREATE INDEX gitlab_pipeline_runs_status_idx ON public.gitlab_pipeline_runs(status) WHERE status IN ('pending','running','created','waiting_for_resource','preparing');

-- gitlab_schedules
CREATE TABLE public.gitlab_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_row_id uuid NOT NULL REFERENCES public.gitlab_projects(id) ON DELETE CASCADE,
  branch text NOT NULL,
  run_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  pipeline_run_id uuid REFERENCES public.gitlab_pipeline_runs(id) ON DELETE SET NULL,
  conversation_id text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gitlab_schedules TO authenticated;
GRANT ALL ON public.gitlab_schedules TO service_role;
ALTER TABLE public.gitlab_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own gitlab schedules" ON public.gitlab_schedules
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX gitlab_schedules_due_idx ON public.gitlab_schedules(run_at) WHERE status = 'pending';

-- updated_at triggers
CREATE TRIGGER gitlab_connections_updated BEFORE UPDATE ON public.gitlab_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER gitlab_projects_updated BEFORE UPDATE ON public.gitlab_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER gitlab_pipeline_runs_updated BEFORE UPDATE ON public.gitlab_pipeline_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER gitlab_schedules_updated BEFORE UPDATE ON public.gitlab_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.gitlab_pipeline_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gitlab_schedules;

-- Required extensions for pg_cron scheduling (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
