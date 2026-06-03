
-- Restrict authenticated SELECT on sensitive token columns; keep service_role full access.

REVOKE SELECT (jira_api_token) ON public.jira_connections FROM authenticated;
REVOKE SELECT (jira_api_token) ON public.jira_connections FROM anon;

REVOKE SELECT (access_token, refresh_token, token_expires_at, tenant_id)
  ON public.teams_connections FROM authenticated;
REVOKE SELECT (access_token, refresh_token, token_expires_at, tenant_id)
  ON public.teams_connections FROM anon;

REVOKE SELECT (totp_secret) ON public.user_totp FROM authenticated;
REVOKE SELECT (totp_secret) ON public.user_totp FROM anon;
