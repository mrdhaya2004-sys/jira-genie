-- Remove column-level SELECT on the sensitive totp_secret column for clients.
-- The RLS SELECT policy stays in place; column-level GRANTs further restrict
-- which columns the 'authenticated' role can read.
REVOKE SELECT ON public.user_totp FROM authenticated;
GRANT SELECT (id, user_id, is_enabled, created_at, updated_at) ON public.user_totp TO authenticated;

-- service_role (edge functions) keeps full access for TOTP verification.
GRANT ALL ON public.user_totp TO service_role;