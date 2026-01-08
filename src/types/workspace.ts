export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceFile {
  id: string;
  workspace_id: string;
  file_name: string;
  file_type: 'user_story' | 'apk' | 'ipa';
  file_url: string;
  file_size: number | null;
  content_extracted: string | null;
  metadata: Record<string, unknown>;
  uploaded_by: string;
  created_at: string;
}

export interface WorkspaceChatMessage {
  id: string;
  workspace_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type AICapability = 
  | 'test_cases'
  | 'code_generation'
  | 'xpath_generation'
  | 'jira_ticket'
  | 'workflow_breakdown'
  | 'explain_app'
  | 'qa_chat';
