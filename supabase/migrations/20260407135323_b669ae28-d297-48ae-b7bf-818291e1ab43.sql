-- 1. Revoke SELECT on sensitive columns from teams_connections
REVOKE SELECT (access_token, refresh_token) ON public.teams_connections FROM anon, authenticated;

-- 2. Fix conversation_participants INSERT policy to prevent admin escalation
-- Drop and recreate with is_admin = false enforcement
DROP POLICY IF EXISTS "Users can add participants to conversations they admin" ON public.conversation_participants;

CREATE POLICY "Users can add participants to conversations they admin"
ON public.conversation_participants
FOR INSERT
TO public
WITH CHECK (
  (
    -- Creator adding first participant (themselves) with is_admin matching creator status
    (auth.uid() = user_id)
    AND (EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_participants.conversation_id
      AND c.created_by = auth.uid()
    ))
  )
  OR
  (
    -- Existing admin adding other participants, but new participant cannot be admin
    (is_admin = false)
    AND (EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
      AND cp.is_admin = true
    ))
  )
);

-- 3. Fix chat_messages UPDATE policy to check conversation membership
DROP POLICY IF EXISTS "Users can update their own messages" ON public.chat_messages;

CREATE POLICY "Users can update their own messages"
ON public.chat_messages
FOR UPDATE
TO public
USING (auth.uid() = sender_id AND is_conversation_member(auth.uid(), conversation_id));