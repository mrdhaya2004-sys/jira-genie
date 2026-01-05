import React from 'react';
import { ChatProvider } from '@/contexts/ChatContext';
import MainLayout from '@/components/layout/MainLayout';
import ChatContainer from '@/components/chat/ChatContainer';
import { Helmet } from 'react-helmet-async';

const ChatPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>TicketBot - AI Jira Assistant</title>
        <meta name="description" content="Create Jira tickets with AI-powered assistance. Smart classification, duplicate detection, and automatic assignment." />
      </Helmet>
      <ChatProvider>
        <MainLayout>
          <ChatContainer />
        </MainLayout>
      </ChatProvider>
    </>
  );
};

export default ChatPage;
