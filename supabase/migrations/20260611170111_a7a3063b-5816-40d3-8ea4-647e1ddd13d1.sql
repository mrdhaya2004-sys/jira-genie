ALTER TABLE public.totp_attempts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.totp_attempts FROM anon, authenticated;
GRANT ALL ON public.totp_attempts TO service_role;

CREATE POLICY "Deny all client access to totp_attempts"
ON public.totp_attempts
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);