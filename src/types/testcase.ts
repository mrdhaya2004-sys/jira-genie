export type TestCaseFlowPhase = 
  | 'initial'
  | 'workspace_selection'
  | 'ready_for_query'
  | 'generating'
  | 'completed';

export type TestCaseMode = 'workspace' | 'manual';

export interface TestCaseColumn {
  key: string;
  header: string;
  index: number;
}

export interface ParsedExcelStructure {
  columns: TestCaseColumn[];
  sampleRows: Record<string, string>[];
  sheetName: string;
}

export interface GeneratedTestCase {
  [key: string]: string;
}

export interface TestCaseChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  type?: 'text' | 'mode_select' | 'workspace_select' | 'excel_upload' | 'download';
  options?: TestCaseChatOption[];
  excelStructure?: ParsedExcelStructure;
  generatedTestCases?: GeneratedTestCase[];
  timestamp: string;
}

export interface TestCaseChatOption {
  id: string;
  label: string;
  value: string;
  icon?: string;
  description?: string;
}

export interface TestCaseGenerationRequest {
  workspaceId?: string;
  mode: TestCaseMode;
  query: string;
  context: {
    userStories?: string;
    modules?: string[];
    excelStructure?: ParsedExcelStructure;
    testCaseType?: 'functional' | 'negative' | 'boundary' | 'edge' | 'regression' | 'all';
    limit?: number;
  };
}
