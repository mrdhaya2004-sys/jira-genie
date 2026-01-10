export type IssueType = 'Bug' | 'Task' | 'Story' | 'Epic' | 'Incident';
export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';
export type TicketStatus = 'draft' | 'pending' | 'created' | 'failed';

export interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'video' | 'document';
  url: string;
  size: number;
  preview?: string;
}

export interface TicketData {
  summary: string;
  description: string;
  actualResult: string;
  expectedResult: string;
  issueType: IssueType;
  priority: Priority;
  module: string;
  sprint: string;
  assignee: string;
  attachments: Attachment[];
  projectKey: string;
}

export interface JiraTicket extends TicketData {
  id: string;
  key: string;
  status: TicketStatus;
  createdAt: Date;
  createdById: string;
  jiraUrl?: string;
}

export interface DuplicateTicket {
  key: string;
  summary: string;
  status: string;
  similarity: number;
  url: string;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'bot' | 'system';
  content: string;
  timestamp: Date;
  options?: ChatOption[];
  inputType?: 'text' | 'select' | 'multiselect' | 'file' | 'confirmation';
  attachments?: Attachment[];
  ticketPreview?: Partial<TicketData>;
  duplicates?: DuplicateTicket[];
  isTyping?: boolean;
}

export interface ChatOption {
  id: string;
  label: string;
  value: string;
  icon?: string;
  description?: string;
  color?: string;
}

export interface ConversationStep {
  id: string;
  field: keyof TicketData | 'confirmation' | 'duplicate_check';
  question: string;
  inputType: 'text' | 'select' | 'multiselect' | 'file' | 'confirmation';
  options?: ChatOption[];
  validation?: (value: string) => boolean;
  aiEnhance?: boolean;
}

export interface ChatSession {
  id: string;
  userId: string;
  messages: ChatMessage[];
  currentStep: number;
  ticketData: Partial<TicketData>;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}
