import React, { useState } from 'react';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import MentionsPanel from '@/components/dashboard/MentionsPanel';
import AgenticAIModule from '@/components/workspace/AgenticAIModule';
import JiraTicketRaiserModule from '@/components/jira/JiraTicketRaiserModule';
import LogicScenarioCreatorModule from '@/components/scenario/LogicScenarioCreatorModule';
import TestCaseGeneratorModule from '@/components/testcase/TestCaseGeneratorModule';
import XPathGeneratorModule from '@/components/xpath/XPathGeneratorModule';
import MyTicketsModule from '@/components/tickets/MyTicketsModule';

export type ActiveModule = 'mentions' | 'chat' | 'tickets' | 'history' | 'agentic-ai' | 'jira-ticket-raiser' | 'logic-scenario-creator' | 'test-case-generator' | 'xpath-generator';

const DashboardPage: React.FC = () => {
  const [activeModule, setActiveModule] = useState<ActiveModule>('mentions');

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
          {activeModule === 'chat' && (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Chat module coming soon
            </div>
          )}
          {activeModule === 'tickets' && <MyTicketsModule />}
          {activeModule === 'history' && (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              History module coming soon
            </div>
          )}
          {activeModule === 'agentic-ai' && <AgenticAIModule />}
          {activeModule === 'jira-ticket-raiser' && <JiraTicketRaiserModule />}
          {activeModule === 'logic-scenario-creator' && <LogicScenarioCreatorModule />}
          {activeModule === 'test-case-generator' && <TestCaseGeneratorModule />}
          {activeModule === 'xpath-generator' && <XPathGeneratorModule />}
        </main>
      </div>
    </div>
  );
};

export default DashboardPage;
