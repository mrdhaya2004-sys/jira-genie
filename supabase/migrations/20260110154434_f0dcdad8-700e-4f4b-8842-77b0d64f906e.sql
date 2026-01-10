-- Add workspace_id to mentions table for proper tenant isolation
ALTER TABLE public.mentions 
ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Drop existing view policies that allow cross-tenant access
DROP POLICY IF EXISTS "Users can view their own mentions" ON public.mentions;
DROP POLICY IF EXISTS "Users can update their own mentions" ON public.mentions;

-- Create new policy that scopes 'everyone' mentions to user's accessible workspaces
CREATE POLICY "Users can view mentions in their workspaces"
ON public.mentions FOR SELECT
USING (
  auth.uid() = mentioned_user_id 
  OR (
    mention_type = 'everyone' 
    AND workspace_id IN (
      SELECT id FROM public.workspaces 
      WHERE owner_id = auth.uid()
    )
  )
);

-- Update policy for marking mentions as read - also scoped to accessible workspaces
CREATE POLICY "Users can update mentions in their workspaces"
ON public.mentions FOR UPDATE
USING (
  auth.uid() = mentioned_user_id 
  OR (
    mention_type = 'everyone' 
    AND workspace_id IN (
      SELECT id FROM public.workspaces 
      WHERE owner_id = auth.uid()
    )
  )
);

-- Update insert policy to require workspace_id
DROP POLICY IF EXISTS "Users can create mentions" ON public.mentions;

CREATE POLICY "Users can create mentions in their workspaces"
ON public.mentions FOR INSERT
WITH CHECK (
  auth.uid() = mentioned_by_user_id 
  AND (
    workspace_id IS NULL 
    OR workspace_id IN (
      SELECT id FROM public.workspaces 
      WHERE owner_id = auth.uid()
    )
  )
);