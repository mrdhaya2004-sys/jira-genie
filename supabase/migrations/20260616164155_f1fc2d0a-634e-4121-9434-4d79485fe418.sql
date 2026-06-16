
-- ============================================================
-- profiles: remove email from authenticated SELECT
-- ============================================================
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, user_id, full_name, avatar_url, profile_id, created_at, updated_at)
  ON public.profiles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- ============================================================
-- jira_connections: hide jira_api_token
-- ============================================================
REVOKE SELECT ON public.jira_connections FROM authenticated;
GRANT SELECT (id, user_id, jira_domain, jira_email, jira_project_key, is_connected, connection_status, last_validated_at, created_at, updated_at)
  ON public.jira_connections TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.jira_connections TO authenticated;
GRANT ALL ON public.jira_connections TO service_role;

-- ============================================================
-- teams_connections: hide access_token & refresh_token
-- ============================================================
REVOKE SELECT ON public.teams_connections FROM authenticated;
GRANT SELECT (id, user_id, microsoft_user_id, microsoft_display_name, microsoft_email, tenant_id, token_expires_at, is_connected, last_synced_at, sync_enabled, created_at, updated_at)
  ON public.teams_connections TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.teams_connections TO authenticated;
GRANT ALL ON public.teams_connections TO service_role;

-- ============================================================
-- gitlab_connections: hide encrypted_token
-- ============================================================
REVOKE SELECT ON public.gitlab_connections FROM authenticated;
GRANT SELECT (id, user_id, base_url, gitlab_username, gitlab_user_id, is_active, last_sync_at, last_sync_error, created_at, updated_at)
  ON public.gitlab_connections TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.gitlab_connections TO authenticated;
GRANT ALL ON public.gitlab_connections TO service_role;

-- ============================================================
-- user_totp: hide totp_secret (re-assert defensively)
-- ============================================================
REVOKE SELECT ON public.user_totp FROM authenticated;
GRANT SELECT (id, user_id, is_enabled, created_at, updated_at)
  ON public.user_totp TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.user_totp TO authenticated;
GRANT ALL ON public.user_totp TO service_role;
