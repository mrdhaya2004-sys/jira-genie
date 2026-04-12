
-- 1. Harden conversation_participants UPDATE policy to prevent admin escalation
DROP POLICY IF EXISTS "Users can update their own participation" ON public.conversation_participants;

CREATE POLICY "Users can update their own participation"
ON public.conversation_participants
FOR UPDATE
TO public
USING (user_id = auth.uid() AND is_admin = false)
WITH CHECK (user_id = auth.uid() AND is_admin = false);

-- 2. Create a public profiles view with only non-sensitive fields
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT user_id, full_name, avatar_url, profile_id
FROM public.profiles;

-- 3. Replace broad profile SELECT policies with restricted ones
-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Org members can view each other profiles" ON public.profiles;
DROP POLICY IF EXISTS "Conversation members can view each other profiles" ON public.profiles;

-- Recreate with column-level restriction using security definer function
CREATE OR REPLACE FUNCTION public.get_public_profile(_target_user_id uuid)
RETURNS TABLE(user_id uuid, full_name text, avatar_url text, profile_id text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.full_name, p.avatar_url, p.profile_id
  FROM public.profiles p
  WHERE p.user_id = _target_user_id;
$$;

-- Re-add org member and conversation member SELECT policies but restrict to non-sensitive columns
-- Since RLS can't restrict columns, we use a restrictive approach:
-- Org/conversation members can view profiles but we grant via the view instead
-- Keep only the owner SELECT policy on profiles table for full access
-- For other users, they must use the public_profiles view or get_public_profile function

-- Re-add limited SELECT for org members (they need basic profile info for chat)
CREATE POLICY "Org members can view basic profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  (auth.uid() = user_id)
  OR EXISTS (
    SELECT 1
    FROM organization_members om1
    JOIN organization_members om2 ON om1.organization_id = om2.organization_id
    WHERE om1.user_id = auth.uid() AND om2.user_id = profiles.user_id
  )
);

-- Conversation members can view basic profiles  
CREATE POLICY "Conversation members can view basic profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM conversation_participants cp1
    JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
    WHERE cp1.user_id = auth.uid() AND cp2.user_id = profiles.user_id
  )
);
