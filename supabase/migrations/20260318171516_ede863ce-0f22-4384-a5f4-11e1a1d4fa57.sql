
-- Update conversations SELECT policy to also allow the creator to see the conversation
-- This fixes the issue where INSERT...RETURNING fails because the user isn't a participant yet
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;

CREATE POLICY "Users can view conversations they participate in"
  ON public.conversations
  FOR SELECT
  USING (
    created_by = auth.uid() OR is_conversation_member(auth.uid(), id)
  );
