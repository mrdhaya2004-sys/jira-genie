
## GitLab AI Execution Assistant

Build a chat-driven GitLab integration where users connect GitLab (PAT, gitlab.com or self-hosted), discover projects/branches automatically, and trigger / schedule / monitor pipelines from a TestZone chat module. Real-time status via 15s polling, scheduling via pg_cron, all updates surfaced in chat + Notification Center.

### 1. Database (new tables)

- `gitlab_connections` — per-user: `base_url`, `encrypted_token`, `username`, `is_active`, `last_sync_at`
- `gitlab_projects` — `connection_id`, `project_id` (GitLab numeric id), `name`, `path_with_namespace`, `default_branch`, `web_url`
- `gitlab_branches` — `project_id`, `name`, `is_default`, `last_commit_sha`, `synced_at`
- `gitlab_pipeline_runs` — `user_id`, `project_id`, `pipeline_id`, `branch`, `status`, `web_url`, `started_at`, `finished_at`, `duration_seconds`, `stats` jsonb (passed/failed/total), `triggered_via` (`chat` / `schedule`), `last_polled_at`, `conversation_id`, `chat_message_id`
- `gitlab_schedules` — `user_id`, `project_id`, `branch`, `run_at` timestamptz, `status` (`pending`/`triggered`/`cancelled`/`failed`), `pipeline_run_id`, `conversation_id`

RLS: owner-only on every table (`auth.uid() = user_id`). Token encrypted with `pgsodium` or stored via a server-only column accessed only by edge functions (service role).

### 2. Edge functions (`verify_jwt = false`, manual auth)

- `gitlab-connect` — validates PAT against `GET /user`, stores connection, kicks off initial sync.
- `gitlab-sync` — fetches projects (`/projects?membership=true`), branches per project, default branch; upserts.
- `gitlab-list-branches` — fast read from DB for a project.
- `gitlab-trigger-pipeline` — `POST /projects/:id/pipeline` with `ref=branch`; stores run row; returns pipeline id + url.
- `gitlab-poll-status` — invoked by cron every minute: finds runs in `pending`/`running`, calls `GET /projects/:id/pipelines/:pipeline_id`, updates status + jobs stats, on terminal status posts a chat message + notification.
- `gitlab-run-schedules` — cron every minute: finds due `gitlab_schedules`, calls trigger logic, marks `triggered`.
- `gitlab-disconnect`

All call GitLab via user-supplied `base_url` (default `https://gitlab.com`) using `PRIVATE-TOKEN` header.

### 3. Cron (pg_cron + pg_net)

Two minute-level jobs hitting `gitlab-poll-status` and `gitlab-run-schedules`. Inserted via the insert tool (not migration) since they embed the project URL and anon key.

### 4. Frontend — new module `GitLabExecutionModule`

Route + sidebar entry "GitLab AI". Components:

- `GitLabConnectionGate` — shows PAT + base URL form when not connected; matches Jira Connection Gate styling.
- `GitLabChatPanel` — chat interface (reuses `ChatMessageArea` patterns) with:
  - Project selector (dropdown, persisted in localStorage).
  - Suggested branch chips rendered from synced branches.
  - Natural-language input ("Start Homepage", "Run Regression"). Local parser: strip verbs (`start|run|execute|trigger`) + optional `pipeline|branch`, fuzzy match remaining token to branch list (case-insensitive, includes/startsWith). No AI call needed — keeps it instant and reliable.
  - On match: assistant message with two action buttons **▶ Start Now** and **📅 Schedule Execution**.
  - On miss: assistant lists closest 5 branches as clickable chips.
- `ScheduleExecutionDialog` — shadcn DatePicker + time input → writes `gitlab_schedules` row.
- `PipelineStatusCard` — rich chat card showing pipeline id, status badge (🟡/✅/❌), branch, duration, passed/failed, "View in GitLab" link.
- `ExecutionHistoryPanel` — sortable/filterable list of `gitlab_pipeline_runs` with re-run button.
- Suggested actions row after completion (View Report → web_url, Re-run, Run Regression, Run Smoke).

### 5. Realtime + notifications

- Enable Realtime on `gitlab_pipeline_runs` and `gitlab_schedules`.
- Frontend subscribes; on status change pushes a new assistant chat message into the panel.
- `gitlab-poll-status` also inserts into existing `notifications` table via `create_notification` RPC (`type='system'`) so the bell badge + Hive AI floating button reflect updates.

### 6. Settings

Add **GitLab** tab in Account Settings → Integrations: shows connection status (🟢 / 🔴 with response time, matching the AI status pattern), last sync, project count, disconnect button, "Re-sync now".

### 7. Out of scope (deferrable)

- OAuth flow (PAT only for v1; OAuth noted as follow-up).
- GitLab webhooks (polling only for v1).
- Cross-user pipeline visibility / team-level history.

### Files to add / change (high level)

```text
supabase/migrations/<ts>_gitlab_integration.sql
supabase/functions/gitlab-connect/index.ts
supabase/functions/gitlab-sync/index.ts
supabase/functions/gitlab-list-branches/index.ts
supabase/functions/gitlab-trigger-pipeline/index.ts
supabase/functions/gitlab-poll-status/index.ts
supabase/functions/gitlab-run-schedules/index.ts
supabase/functions/gitlab-disconnect/index.ts
supabase/config.toml                              (verify_jwt = false entries)
src/types/gitlab.ts
src/hooks/useGitLabConnection.ts
src/hooks/useGitLabProjects.ts
src/hooks/useGitLabPipelines.ts
src/components/gitlab/GitLabConnectionGate.tsx
src/components/gitlab/GitLabExecutionModule.tsx
src/components/gitlab/GitLabChatPanel.tsx
src/components/gitlab/PipelineStatusCard.tsx
src/components/gitlab/ScheduleExecutionDialog.tsx
src/components/gitlab/ExecutionHistoryPanel.tsx
src/components/gitlab/GitLabSettingsDialog.tsx
src/components/dashboard/DashboardSidebar.tsx    (add nav entry)
src/pages/DashboardPage.tsx                       (register module)
```

### Delivery order

1. Migration + cron jobs.
2. Edge functions (connect → sync → trigger → poll → schedules → disconnect).
3. Connection gate + settings.
4. Chat panel with branch parsing, trigger, schedule dialog.
5. Realtime status cards + notifications.
6. Execution history + suggested actions.
