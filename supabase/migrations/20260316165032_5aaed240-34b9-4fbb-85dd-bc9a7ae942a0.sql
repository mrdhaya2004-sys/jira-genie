
-- Revoke table-level SELECT from anon and authenticated on teams_connections
REVOKE SELECT ON public.teams_connections FROM anon, authenticated;

-- Re-grant SELECT on non-sensitive columns only
GRANT SELECT (id, user_id, microsoft_user_id, microsoft_display_name, microsoft_email, tenant_id, is_connected, last_synced_at, sync_enabled, created_at, updated_at, token_expires_at) ON public.teams_connections TO anon, authenticated;

-- Keep INSERT/UPDATE/DELETE as they are (RLS handles row-level checks)
