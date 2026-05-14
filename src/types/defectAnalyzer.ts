export type DefectFlowPhase =
  | 'workspace_selection'
  | 'report_upload'
  | 'os_selection'
  | 'ready'
  | 'analyzing'
  | 'results';

export type ExecutionOS = 'android' | 'ios' | 'web';

export type ScenarioStatus = 'passed' | 'failed' | 'skipped' | 'flaky' | 'unknown';

export interface DefectChatOption {
  id: string;
  label: string;
  value: string;
  icon?: string;
  description?: string;
}

export interface DefectChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  type?: 'text' | 'workspace_select' | 'os_select' | 'report_uploaded' | 'analysis_result';
  options?: DefectChatOption[];
  timestamp: string;
  analysis?: DefectAnalysisResult;
  reportSummary?: ReportFileSummary[];
}

export interface ReportFileSummary {
  name: string;
  size: number;
  kind: 'html' | 'json' | 'log' | 'text' | 'zip' | 'unknown';
}

export interface DefectScenario {
  name: string;
  status: ScenarioStatus;
  module?: string;
  failureReason?: string;
  rootCause?: string;
  suggestedFix?: string;
  errorSnippet?: string;
  durationMs?: number;
  tags?: string[];
  isFlaky?: boolean;
}

export interface XPathIssue {
  scenario?: string;
  oldXpath: string;
  proposedXpath?: string;
  reason: string;
  confidence?: number;
}

export interface RootCauseBucket {
  label: string;
  count: number;
  percentage: number;
}

export interface DefectAnalysisResult {
  summary: string;
  totalScenarios: number;
  passed: number;
  failed: number;
  skipped: number;
  stabilityScore: number;
  confidence: number;
  mostFailedModule?: string;
  flakyCount: number;
  rootCauseDistribution: RootCauseBucket[];
  scenarios: DefectScenario[];
  xpathIssues: XPathIssue[];
  recommendations: string[];
}

export const EXECUTION_OS_OPTIONS: DefectChatOption[] = [
  { id: 'android', label: 'Android', value: 'android', icon: '🤖', description: 'Appium / Espresso reports' },
  { id: 'ios', label: 'iOS', value: 'ios', icon: '🍎', description: 'XCUITest / Appium reports' },
  { id: 'web', label: 'Web', value: 'web', icon: '🌐', description: 'Playwright / Selenium / Cypress' },
];

export const SUPPORTED_REPORT_EXTENSIONS = ['.html', '.htm', '.json', '.log', '.txt', '.xml', '.zip'];
