
-- 1. Move sensitive PII out of profiles into owner-only table
CREATE TABLE IF NOT EXISTS public.profiles_private (
  user_id uuid PRIMARY KEY,
  mobile_number text,
  date_of_birth date,
  employee_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles_private ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own private profile"
  ON public.profiles_private FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Owner can insert own private profile"
  ON public.profiles_private FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can update own private profile"
  ON public.profiles_private FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Owner can delete own private profile"
  ON public.profiles_private FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Backfill existing data
INSERT INTO public.profiles_private (user_id, mobile_number, date_of_birth, employee_id)
SELECT user_id, mobile_number, date_of_birth, employee_id
FROM public.profiles
WHERE mobile_number IS NOT NULL OR date_of_birth IS NOT NULL OR employee_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- Drop sensitive columns from profiles (now stored in profiles_private)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS mobile_number;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS date_of_birth;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS employee_id;

CREATE TRIGGER profiles_private_updated_at
  BEFORE UPDATE ON public.profiles_private
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Hide qa_questions answers from regular reads
REVOKE SELECT (correct_option, explanation) ON public.qa_questions FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public.check_qa_answer(_question_id uuid, _selected_option text)
RETURNS TABLE (is_correct boolean, correct_option text, explanation text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (q.correct_option = _selected_option) AS is_correct,
         q.correct_option,
         q.explanation
  FROM public.qa_questions q
  WHERE q.id = _question_id;
$$;

REVOKE ALL ON FUNCTION public.check_qa_answer(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_qa_answer(uuid, text) TO authenticated;

-- 3. TOTP brute-force tracking
CREATE TABLE IF NOT EXISTS public.totp_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_lower text NOT NULL,
  succeeded boolean NOT NULL DEFAULT false,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_totp_attempts_email_time
  ON public.totp_attempts (email_lower, attempted_at DESC);

ALTER TABLE public.totp_attempts ENABLE ROW LEVEL SECURITY;
-- No client access. Only service-role edge function writes/reads.

-- 4. Lock down SECURITY DEFINER helpers from anon
REVOKE EXECUTE ON FUNCTION public.is_conversation_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_conversation_member(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_public_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text, text) TO authenticated;
