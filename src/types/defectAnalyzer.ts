export type DefectFlowPhase =
  | 'workspace_selection'
  | 'report_upload'
  | 'os_selection'
  | 'ready'
  | 'analyzing'
  | 'results';

export type ExecutionOS = 'android' | 'ios' | 'web';

export type ScenarioStatus = 'passed' | 'failed' | 'skipped' | 'blocked' | 'flaky' | 'unknown';

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

export type FailureType =
  | 'xpath_locator'
  | 'assertion'
  | 'timeout'
  | 'element_not_interactable'
  | 'element_not_found'
  | 'api_failure'
  | 'network'
  | 'data_mismatch'
  | 'environment'
  | 'app_crash'
  | 'unexpected_popup'
  | 'session_expired'
  | 'dependency'
  | 'slow_loading'
  | 'validation'
  | 'permission'
  | 'flaky'
  | 'build_mismatch'
  | 'configuration'
  | 'authentication'
  | 'ui_change'
  | 'unknown';

export type FailureLayer = 'ui' | 'api' | 'network' | 'data' | 'environment' | 'framework' | 'auth' | 'unknown';

export interface ScenarioScreenshotAnalysis {
  /** Index into DefectAnalysisResult.screenshots (so the UI can render the actual image). */
  screenshotIndex: number;
  /** Plain-language description of what the AI sees. */
  visualObservation: string;
  /** Concrete UI issue the AI identified (e.g. "Toast: 'Invalid credentials'", "Login button missing"). */
  detectedIssue?: string;
  /** Visible text the AI extracted (titles, errors, banners). */
  visibleText?: string;
  /** Region or component blocking interaction, if any. */
  blockingOverlay?: string;
  confidence?: number;
}

export interface DefectScenario {
  name: string;
  status: ScenarioStatus;
  module?: string;
  failureType?: FailureType;
  failureTypeLabel?: string;
  layer?: FailureLayer;
  failureReason?: string;
  rootCause?: string;
  detailedExplanation?: string;
  impactedFlow?: string;
  technicalInsight?: string;
  suggestedFix?: string;
  preventionRecommendation?: string;
  confidence?: number;
  /** True when the AI's diagnosis could not be cross-verified against the raw logs. */
  lowConfidenceReason?: string;
  /** True when the scenario name was found verbatim in the uploaded logs. */
  verifiedInLogs?: boolean;
  errorSnippet?: string;
  stackTrace?: string;
  durationMs?: number;
  tags?: string[];
  isFlaky?: boolean;
  executionSequence?: string[];
  /** AI vision analysis of report screenshots tied to this scenario. */
  screenshotAnalysis?: ScenarioScreenshotAnalysis[];
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

export interface ReportReliability {
  /** % of raw report content actually included in the AI prompt. */
  parsingCompletion: number;
  /** % of failure-relevant lines captured during smart extraction. */
  logCoverage: number;
  /** Aggregated AI analysis reliability (0-100), combining confidence + verification rate. */
  analysisReliability: number;
  /** Plain-language note when reliability is low. */
  notes?: string;
}

export interface DefectAnalysisResult {
  summary: string;
  totalScenarios: number;
  passed: number;
  failed: number;
  skipped: number;
  blocked: number;
  stabilityScore: number;
  confidence: number;
  mostFailedModule?: string;
  impactedModules?: string[];
  flakyCount: number;
  rootCauseDistribution: RootCauseBucket[];
  scenarios: DefectScenario[];
  xpathIssues: XPathIssue[];
  recommendations: string[];
  reliability?: ReportReliability;
}

export const EXECUTION_OS_OPTIONS: DefectChatOption[] = [
  { id: 'android', label: 'Android', value: 'android', icon: '🤖', description: 'Appium / Espresso reports' },
  { id: 'ios', label: 'iOS', value: 'ios', icon: '🍎', description: 'XCUITest / Appium reports' },
  { id: 'web', label: 'Web', value: 'web', icon: '🌐', description: 'Playwright / Selenium / Cypress' },
];

export const SUPPORTED_REPORT_EXTENSIONS = ['.html', '.htm', '.json', '.log', '.txt', '.xml', '.zip'];
