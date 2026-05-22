import React, { useState, useCallback, lazy, Suspense } from 'react';
import { Helmet } from 'react-helmet-async';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import MentionsPanel from '@/components/dashboard/MentionsPanel';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import ErrorBoundary from '@/components/common/ErrorBoundary';

// Lazy-load every module — only the active one is fetched/parsed.
const AgenticAIModule = lazy(() => import('@/components/workspace/AgenticAIModule'));
const JiraTicketRaiserModule = lazy(() => import('@/components/jira/JiraTicketRaiserModule'));
const LogicScenarioCreatorModule = lazy(() => import('@/components/scenario/LogicScenarioCreatorModule'));
const TestCaseGeneratorModule = lazy(() => import('@/components/testcase/TestCaseGeneratorModule'));
const XPathGeneratorModule = lazy(() => import('@/components/xpath/XPathGeneratorModule'));
const DefectAnalyzerModule = lazy(() => import('@/components/defect/DefectAnalyzerModule'));
const MyTicketsModule = lazy(() => import('@/components/tickets/MyTicketsModule'));
const HistoryModule = lazy(() => import('@/components/automation/HistoryModule'));
const CurrentChatModule = lazy(() => import('@/components/currentchat/CurrentChatModule'));
const AIConfigurationModule = lazy(() => import('@/components/settings/AIConfigurationModule'));
const ProfileModule = lazy(() => import('@/components/profile/ProfileModule'));
const AccountSettingsModule = lazy(() => import('@/components/settings/AccountSettingsModule'));
const AboutUsModule = lazy(() => import('@/components/about/AboutUsModule'));
const FounderPage = lazy(() => import('@/components/about/FounderPage'));

export type ActiveModule = 'mentions' | 'chat' | 'tickets' | 'history' | 'agentic-ai' | 'jira-ticket-raiser' | 'logic-scenario-creator' | 'test-case-generator' | 'xpath-generator' | 'defect-analyzer' | 'ai-settings' | 'profile' | 'account-settings' | 'about' | 'founder';

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
  const [activeModule, setActiveModule] = useState<ActiveModule>('mentions');
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);

  const handleResumeAction = useCallback((module: string, prompt: string, historyLogId?: string) => {
    const targetModule = MODULE_MAP[module];
    if (targetModule) {
      setResumeData({ module, prompt, historyLogId: historyLogId || '' });
      setActiveModule(targetModule);
      setTimeout(() => setResumeData(null), 500);
    }
  }, []);

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
            <div className="h-full module-enter">
              <Suspense fallback={<ModuleFallback />}>
                {activeModule === 'mentions' && <MentionsPanel />}
                {activeModule === 'chat' && <CurrentChatModule />}
                {activeModule === 'tickets' && <MyTicketsModule />}
                {activeModule === 'history' && <HistoryModule onResumeAction={handleResumeAction} />}
                {activeModule === 'agentic-ai' && <AgenticAIModule />}
                {activeModule === 'jira-ticket-raiser' && <JiraTicketRaiserModule onNavigateBack={() => setActiveModule('mentions')} />}
                {activeModule === 'logic-scenario-creator' && <LogicScenarioCreatorModule resumeData={resumeData} />}
                {activeModule === 'test-case-generator' && <TestCaseGeneratorModule resumeData={resumeData} />}
                {activeModule === 'xpath-generator' && <XPathGeneratorModule resumeData={resumeData} />}
                {activeModule === 'defect-analyzer' && <DefectAnalyzerModule />}
                {activeModule === 'ai-settings' && <AIConfigurationModule />}
                {activeModule === 'profile' && <ProfileModule />}
                {activeModule === 'account-settings' && <AccountSettingsModule />}
                {activeModule === 'about' && <AboutUsModule onOpenFounder={() => setActiveModule('founder')} />}
                {activeModule === 'founder' && <FounderPage onBack={() => setActiveModule('about')} />}
              </Suspense>
            </div>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

export default DashboardPage;
