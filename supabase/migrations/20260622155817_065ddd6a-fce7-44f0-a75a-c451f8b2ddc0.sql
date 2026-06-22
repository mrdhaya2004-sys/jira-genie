ALTER TABLE public.gitlab_connections ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'gitlab';
ALTER TABLE public.gitlab_projects ADD COLUMN IF NOT EXISTS owner text;
ALTER TABLE public.gitlab_projects ADD COLUMN IF NOT EXISTS visibility text;