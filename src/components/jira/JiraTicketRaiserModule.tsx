import React from 'react';
import { ChatProvider } from '@/contexts/ChatContext';
import ChatContainer from '@/components/chat/ChatContainer';

const JiraTicketRaiserModule: React.FC = () => {
  return (
    <ChatProvider>
      <div className="h-full flex flex-col bg-background">
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="text-xl">🎫</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold">Jira Ticket Raiser</h1>
              <p className="text-sm text-muted-foreground">AI-powered ticket creation assistant</p>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <ChatContainer />
        </div>
      </div>
    </ChatProvider>
  );
};

export default JiraTicketRaiserModule;
