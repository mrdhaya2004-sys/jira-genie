import React from 'react';
import { ChatProvider } from '@/contexts/ChatContext';
import MainLayout from '@/components/layout/MainLayout';
import ChatContainer from '@/components/chat/ChatContainer';
import { Helmet } from 'react-helmet-async';

const ChatPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>AI Jira Chat — Test Zone</title>
        <meta name="description" content="Create Jira tickets with AI-powered assistance. Smart classification, duplicate detection, and automatic assignment." />
        <link rel="canonical" href="https://www.testzoneai.com/chat" />
        <meta property="og:title" content="AI Jira Chat — Test Zone" />
        <meta property="og:description" content="Create Jira tickets with AI-powered assistance. Smart classification, duplicate detection, and automatic assignment." />
        <meta property="og:url" content="https://www.testzoneai.com/chat" />
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
