
-- 1. Fix notifications: Create SECURITY DEFINER function for cross-user notification inserts
CREATE OR REPLACE FUNCTION public.create_notification(
  _target_user_id uuid,
  _type text,
  _title text,
  _message text,
  _reference_id text DEFAULT NULL,
  _reference_type text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_id uuid;
BEGIN
  _caller_id := auth.uid();
  IF _caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message, reference_id, reference_type)
  VALUES (_target_user_id, _type, _title, _message, _reference_id, _reference_type);
END;
$$;

-- Tighten the INSERT policy so direct client inserts are restricted to own user_id only
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;
CREATE POLICY "Users can insert own notifications"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 2. Fix conversation_participants: prevent self-insertion into arbitrary conversations
-- Only allow: creator adds themselves (via conversations.created_by), or admins add others
DROP POLICY IF EXISTS "Users can add participants to conversations they admin" ON conversation_participants;
CREATE POLICY "Users can add participants to conversations they admin"
  ON conversation_participants FOR INSERT TO public
  WITH CHECK (
    -- Creator can add themselves during conversation creation
    (auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM conversations c WHERE c.id = conversation_id AND c.created_by = auth.uid()
    ))
    OR
    -- Admins can add other users
    (EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
        AND cp.user_id = auth.uid()
        AND cp.is_admin = true
    ))
  );

-- Prevent users from escalating their own is_admin flag
DROP POLICY IF EXISTS "Users can update their own participation" ON conversation_participants;
CREATE POLICY "Users can update their own participation"
  ON conversation_participants FOR UPDATE TO public
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND is_admin = false);

-- 3. Add storage UPDATE policy for workspace-files
CREATE POLICY "Users can update files in their workspaces"
  ON storage.objects FOR UPDATE TO public
  USING (bucket_id = 'workspace-files' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'workspace-files' AND (storage.foldername(name))[1] = auth.uid()::text);
