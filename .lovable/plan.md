## Goal
Remove the AI Assistant feature from the Hive Mind Workspace (Test Zone → Workspace detail), keeping Files & Stories and Environments intact.

## Scope of Removal

In `src/components/workspace/WorkspaceDetail.tsx`:
- Remove the **AI Assistant** tab trigger and its entire `TabsContent` panel (capability sidebar + chat area + input).
- Remove the `AI_CAPABILITIES` constant.
- Remove `useWorkspaceAI` hook usage and all related state: `messages`, `chatInput`, `selectedCapability`, `messagesEndRef`, `aiLoading`, `isStreaming`, `fetchChatHistory`, `clearHistory`, `sendMessage`, `handleSendMessage`, and the related `useEffect` calls.
- Remove now-unused imports: `Bot`, `Send`, `Loader2`, `Textarea`, `ScrollArea`, `Separator`, `useWorkspaceAI`, `AICapability`.
- Default `activeTab` becomes `'files'` with only two tabs: **Files & Stories** and **Environments**.

## Files to delete (no longer referenced)
- `src/hooks/useWorkspaceAI.ts`
- `supabase/functions/workspace-ai-chat/index.ts` (and its config block in `supabase/config.toml` if present)

## Files to keep (used elsewhere)
- `supabase/functions/_shared/hiveMindRouter.ts` — still used by other edge functions.
- The `workspace_chat_messages` table will be left in place (data preservation); no migration is created. If you'd prefer it dropped, say so and I'll add a migration.

## Verification
- Workspace detail opens with **Files & Stories** active by default.
- Only two tabs visible: Files & Stories, Environments.
- No references to AI capabilities, capability sidebar, chat input, or `useWorkspaceAI` remain.
- Module still compiles; no broken imports.

## Out of Scope
- Hive AI floating button, Hive Mind chat in messaging, and module-level AI (XPath / Scenario / Test Case generators) — these remain untouched.
