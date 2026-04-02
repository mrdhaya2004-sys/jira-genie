-- Allow conversation participants to view each other's profiles
CREATE POLICY "Conversation members can view each other profiles"
  ON profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM conversation_participants cp1
      JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
      WHERE cp1.user_id = auth.uid()
        AND cp2.user_id = profiles.user_id
    )
  );