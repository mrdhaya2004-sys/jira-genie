
-- Create a security definer function to check conversation membership without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.is_conversation_member(_user_id uuid, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE user_id = _user_id AND conversation_id = _conversation_id
  )
$$;

-- Drop and recreate the conversation_participants SELECT policy to avoid infinite recursion
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;
CREATE POLICY "Users can view participants of their conversations"
  ON public.conversation_participants FOR SELECT
  USING (public.is_conversation_member(auth.uid(), conversation_id));

-- Fix conversations SELECT policy to use the new function
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;
CREATE POLICY "Users can view conversations they participate in"
  ON public.conversations FOR SELECT
  USING (public.is_conversation_member(auth.uid(), id));

-- Fix chat_messages SELECT policy
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.chat_messages;
CREATE POLICY "Users can view messages in their conversations"
  ON public.chat_messages FOR SELECT
  USING (public.is_conversation_member(auth.uid(), conversation_id));

-- Fix chat_messages INSERT policy
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.chat_messages;
CREATE POLICY "Users can send messages to their conversations"
  ON public.chat_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND public.is_conversation_member(auth.uid(), conversation_id));

-- Fix conversations DELETE policy
DROP POLICY IF EXISTS "Admins can delete group conversations" ON public.conversations;
CREATE POLICY "Admins can delete group conversations"
  ON public.conversations FOR DELETE
  USING (auth.uid() = created_by OR EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conversations.id AND user_id = auth.uid() AND is_admin = true
  ));

-- Fix conversations UPDATE policy  
DROP POLICY IF EXISTS "Admins can update group conversations" ON public.conversations;
CREATE POLICY "Admins can update group conversations"
  ON public.conversations FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conversations.id AND user_id = auth.uid() AND is_admin = true
  ));

-- Fix conversation_participants INSERT policy to avoid self-reference
DROP POLICY IF EXISTS "Users can add participants to conversations they admin" ON public.conversation_participants;
CREATE POLICY "Users can add participants to conversations they admin"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
        AND cp.user_id = auth.uid()
        AND cp.is_admin = true
    )
  );

-- Also ensure profiles are searchable by authenticated users for the user search feature
-- Add a policy so authenticated users can search profiles (needed for @username search)
DROP POLICY IF EXISTS "Authenticated users can search profiles" ON public.profiles;
CREATE POLICY "Authenticated users can search profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);
