
-- Fix 1: Tighten organization_members join policy to exact domain match on verified emails
DROP POLICY IF EXISTS "Users can join organizations" ON public.organization_members;

CREATE POLICY "Users can join organizations"
ON public.organization_members
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.organizations o
    JOIN auth.users u ON u.id = auth.uid()
    WHERE o.id = organization_members.organization_id
      AND u.email_confirmed_at IS NOT NULL
      AND lower(split_part(u.email, '@', 2)) = lower(o.domain)
  )
);

-- Fix 2: Restrict user_presence visibility. Remove broad org-co-member visibility;
-- keep self and conversation participants only.
DROP POLICY IF EXISTS "Org co-members can view presence" ON public.user_presence;
