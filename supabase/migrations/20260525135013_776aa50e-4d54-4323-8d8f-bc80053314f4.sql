
-- 1. Protect TOTP secrets: revoke column access from client roles
REVOKE SELECT (totp_secret) ON public.user_totp FROM anon, authenticated;
REVOKE INSERT (totp_secret), UPDATE (totp_secret) ON public.user_totp FROM anon, authenticated;

-- 2. Fix conversation_participants self-escalation: ensure WITH CHECK forbids elevating is_admin
DROP POLICY IF EXISTS "Users can update their own participation" ON public.conversation_participants;
CREATE POLICY "Users can update their own participation"
ON public.conversation_participants
FOR UPDATE
USING (user_id = auth.uid() AND is_admin = false)
WITH CHECK (user_id = auth.uid() AND is_admin = false);
-- Note: WITH CHECK already evaluates the NEW row in Postgres, so a user updating
-- is_admin to true would be blocked. This re-affirms the policy explicitly.
