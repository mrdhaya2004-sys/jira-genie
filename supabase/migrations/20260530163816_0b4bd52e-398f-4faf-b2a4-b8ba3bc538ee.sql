-- Add live status tracking columns to per-user AI configuration
ALTER TABLE public.ai_provider_configs
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'not_verified',
  ADD COLUMN IF NOT EXISTS last_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error text;

-- Constrain status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_provider_configs_status_check'
  ) THEN
    ALTER TABLE public.ai_provider_configs
      ADD CONSTRAINT ai_provider_configs_status_check
      CHECK (status IN ('connected','not_verified','error','verifying','quota_exhausted'));
  END IF;
END $$;

-- Audit log table for AI configuration events
CREATE TABLE IF NOT EXISTS public.ai_config_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  provider text,
  model text,
  event text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.ai_config_audit TO authenticated;
GRANT ALL ON public.ai_config_audit TO service_role;

ALTER TABLE public.ai_config_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own AI audit" ON public.ai_config_audit;
CREATE POLICY "Users can view own AI audit"
  ON public.ai_config_audit FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own AI audit" ON public.ai_config_audit;
CREATE POLICY "Users can insert own AI audit"
  ON public.ai_config_audit FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_config_audit_user_created
  ON public.ai_config_audit (user_id, created_at DESC);