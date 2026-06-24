import React, { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { Helmet } from 'react-helmet-async';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import MentionsPanel from '@/components/dashboard/MentionsPanel';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import AIActivationBanner from '@/components/ai/AIActivationBanner';
import { moduleLoaders, preloadFrequentModules } from '@/lib/modulePreloader';
import { trackEvent } from '@/lib/eventTracker';

// Lazy-load every module — only the active one is fetched/parsed.
// Loader factories are shared with the preloader so hover/focus preloads dedupe.
type AnyComp = { default: React.ComponentType<any> };
const AgenticAIModule = lazy(moduleLoaders['agentic-ai'] as () => Promise<AnyComp>);
const JiraTicketRaiserModule = lazy(moduleLoaders['jira-ticket-raiser'] as () => Promise<AnyComp>);
const LogicScenarioCreatorModule = lazy(moduleLoaders['logic-scenario-creator'] as () => Promise<AnyComp>);
const TestCaseGeneratorModule = lazy(moduleLoaders['test-case-generator'] as () => Promise<AnyComp>);
const TestDataGeneratorModule = lazy(moduleLoaders['test-data-generator'] as () => Promise<AnyComp>);
const XPathGeneratorModule = lazy(moduleLoaders['xpath-generator'] as () => Promise<AnyComp>);
const DefectAnalyzerModule = lazy(moduleLoaders['defect-analyzer'] as () => Promise<AnyComp>);
const GitLabExecutionModule = lazy(moduleLoaders['gitlab-execution'] as () => Promise<AnyComp>);
const CodeAnalyzerModule = lazy(moduleLoaders['code-analyzer'] as () => Promise<AnyComp>);
const MyTicketsModule = lazy(moduleLoaders['tickets'] as () => Promise<AnyComp>);
const HistoryModule = lazy(moduleLoaders['history'] as () => Promise<AnyComp>);
const CurrentChatModule = lazy(moduleLoaders['chat'] as () => Promise<AnyComp>);
const AIConfigurationModule = lazy(moduleLoaders['ai-settings'] as () => Promise<AnyComp>);
const ProfileModule = lazy(moduleLoaders['profile'] as () => Promise<AnyComp>);
const AccountSettingsModule = lazy(moduleLoaders['account-settings'] as () => Promise<AnyComp>);
const AboutUsModule = lazy(moduleLoaders['about'] as () => Promise<AnyComp>);
const FounderPage = lazy(moduleLoaders['founder'] as () => Promise<AnyComp>);
const IntelligenceHubModule = lazy(moduleLoaders['intelligence-hub'] as () => Promise<AnyComp>);

export type ActiveModule = 'intelligence-hub' | 'mentions' | 'chat' | 'tickets' | 'history' | 'agentic-ai' | 'jira-ticket-raiser' | 'logic-scenario-creator' | 'test-case-generator' | 'test-data-generator' | 'xpath-generator' | 'defect-analyzer' | 'gitlab-execution' | 'code-analyzer' | 'ai-settings' | 'profile' | 'account-settings' | 'about' | 'founder';

const MODULE_MAP: Record<string, ActiveModule> = {
  'test-case-generator': 'test-case-generator',
  'logic-scenario-creator': 'logic-scenario-creator',
  'xpath-generator': 'xpath-generator',
  'jira-ticket-raiser': 'jira-ticket-raiser',
  'agentic-ai': 'agentic-ai',
};

export interface ResumeData {
  module: string;
  prompt: string;
  historyLogId: string;
}

const ModuleFallback: React.FC = () => (
  <div className="h-full w-full p-6 space-y-4 bg-background text-foreground">
    <Skeleton className="h-10 w-[min(18rem,60%)]" />
    <Skeleton className="h-6 w-[min(28rem,80%)]" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  </div>
);

const ModuleCrashFallback: React.FC<{ onRecover: () => void }> = ({ onRecover }) => (
  <div className="flex h-full w-full items-center justify-center bg-background p-6 text-foreground">
    <div className="w-full max-w-lg rounded-2xl border border-border bg-card/80 p-6 text-center shadow-lg">
      <h2 className="text-lg font-semibold">Module temporarily unavailable</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        This module failed safely. Test Zone stayed online instead of showing a blank screen.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Button type="button" onClick={onRecover}>Back to Mentions</Button>
        <Button type="button" variant="outline" onClick={() => window.location.reload()}>Reload app</Button>
      </div>
    </div>
  </div>
);

const DashboardPage: React.FC = () => {
  const [activeModule, setActiveModule] = useState<ActiveModule>('intelligence-hub');
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);

  const handleResumeAction = useCallback((module: string, prompt: string, historyLogId?: string) => {
    const targetModule = MODULE_MAP[module];
    if (targetModule) {
      setResumeData({ module, prompt, historyLogId: historyLogId || '' });
      setActiveModule(targetModule);
      setTimeout(() => setResumeData(null), 500);
    }
  }, []);

  // Idle-preload the most frequently used modules so first click feels instant.
  useEffect(() => {
    preloadFrequentModules();
  }, []);

  // Persist a `module_opened` event with duration whenever the active module changes.
  useEffect(() => {
    const openedAt = Date.now();
    void trackEvent({ module: activeModule, action: 'module_opened' });
    return () => {
      void trackEvent({ module: activeModule, action: 'module_closed', durationMs: Date.now() - openedAt });
    };
  }, [activeModule]);

  return (
    <div className="flex h-screen bg-background">
      <Helmet>
        <title>Test Zone — AI Testing & Jira Automation Dashboard</title>
        <meta name="description" content="Hive Mind workspace for AI-powered test case generation, logic scenarios, XPath selectors, and Jira ticket automation." />
        <link rel="canonical" href="https://www.testzoneai.com/" />
        <meta property="og:title" content="Test Zone — AI Testing & Jira Automation Dashboard" />
        <meta property="og:description" content="Hive Mind workspace for AI-powered test case generation, logic scenarios, XPath selectors, and Jira ticket automation." />
        <meta property="og:url" content="https://www.testzoneai.com/" />
      </Helmet>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-[260px] flex-shrink-0 border-r border-sidebar-border relative">
        <DashboardSidebar 
          activeModule={activeModule} 
          onModuleChange={setActiveModule}
          className="w-full" 
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader activeModule={activeModule} onModuleChange={setActiveModule} />
        <main className="flex-1 overflow-hidden bg-background/80">
          <ErrorBoundary
            key={activeModule}
            label={`Module: ${activeModule}`}
            resetKeys={[activeModule]}
            fallback={<ModuleCrashFallback onRecover={() => setActiveModule('mentions')} />}
          >
            <div className="h-full module-enter flex flex-col">
              <div className="flex-1 min-h-0">
                <Suspense fallback={<ModuleFallback />}>
                  {activeModule === 'intelligence-hub' && <IntelligenceHubModule />}
                  {activeModule === 'mentions' && <MentionsPanel />}
                  {activeModule === 'chat' && <CurrentChatModule />}
                  {activeModule === 'tickets' && <MyTicketsModule />}
                  {activeModule === 'history' && <HistoryModule onResumeAction={handleResumeAction} />}
                  {activeModule === 'agentic-ai' && <AgenticAIModule />}
                  {activeModule === 'jira-ticket-raiser' && <JiraTicketRaiserModule onNavigateBack={() => setActiveModule('mentions')} />}
                  {activeModule === 'logic-scenario-creator' && <LogicScenarioCreatorModule resumeData={resumeData} />}
                  {activeModule === 'test-case-generator' && <TestCaseGeneratorModule resumeData={resumeData} />}
                  {activeModule === 'test-data-generator' && <TestDataGeneratorModule />}
                  {activeModule === 'xpath-generator' && <XPathGeneratorModule resumeData={resumeData} />}
                  {activeModule === 'defect-analyzer' && <DefectAnalyzerModule />}
                  {activeModule === 'gitlab-execution' && <GitLabExecutionModule />}
                  {activeModule === 'code-analyzer' && <CodeAnalyzerModule />}
                  {activeModule === 'ai-settings' && <AIConfigurationModule />}
                  {activeModule === 'profile' && <ProfileModule />}
                  {activeModule === 'account-settings' && <AccountSettingsModule />}
                  {activeModule === 'about' && <AboutUsModule onOpenFounder={() => setActiveModule('founder')} />}
                  {activeModule === 'founder' && <FounderPage onBack={() => setActiveModule('about')} />}
                </Suspense>
              </div>
            </div>
          </ErrorBoundary>
        </main>
      </div>
      {/* Global bottom AI activation notification — sticky across all modules */}
      {activeModule !== 'ai-settings' && (
        <AIActivationBanner onOpenConfig={() => setActiveModule('ai-settings')} />
      )}

    </div>
  );
};

export default DashboardPage;
