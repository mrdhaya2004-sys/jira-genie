export interface SubScores {
  readability: number;
  maintainability: number;
  stability: number;
  performance: number;
  security: number;
  automationBestPractice: number;
  scalability: number;
}

export interface AutomationStability {
  score: number;
  risk: 'low' | 'medium' | 'high';
  reasons: string[];
}

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export interface CodeIssue {
  line?: number;
  endLine?: number | null;
  severity: Severity;
  type: string;
  title: string;
  problem: string;
  suggestion: string;
  codeBefore: string;
  codeAfter: string;
  explanation: string;
  bestPractice: string;
  evidence?: string;
  confidence?: number;
}

export interface CategoryFinding {
  title: string;
  severity: Severity;
  line: number | null;
  description: string;
  fix: string;
  evidence?: string;
  confidence?: number;
}

export interface RefactorVariant {
  code: string;
  changes: string[];
  benefits: string[];
  /** Optional 1-line headline like "Adds explicit waits and POM separation". */
  improvementSummary?: string;
}

export type RefactorLevel =
  | 'refactored'
  | 'optimized'
  | 'enterprise'
  | 'aiEnhanced'
  | 'nextGen';

export interface CodeExplanation {
  purpose: string;                 // What this method/code does
  rationale: string;               // Why it exists
  businessLogic: string;           // Business logic performed
  validations: string[];           // Validations performed
  testingObjective: string;        // Testing objective covered
  risks: string[];                 // Risks present
}

export interface TestingIntelligence {
  categories: string[];            // e.g. "UI Validation", "Smoke Testing"
  coverageScore: number;           // 0-100
  missingScenarios: string[];      // Gaps detected
  recommendedTestCases: string[];  // Suggested new tests
  automationScores?: {
    locatorQuality: number;
    waitStrategy: number;
    frameworkMaturity: number;
    automationStability: number;
    flakyTestRisk: 'low' | 'medium' | 'high';
  };
}

export interface LearningMode {
  whatItDoes: string;
  howItWorks: string;
  whyWrittenThisWay: string;
  alternativeApproaches: string[];
  industryBestPractice: string;
  commonMistakes: string[];
}

export interface AnalysisResult {
  analysisId: string;
  degradedNotice?: string;
  verificationNotice?: string;
  confidenceThreshold?: number;

  language: string;
  framework: string | null;
  summary: string;
  overallScore: number;
  subScores: SubScores;
  automationStability: AutomationStability;
  issues: CodeIssue[];
  securityFindings: CategoryFinding[];
  performanceFindings: CategoryFinding[];
  testAutomationFindings: CategoryFinding[];
  refactors: Partial<Record<RefactorLevel, RefactorVariant>>;
  expectedImprovements: string[];
  sevCounts: { critical: number; high: number; medium: number; low: number };

  /** Original code as uploaded by the user — used for diff/history. */
  originalCode?: string;

  // New deep-analysis sections
  codeExplanation?: CodeExplanation;
  testingIntelligence?: TestingIntelligence;
  learningMode?: LearningMode;
}

export const SUPPORTED_LANGUAGES = [
  'Java', 'Python', 'JavaScript', 'TypeScript', 'C#', 'Kotlin', 'Swift', 'SQL', 'Shell',
] as const;

export const SUPPORTED_FRAMEWORKS = [
  'Auto-detect', 'Selenium', 'Appium', 'Playwright', 'Cypress', 'TestNG', 'JUnit', 'Cucumber', 'Rest Assured', 'Postman', 'Robot Framework',
] as const;

export const REFACTOR_LEVEL_META: Record<RefactorLevel, { label: string; tagline: string; level: number }> = {
  refactored: { label: 'Refactored',    tagline: 'Clean & readable',                 level: 1 },
  optimized:  { label: 'Optimized',     tagline: 'Performance-tuned',                level: 2 },
  enterprise: { label: 'Enterprise',    tagline: 'Production-grade & resilient',     level: 3 },
  aiEnhanced: { label: 'AI Enhanced',   tagline: 'AI-augmented patterns & guards',   level: 4 },
  nextGen:    { label: 'Next-Gen',      tagline: 'State-of-the-art architecture',    level: 5 },
};
