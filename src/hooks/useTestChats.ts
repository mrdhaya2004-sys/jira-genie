import { useState, useCallback } from 'react';
import { Conversation, ChatMessageData } from '@/types/chat';

const TEST_CONVERSATIONS: Conversation[] = [
  {
    id: 'test-chat-1',
    name: 'Alice Johnson',
    type: 'direct',
    created_by: 'test-user-alice',
    avatar_url: null,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 600000).toISOString(),
    last_message: {
      id: 'test-msg-1c',
      conversation_id: 'test-chat-1',
      sender_id: 'test-user-alice',
      content: 'Sure, let me check the latest build logs.',
      message_type: 'text',
      metadata: {},
      is_deleted: false,
      created_at: new Date(Date.now() - 600000).toISOString(),
      updated_at: new Date(Date.now() - 600000).toISOString(),
    },
  },
  {
    id: 'test-chat-2',
    name: 'QA Team',
    type: 'group',
    created_by: 'test-user-bob',
    avatar_url: null,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 1800000).toISOString(),
    last_message: {
      id: 'test-msg-2d',
      conversation_id: 'test-chat-2',
      sender_id: 'test-user-carol',
      content: 'All regression tests passed! 🎉',
      message_type: 'text',
      metadata: {},
      is_deleted: false,
      created_at: new Date(Date.now() - 1800000).toISOString(),
      updated_at: new Date(Date.now() - 1800000).toISOString(),
    },
  },
  {
    id: 'test-chat-3',
    name: 'Bob Martinez',
    type: 'direct',
    created_by: 'test-user-bob',
    avatar_url: null,
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString(),
    last_message: {
      id: 'test-msg-3b',
      conversation_id: 'test-chat-3',
      sender_id: 'test-user-bob',
      content: 'Can you review the PR when you get a chance?',
      message_type: 'text',
      metadata: {},
      is_deleted: false,
      created_at: new Date(Date.now() - 7200000).toISOString(),
      updated_at: new Date(Date.now() - 7200000).toISOString(),
    },
  },
  {
    id: 'test-chat-4',
    name: 'Sprint Planning',
    type: 'group',
    created_by: 'test-user-alice',
    avatar_url: null,
    created_at: new Date(Date.now() - 259200000).toISOString(),
    updated_at: new Date(Date.now() - 14400000).toISOString(),
    last_message: {
      id: 'test-msg-4c',
      conversation_id: 'test-chat-4',
      sender_id: 'test-user-dave',
      content: 'I\'ll take the authentication tickets for this sprint.',
      message_type: 'text',
      metadata: {},
      is_deleted: false,
      created_at: new Date(Date.now() - 14400000).toISOString(),
      updated_at: new Date(Date.now() - 14400000).toISOString(),
    },
  },
  {
    id: 'test-chat-5',
    name: 'Carol Davis',
    type: 'direct',
    created_by: 'test-user-carol',
    avatar_url: null,
    created_at: new Date(Date.now() - 345600000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    last_message: {
      id: 'test-msg-5a',
      conversation_id: 'test-chat-5',
      sender_id: 'test-user-carol',
      content: 'The deployment went smoothly. No issues so far.',
      message_type: 'text',
      metadata: {},
      is_deleted: false,
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date(Date.now() - 86400000).toISOString(),
    },
  },
];

