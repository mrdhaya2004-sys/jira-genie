import { supabase } from '@/integrations/supabase/client';

interface CreateNotificationParams {
  userId: string;
  type: 'chat' | 'jira' | 'system';
  title: string;
  message: string;
  referenceId?: string;
  referenceType?: string;
}

export const createNotification = async (params: CreateNotificationParams) => {
  const { error } = await supabase.from('notifications').insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    reference_id: params.referenceId || null,
    reference_type: params.referenceType || null,
  });

  if (error) {
    console.error('Failed to create notification:', error);
  }
};

/**
 * Notify a user about a new chat message.
 */
export const notifyChatMessage = async (
  recipientUserId: string,
  senderName: string,
  messageSnippet: string,
  conversationId: string
) => {
  await createNotification({
    userId: recipientUserId,
    type: 'chat',
    title: `New message from ${senderName}`,
    message: messageSnippet.length > 100 ? messageSnippet.slice(0, 100) + '…' : messageSnippet,
    referenceId: conversationId,
    referenceType: 'conversation',
  });
};

/**
 * Notify a user about a mention (@username).
 */
export const notifyMention = async (
  recipientUserId: string,
  mentionedByName: string,
  snippet: string,
  sourceType: 'chat' | 'ticket',
  sourceId?: string
) => {
  await createNotification({
    userId: recipientUserId,
    type: sourceType === 'chat' ? 'chat' : 'jira',
    title: `${mentionedByName} mentioned you`,
    message: snippet.length > 100 ? snippet.slice(0, 100) + '…' : snippet,
    referenceId: sourceId,
    referenceType: sourceType === 'chat' ? 'conversation' : 'ticket',
  });
};

/**
 * Notify a user about Jira ticket activity.
 */
export const notifyJiraActivity = async (
  recipientUserId: string,
  ticketKey: string,
  action: string,
  summary: string
) => {
  await createNotification({
    userId: recipientUserId,
    type: 'jira',
    title: `${ticketKey} ${action}`,
    message: summary,
    referenceId: ticketKey,
    referenceType: 'ticket',
  });
};
