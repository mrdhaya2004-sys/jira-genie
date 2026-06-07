// Centralized lazy-module loader registry.
// Both DashboardPage (for React.lazy) and the sidebar (for hover/focus preloading)
// import factories from here so chunks are deduped by Vite.
import type { ActiveModule } from '@/pages/DashboardPage';

type Loader = () => Promise<unknown>;

export const moduleLoaders = {
  'agentic-ai': () => import('@/components/workspace/AgenticAIModule'),
  'jira-ticket-raiser': () => import('@/components/jira/JiraTicketRaiserModule'),
  'logic-scenario-creator': () => import('@/components/scenario/LogicScenarioCreatorModule'),
  'test-case-generator': () => import('@/components/testcase/TestCaseGeneratorModule'),
  'xpath-generator': () => import('@/components/xpath/XPathGeneratorModule'),
  'defect-analyzer': () => import('@/components/defect/DefectAnalyzerModule'),
  'gitlab-execution': () => import('@/components/gitlab/GitLabExecutionModule'),
  'tickets': () => import('@/components/tickets/MyTicketsModule'),
  'history': () => import('@/components/automation/HistoryModule'),
  'chat': () => import('@/components/currentchat/CurrentChatModule'),
  'ai-settings': () => import('@/components/settings/AIConfigurationModule'),
  'profile': () => import('@/components/profile/ProfileModule'),
  'account-settings': () => import('@/components/settings/AccountSettingsModule'),
  'about': () => import('@/components/about/AboutUsModule'),
  'founder': () => import('@/components/about/FounderPage'),
} satisfies Partial<Record<ActiveModule, Loader>>;

const started = new Set<string>();

export function preloadModule(module: ActiveModule | keyof typeof moduleLoaders) {
  const loader = (moduleLoaders as Record<string, Loader | undefined>)[module];
  if (!loader || started.has(module)) return;
  started.add(module);
  // Fire-and-forget; errors are swallowed so a failed preload never breaks UX
  loader().catch(() => started.delete(module));
}

// Preload the most frequently used modules during browser idle time
export function preloadFrequentModules() {
  const targets: Array<keyof typeof moduleLoaders> = [
    'chat',
    'test-case-generator',
    'xpath-generator',
    'defect-analyzer',
    'agentic-ai',
  ];
  const run = () => targets.forEach(preloadModule);
  if (typeof window === 'undefined') return;
  const ric = (window as typeof window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  }).requestIdleCallback;
  if (ric) ric(run, { timeout: 2000 });
  else setTimeout(run, 1200);
}
