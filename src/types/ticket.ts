export type IssueType = 'Bug' | 'Task' | 'Story' | 'Epic' | 'Incident';
export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';
export type TicketStatus = 'draft' | 'pending' | 'created' | 'failed';
export type Platform = 'Android' | 'iOS' | 'Web' | 'Both';
export type Environment = 'Production' | 'UAT' | 'Beta' | 'Development';

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
  platform?: Platform;
  environment?: Environment;
  generatedSteps?: string[];
  preconditions?: string[];
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
  inputType?: 'text' | 'select' | 'multiselect' | 'file' | 'confirmation' | 'credentials' | 'dynamic';
  attachments?: Attachment[];
  ticketPreview?: Partial<TicketData>;
  duplicates?: DuplicateTicket[];
  isTyping?: boolean;
  dynamicInputs?: DynamicInput[];
  generatedSteps?: string[];
}

export interface ChatOption {
  id: string;
  label: string;
  value: string;
  icon?: string;
  description?: string;
  color?: string;
}

export interface DynamicInput {
  id: string;
  question: string;
  inputType: 'text' | 'select' | 'credentials';
  placeholder?: string;
  required?: boolean;
  options?: ChatOption[];
}

export interface ConversationStep {
  id: string;
  field: keyof TicketData | 'confirmation' | 'duplicate_check' | 'dynamic_inputs' | 'title_analysis' | 'steps_generation' | 'actual_result' | 'expected_result';
  question: string;
  inputType: 'text' | 'select' | 'multiselect' | 'file' | 'confirmation' | 'credentials' | 'dynamic';
  options?: ChatOption[];
  validation?: (value: string) => boolean;
  aiEnhance?: boolean;
}

export interface TitleAnalysisResult {
  module: string;
  flowType: string;
  questions: DynamicInput[];
  understanding: string;
}

export interface StepsGenerationResult {
  steps: string[];
  module: string;
  preconditions: string[];
  platformNotes?: {
    android?: string;
    ios?: string;
  };
}

export interface ResultEnhancementResult {
  enhancedActualResult: string;
  enhancedExpectedResult: string;
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
