-- 1. Drop the overly permissive profiles SELECT policy
DROP POLICY IF EXISTS "Authenticated users can search profiles" ON profiles;

-- 2. Fix the broken organizations INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;
CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.domain = organizations.domain
    )
  );

-- 3. Fix open org membership - restrict to domain-based joining
DROP POLICY IF EXISTS "Users can join organizations" ON organization_members;
CREATE POLICY "Users can join organizations"
  ON organization_members FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = organization_id
        AND EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.user_id = auth.uid()
            AND p.email ILIKE '%@' || o.domain
        )
    )
  );

-- 4. Revoke direct SELECT on api_key_encrypted from client roles
REVOKE SELECT (api_key_encrypted) ON ai_provider_configs FROM anon;
REVOKE SELECT (api_key_encrypted) ON ai_provider_configs FROM authenticated;