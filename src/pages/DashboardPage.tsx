import React, { useState } from 'react';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import MentionsPanel from '@/components/dashboard/MentionsPanel';

export type ActiveModule = 'mentions' | 'chat' | 'tickets' | 'history';

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
          {activeModule === 'tickets' && (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              My Tickets module coming soon
            </div>
          )}
          {activeModule === 'history' && (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              History module coming soon
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default DashboardPage;
