
-- Hide profile email from cross-user reads (column-level privilege)
REVOKE SELECT (email) ON public.profiles FROM authenticated, anon;
GRANT SELECT (id, user_id, full_name, avatar_url, profile_id, created_at, updated_at) ON public.profiles TO authenticated;

-- Restrict presence visibility to conversation participants or org co-members
DROP POLICY IF EXISTS "Authenticated users can view presence" ON public.user_presence;

CREATE POLICY "Users can view own presence"
ON public.user_presence FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Org co-members can view presence"
ON public.user_presence FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om1
    JOIN public.organization_members om2
      ON om1.organization_id = om2.organization_id
    WHERE om1.user_id = auth.uid()
      AND om2.user_id = user_presence.user_id
  )
);

CREATE POLICY "Conversation participants can view presence"
ON public.user_presence FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.conversation_participants cp1
    JOIN public.conversation_participants cp2
      ON cp1.conversation_id = cp2.conversation_id
    WHERE cp1.user_id = auth.uid()
      AND cp2.user_id = user_presence.user_id
  )
);