const TEST_MESSAGES: Record<string, ChatMessageData[]> = {
  'test-chat-1': [
    {
      id: 'test-msg-1a',
      conversation_id: 'test-chat-1',
      sender_id: 'current-user',
      content: 'Hey Alice, have you seen the latest test results?',
      message_type: 'text',
      metadata: {},
      is_deleted: false,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date(Date.now() - 3600000).toISOString(),
      sender: { full_name: 'You', email: 'you@example.com', avatar_url: null },
    },
    {
      id: 'test-msg-1b',
      conversation_id: 'test-chat-1',
      sender_id: 'test-user-alice',
      content: 'Yes! There were a few flaky tests on the login module.',
      message_type: 'text',
      metadata: {},
      is_deleted: false,
      created_at: new Date(Date.now() - 3000000).toISOString(),
      updated_at: new Date(Date.now() - 3000000).toISOString(),
      sender: { full_name: 'Alice Johnson', email: 'alice@example.com', avatar_url: null },
    },
    {
      id: 'test-msg-1c',
      conversation_id: 'test-chat-1',
      sender_id: 'test-user-alice',
      content: 'Sure, let me check the latest build logs.',
      message_type: 'text',
      metadata: {},
      is_deleted: false,
      created_at: new Date(Date.now() - 600000).toISOString(),
      updated_at: new Date(Date.now() - 600000).toISOString(),
      sender: { full_name: 'Alice Johnson', email: 'alice@example.com', avatar_url: null },
    },
  ],
  'test-chat-2': [
    {
      id: 'test-msg-2a',
      conversation_id: 'test-chat-2',
      sender_id: 'test-user-bob',
      content: 'Team, let\'s run the full regression suite before the release.',
      message_type: 'text',
      metadata: {},
      is_deleted: false,
      created_at: new Date(Date.now() - 7200000).toISOString(),
      updated_at: new Date(Date.now() - 7200000).toISOString(),
      sender: { full_name: 'Bob Martinez', email: 'bob@example.com', avatar_url: null },
    },
    {
      id: 'test-msg-2b',
      conversation_id: 'test-chat-2',
      sender_id: 'current-user',
      content: 'On it! I\'ll handle the API tests.',
      message_type: 'text',
      metadata: {},
      is_deleted: false,
      created_at: new Date(Date.now() - 5400000).toISOString(),
      updated_at: new Date(Date.now() - 5400000).toISOString(),
      sender: { full_name: 'You', email: 'you@example.com', avatar_url: null },
    },
    {
      id: 'test-msg-2c',
      conversation_id: 'test-chat-2',
      sender_id: 'test-user-dave',
      content: 'I\'ll cover the UI tests for the dashboard.',
      message_type: 'text',
      metadata: {},
      is_deleted: false,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date(Date.now() - 3600000).toISOString(),
      sender: { full_name: 'Dave Wilson', email: 'dave@example.com', avatar_url: null },
    },
    {
      id: 'test-msg-2d',
      conversation_id: 'test-chat-2',
      sender_id: 'test-user-carol',
      content: 'All regression tests passed! 🎉',
      message_type: 'text',
      metadata: {},
      is_deleted: false,
      created_at: new Date(Date.now() - 1800000).toISOString(),
      updated_at: new Date(Date.now() - 1800000).toISOString(),
      sender: { full_name: 'Carol Davis', email: 'carol@example.com', avatar_url: null },
    },
  ],
  'test-chat-3': [
    {
      id: 'test-msg-3a',
      conversation_id: 'test-chat-3',
      sender_id: 'current-user',
      content: 'Bob, I pushed the fix for the pagination bug.',
      message_type: 'text',
      metadata: {},
      is_deleted: false,
      created_at: new Date(Date.now() - 10800000).toISOString(),
      updated_at: new Date(Date.now() - 10800000).toISOString(),
      sender: { full_name: 'You', email: 'you@example.com', avatar_url: null },
    },
    {
      id: 'test-msg-3b',
      conversation_id: 'test-chat-3',
      sender_id: 'test-user-bob',
      content: 'Can you review the PR when you get a chance?',
      message_type: 'text',
      metadata: {},
      is_deleted: false,
      created_at: new Date(Date.now() - 7200000).toISOString(),
      updated_at: new Date(Date.now() - 7200000).toISOString(),
      sender: { full_name: 'Bob Martinez', email: 'bob@example.com', avatar_url: null },
    },
  ],
  'test-chat-4': [
    {
      id: 'test-msg-4a',
      conversation_id: 'test-chat-4',
      sender_id: 'test-user-alice',
      content: 'Sprint 14 planning starts now. Here are the priorities:',
      message_type: 'text',
      metadata: {},
      is_deleted: false,
      created_at: new Date(Date.now() - 28800000).toISOString(),
      updated_at: new Date(Date.now() - 28800000).toISOString(),
      sender: { full_name: 'Alice Johnson', email: 'alice@example.com', avatar_url: null },
    },
    {
      id: 'test-msg-4b',
      conversation_id: 'test-chat-4',
      sender_id: 'current-user',
      content: 'I can pick up the notification system refactor.',
      message_type: 'text',
      metadata: {},
      is_deleted: false,
      created_at: new Date(Date.now() - 21600000).toISOString(),
      updated_at: new Date(Date.now() - 21600000).toISOString(),
      sender: { full_name: 'You', email: 'you@example.com', avatar_url: null },
    },
    {
      id: 'test-msg-4c',
      conversation_id: 'test-chat-4',
      sender_id: 'test-user-dave',
      content: 'I\'ll take the authentication tickets for this sprint.',
      message_type: 'text',
      metadata: {},
      is_deleted: false,
      created_at: new Date(Date.now() - 14400000).toISOString(),
      updated_at: new Date(Date.now() - 14400000).toISOString(),
      sender: { full_name: 'Dave Wilson', email: 'dave@example.com', avatar_url: null },
    },
  ],
  'test-chat-5': [
    {
      id: 'test-msg-5a',
      conversation_id: 'test-chat-5',
      sender_id: 'test-user-carol',
      content: 'The deployment went smoothly. No issues so far.',
      message_type: 'text',
      metadata: {},
      is_deleted: false,
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date(Date.now() - 86400000).toISOString(),
      sender: { full_name: 'Carol Davis', email: 'carol@example.com', avatar_url: null },
    },
  ],
};

export function useTestChats() {
  const [testConversations, setTestConversations] = useState<Conversation[]>(TEST_CONVERSATIONS);
  const [testMessages, setTestMessages] = useState<Record<string, ChatMessageData[]>>(TEST_MESSAGES);

  const deleteTestConversation = useCallback((conversationId: string) => {
    setTestConversations(prev => prev.filter(c => c.id !== conversationId));
    setTestMessages(prev => {
      const next = { ...prev };
      delete next[conversationId];
      return next;
    });
  }, []);

  const deleteTestMessage = useCallback((messageId: string) => {
    setTestMessages(prev => {
      const next: Record<string, ChatMessageData[]> = {};
      for (const [convId, msgs] of Object.entries(prev)) {
        next[convId] = msgs.map(m =>
          m.id === messageId
            ? { ...m, is_deleted: true, content: 'This message was deleted' }
            : m
        );
      }
      return next;
    });
  }, []);

  const getTestMessages = useCallback((conversationId: string): ChatMessageData[] => {
    return testMessages[conversationId] || [];
  }, [testMessages]);

  const isTestConversation = useCallback((conversationId: string): boolean => {
    return conversationId.startsWith('test-chat-');
  }, []);

  return {
    testConversations,
    deleteTestConversation,
    deleteTestMessage,
    getTestMessages,
    isTestConversation,
  };
}
