
-- Add DELETE policy for workspace_chat_messages (only workspace owner can delete)
CREATE POLICY "Workspace owners can delete chat messages"
ON public.workspace_chat_messages
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE workspaces.id = workspace_chat_messages.workspace_id
      AND workspaces.owner_id = auth.uid()
  )
);

-- Document history_logs intentional immutability
COMMENT ON TABLE public.history_logs IS 'Immutable audit/history log. No UPDATE policy is defined by design — entries cannot be modified after insertion. Use DELETE to remove if needed.';

-- Document column-level protections already enforced
COMMENT ON COLUMN public.qa_questions.correct_option IS 'Sensitive: SELECT revoked from authenticated/anon; only readable via service_role and check_qa_answer SECURITY DEFINER RPC.';
COMMENT ON COLUMN public.qa_questions.explanation IS 'Sensitive: SELECT revoked from authenticated/anon; only readable via service_role and check_qa_answer SECURITY DEFINER RPC.';
COMMENT ON COLUMN public.user_totp.totp_secret IS 'Sensitive: SELECT/INSERT/UPDATE revoked from authenticated/anon at the column level. Only service_role (edge functions) may read or write.';
