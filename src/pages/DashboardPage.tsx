import React, { useState, useCallback } from 'react';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import MentionsPanel from '@/components/dashboard/MentionsPanel';
import AgenticAIModule from '@/components/workspace/AgenticAIModule';
import JiraTicketRaiserModule from '@/components/jira/JiraTicketRaiserModule';
import LogicScenarioCreatorModule from '@/components/scenario/LogicScenarioCreatorModule';
import TestCaseGeneratorModule from '@/components/testcase/TestCaseGeneratorModule';
import XPathGeneratorModule from '@/components/xpath/XPathGeneratorModule';
import MyTicketsModule from '@/components/tickets/MyTicketsModule';
import HistoryModule from '@/components/automation/HistoryModule';
import CurrentChatModule from '@/components/currentchat/CurrentChatModule';
import AIConfigurationModule from '@/components/settings/AIConfigurationModule';
import ProfileModule from '@/components/profile/ProfileModule';

export type ActiveModule = 'mentions' | 'chat' | 'tickets' | 'history' | 'agentic-ai' | 'jira-ticket-raiser' | 'logic-scenario-creator' | 'test-case-generator' | 'xpath-generator' | 'ai-settings' | 'profile';

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

const DashboardPage: React.FC = () => {
  const [activeModule, setActiveModule] = useState<ActiveModule>('mentions');
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);

  const handleResumeAction = useCallback((module: string, prompt: string, historyLogId?: string) => {
    const targetModule = MODULE_MAP[module];
    if (targetModule) {
      setResumeData({ module, prompt, historyLogId: historyLogId || '' });
      setActiveModule(targetModule);
      // Clear after a tick so the module can pick it up
      setTimeout(() => setResumeData(null), 500);
    }
  }, []);

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-64 flex-shrink-0 border-r border-sidebar-border">
        <DashboardSidebar 
          activeModule={activeModule} 
          onModuleChange={setActiveModule}
          className="w-full" 
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader activeModule={activeModule} onModuleChange={setActiveModule} />
        <main className="flex-1 overflow-hidden bg-muted/30">
          {activeModule === 'mentions' && <MentionsPanel />}
          {activeModule === 'chat' && <CurrentChatModule />}
          {activeModule === 'tickets' && <MyTicketsModule />}
          {activeModule === 'history' && <HistoryModule onResumeAction={handleResumeAction} />}
          {activeModule === 'agentic-ai' && <AgenticAIModule />}
          {activeModule === 'jira-ticket-raiser' && <JiraTicketRaiserModule />}
          {activeModule === 'logic-scenario-creator' && <LogicScenarioCreatorModule resumeData={resumeData} />}
          {activeModule === 'test-case-generator' && <TestCaseGeneratorModule resumeData={resumeData} />}
          {activeModule === 'xpath-generator' && <XPathGeneratorModule resumeData={resumeData} />}
          {activeModule === 'ai-settings' && <AIConfigurationModule />}
          {activeModule === 'profile' && <ProfileModule />}
        </main>
      </div>
    </div>
  );
};

export default DashboardPage;
