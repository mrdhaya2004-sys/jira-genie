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
  | 'scenario_generated';

export interface ScenarioChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  type?: 'text' | 'framework_select' | 'workspace_select' | 'module_select' | 'scenario';
  options?: ScenarioChatOption[];
  scenario?: GeneratedScenario;
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
