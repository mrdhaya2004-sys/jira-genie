export type TestCaseFlowPhase = 
  | 'initial'
  | 'workspace_selection'
  | 'format_selection'
  | 'template_building'
  | 'ready_for_query'
  | 'generating'
  | 'editing'
  | 'completed';

export type TestCaseMode = 'workspace' | 'manual';

export type TestCaseFormatChoice = 'create_template' | 'upload_excel' | 'skip';

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
  type?: 'text' | 'mode_select' | 'workspace_select' | 'excel_upload' | 'download' | 'format_select' | 'grid_editor';
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
