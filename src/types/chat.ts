export type ConversationType = 'direct' | 'group';

export interface Conversation {
  id: string;
  name: string | null;
  type: ConversationType;
  created_by: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  teams_chat_id?: string | null;
  is_teams_synced?: boolean;
  participants?: ConversationParticipant[];
  last_message?: ChatMessageData;
  unread_count?: number;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string | null;
  is_admin: boolean;
  profile?: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

export interface ChatMessageData {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  metadata: Record<string, unknown>;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  sender?: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

export interface CreateConversationData {
  name?: string;
  type: ConversationType;
  participant_ids: string[];
}

export interface SendMessageData {
  conversation_id: string;
  content: string;
  message_type?: 'text' | 'image' | 'file';
  metadata?: Record<string, unknown>;
}
