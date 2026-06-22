export interface GitLabConnection {
  id: string;
  base_url: string;
  gitlab_username: string | null;
  gitlab_user_id: number | null;
  is_active: boolean;
  last_sync_at: string | null;
  last_sync_error: string | null;
  provider?: 'github' | 'gitlab' | null;
}

export interface GitLabProject {
  id: string;
  project_id: number;
  name: string;
  path_with_namespace: string;
  default_branch: string | null;
  web_url: string | null;
  avatar_url: string | null;
  owner?: string | null;
  visibility?: string | null;
}

export interface GitLabBranch {
  id: string;
  project_row_id: string;
  name: string;
  is_default: boolean;
  last_commit_sha: string | null;
}

export type PipelineStatus = 'pending' | 'running' | 'success' | 'failed' | 'canceled' | 'skipped';

export interface GitLabPipelineRun {
  id: string;
  project_row_id: string;
  gitlab_project_id: number;
  pipeline_id: number | null;
  branch: string;
  status: PipelineStatus;
  web_url: string | null;
  started_at: string | null;
  finished_at: string | null;
  duration_seconds: number | null;
  stats: { total?: number; passed?: number; failed?: number; skipped?: number };
  triggered_via: 'chat' | 'schedule';
  conversation_id: string | null;
  created_at: string;
}

export interface GitLabSchedule {
  id: string;
  project_row_id: string;
  branch: string;
  run_at: string;
  status: 'pending' | 'triggered' | 'cancelled' | 'failed';
  error_message: string | null;
  created_at: string;
}

export type ChatMsg =
  | { kind: 'user'; id: string; content: string; at: string }
  | { kind: 'ai-text'; id: string; content: string; at: string }
  | { kind: 'ai-branch-match'; id: string; at: string; branch: string; projectRowId: string }
  | { kind: 'ai-branch-miss'; id: string; at: string; query: string; suggestions: string[] }
  | { kind: 'ai-pipeline'; id: string; at: string; runId: string }
  | { kind: 'ai-schedule-confirmed'; id: string; at: string; scheduleId: string; branch: string; runAt: string }
  | { kind: 'ai-suggestions'; id: string; at: string };
