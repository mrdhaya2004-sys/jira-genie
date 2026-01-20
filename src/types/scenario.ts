export type AutomationFramework = 
  | 'cucumber'
  | 'testng'
  | 'playwright'
  | 'pytest'
  | 'custom';

export interface FrameworkOption {
  id: AutomationFramework;
  name: string;
  description: string;
  icon: string;
}

export const AUTOMATION_FRAMEWORKS: FrameworkOption[] = [
  {
    id: 'cucumber',
    name: 'Cucumber (BDD)',
    description: 'Behavior-driven development with Gherkin syntax',
    icon: '🥒',
  },
  {
    id: 'testng',
    name: 'TestNG',
    description: 'Java-based testing framework',
    icon: '☕',
  },
  {
    id: 'playwright',
    name: 'Playwright',
    description: 'Modern end-to-end testing for web apps',
    icon: '🎭',
  },
  {
    id: 'pytest',
    name: 'PyTest',
    description: 'Python testing framework',
    icon: '🐍',
  },
  {
    id: 'custom',
    name: 'Custom Framework',
    description: 'Define your own automation approach',
    icon: '⚙️',
  },
];

export type ScenarioFlowPhase = 
  | 'framework_selection'
  | 'workspace_selection'
  | 'module_selection'
  | 'ready_for_query'
  | 'generating'
  | 'scenario_generated'
  | 'code_framework_selection'
  | 'code_generating'
  | 'code_generated';

export interface ScenarioChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  type?: 'text' | 'framework_select' | 'workspace_select' | 'module_select' | 'scenario' | 'code_framework_select' | 'code_display';
  options?: ScenarioChatOption[];
  scenario?: GeneratedScenario;
  generatedCode?: GeneratedCode;
  timestamp: string;
}

export interface ScenarioChatOption {
  id: string;
  label: string;
  value: string;
  icon?: string;
  description?: string;
}

export interface GeneratedScenario {
  title: string;
  framework: AutomationFramework;
  module: string;
  steps: string[];
  tags?: string[];
  platform?: 'android' | 'ios' | 'both';
  scenarioType?: 'positive' | 'negative' | 'edge';
}

export interface ScenarioGenerationRequest {
  workspaceId: string;
  framework: AutomationFramework;
  module: string;
  query: string;
  context: {
    userStories: string;
    hasApk: boolean;
    hasIpa: boolean;
    appFiles: { name: string; type: string }[];
    testCases?: string;
  };
}

// Code Generation Types
export type CodeFramework = 
  | 'selenium_java'
  | 'selenium_python'
  | 'playwright_js'
  | 'playwright_ts'
  | 'cypress'
  | 'pytest'
  | 'appium_java'
  | 'appium_python';

export interface CodeFrameworkOption {
  id: CodeFramework;
  name: string;
  description: string;
  icon: string;
  language: string;
  fileExtension: string;
}

export const CODE_FRAMEWORKS: CodeFrameworkOption[] = [
  {
    id: 'selenium_java',
    name: 'Selenium with Java',
    description: 'Page Object Model with Java & TestNG',
    icon: '☕',
    language: 'java',
    fileExtension: 'java',
  },
  {
    id: 'selenium_python',
    name: 'Selenium with Python',
    description: 'Page Object Pattern with Python',
    icon: '🐍',
    language: 'python',
    fileExtension: 'py',
  },
  {
    id: 'playwright_js',
    name: 'Playwright (JavaScript)',
    description: 'Modern E2E testing with JavaScript',
    icon: '🎭',
    language: 'javascript',
    fileExtension: 'js',
  },
  {
    id: 'playwright_ts',
    name: 'Playwright (TypeScript)',
    description: 'Type-safe E2E testing with TypeScript',
    icon: '🎭',
    language: 'typescript',
    fileExtension: 'ts',
  },
  {
    id: 'cypress',
    name: 'Cypress',
    description: 'Fast, reliable E2E testing framework',
    icon: '🌲',
    language: 'javascript',
    fileExtension: 'js',
  },
  {
    id: 'pytest',
    name: 'PyTest',
    description: 'Python testing with fixtures',
    icon: '🧪',
    language: 'python',
    fileExtension: 'py',
  },
  {
    id: 'appium_java',
    name: 'Appium with Java',
    description: 'Mobile automation with Java',
    icon: '📱',
    language: 'java',
    fileExtension: 'java',
  },
  {
    id: 'appium_python',
    name: 'Appium with Python',
    description: 'Mobile automation with Python',
    icon: '📱',
    language: 'python',
    fileExtension: 'py',
  },
];

export interface GeneratedCode {
  code: string;
  framework: CodeFramework;
  language: string;
  fileName: string;
  explanation?: string;
}

export interface CodeGenerationRequest {
  workspaceId: string;
  scenario: string;
  codeFramework: CodeFramework;
  module: string;
  context: {
    userStories: string;
    hasApk: boolean;
    hasIpa: boolean;
  };
}
