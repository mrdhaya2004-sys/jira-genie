
-- Prevent client (authenticated/anon) from reading sensitive secret columns.
-- Edge functions use service_role and are unaffected.

-- Jira API token
REVOKE SELECT ON public.jira_connections FROM authenticated, anon;
GRANT SELECT (id, user_id, jira_domain, jira_email, jira_project_key, is_connected, connection_status, last_validated_at, created_at, updated_at)
  ON public.jira_connections TO authenticated;

-- Teams OAuth tokens
REVOKE SELECT ON public.teams_connections FROM authenticated, anon;
GRANT SELECT (id, user_id, microsoft_user_id, microsoft_display_name, microsoft_email, tenant_id, is_connected, last_synced_at, sync_enabled, token_expires_at, created_at, updated_at)
  ON public.teams_connections TO authenticated;

-- TOTP secret
REVOKE SELECT ON public.user_totp FROM authenticated, anon;
GRANT SELECT (id, user_id, is_enabled, created_at, updated_at)
  ON public.user_totp TO authenticated;

-- Organization members: explicit deny on UPDATE so role escalation cannot be performed by clients.
-- Only service_role (used by trusted edge functions) may change roles.
DROP POLICY IF EXISTS "No client updates to organization members" ON public.organization_members;
CREATE POLICY "No client updates to organization members"
  ON public.organization_members
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);
