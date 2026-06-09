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
}

export interface CategoryFinding {
  title: string;
  severity: Severity;
  line: number | null;
  description: string;
  fix: string;
}

export interface RefactorVariant {
  code: string;
  changes: string[];
  benefits: string[];
}

export interface AnalysisResult {
  analysisId: string;
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
  refactors: {
    refactored?: RefactorVariant;
    optimized?: RefactorVariant;
    enterprise?: RefactorVariant;
  };
  expectedImprovements: string[];
  sevCounts: { critical: number; high: number; medium: number; low: number };
}

export const SUPPORTED_LANGUAGES = [
  'Java', 'Python', 'JavaScript', 'TypeScript', 'C#', 'Kotlin', 'Swift', 'SQL', 'Shell',
] as const;

export const SUPPORTED_FRAMEWORKS = [
  'Auto-detect', 'Selenium', 'Appium', 'Playwright', 'Cypress', 'TestNG', 'JUnit', 'Cucumber', 'Rest Assured', 'Postman', 'Robot Framework',
] as const;
