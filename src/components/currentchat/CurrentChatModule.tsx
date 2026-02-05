import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import ChatSidebar from './ChatSidebar';
import ChatHeader from './ChatHeader';
import ChatMessageArea from './ChatMessageArea';
import ChatInputArea from './ChatInputArea';
import CreateChatDialog from './CreateChatDialog';
import ParticipantsDialog from './ParticipantsDialog';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';
import { CreateConversationData } from '@/types/chat';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const CurrentChatModule: React.FC = () => {
  const { user } = useAuth();
  const {
    conversations,
    selectedConversation,
    messages,
    participants,
    isLoading,
    isLoadingMessages,
    selectConversation,
    createConversation,
    sendMessage,
    deleteMessage,
    addParticipant,
    removeParticipant,
    deleteConversation,
    leaveConversation
  } = useChat();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDialogType, setCreateDialogType] = useState<'direct' | 'group'>('direct');
  const [participantsDialogOpen, setParticipantsDialogOpen] = useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);

  const handleNewChat = () => {
    setCreateDialogType('direct');
    setCreateDialogOpen(true);
  };

  const handleNewGroup = () => {
    setCreateDialogType('group');
    setCreateDialogOpen(true);
  };

  const handleCreateConversation = async (data: CreateConversationData) => {
    const conversation = await createConversation(data);
    if (conversation) {
      selectConversation(conversation);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedConversation) return;
    await sendMessage({
      conversation_id: selectedConversation.id,
      content
    });
  };

  const handleDeleteConversationClick = (conversationId: string) => {
    setConversationToDelete(conversationId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (conversationToDelete) {
      await deleteConversation(conversationToDelete);
      setConversationToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const handleLeaveGroup = () => {
    setLeaveDialogOpen(true);
  };

  const handleConfirmLeave = async () => {
    if (selectedConversation) {
      await leaveConversation(selectedConversation.id);
    }
    setLeaveDialogOpen(false);
  };

  const handleAddParticipant = () => {
    setAddMemberDialogOpen(true);
  };

  const handleAddMember = async (data: CreateConversationData) => {
    if (selectedConversation && data.participant_ids.length > 0) {
      for (const userId of data.participant_ids) {
        await addParticipant(selectedConversation.id, userId);
      }
    }
  };

  const isAdmin = participants.find(p => p.user_id === user?.id)?.is_admin || false;

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <ChatSidebar
        conversations={conversations}
        selectedConversation={selectedConversation}
        onSelectConversation={selectConversation}
        onNewChat={handleNewChat}
        onNewGroup={handleNewGroup}
        onDeleteConversation={handleDeleteConversationClick}
        isLoading={isLoading}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-background">
        {selectedConversation ? (
          <>
            <ChatHeader
              conversation={selectedConversation}
              participants={participants}
              onAddParticipant={handleAddParticipant}
              onViewParticipants={() => setParticipantsDialogOpen(true)}
              onLeaveGroup={handleLeaveGroup}
              onDeleteConversation={() => handleDeleteConversationClick(selectedConversation.id)}
            />
            <ChatMessageArea
              messages={messages}
              isLoading={isLoadingMessages}
              onDeleteMessage={deleteMessage}
            />
            <ChatInputArea
              onSend={handleSendMessage}
              disabled={isLoadingMessages}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium">Welcome to Current Chat</h3>
              <p className="text-sm mt-1">Select a conversation or start a new one</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Chat/Group Dialog */}
      <CreateChatDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        type={createDialogType}
        onCreateConversation={handleCreateConversation}
      />

      {/* Add Member Dialog */}
      <CreateChatDialog
        open={addMemberDialogOpen}
        onOpenChange={setAddMemberDialogOpen}
        type="group"
        onCreateConversation={handleAddMember}
      />

      {/* Participants Dialog */}
      <ParticipantsDialog
        open={participantsDialogOpen}
        onOpenChange={setParticipantsDialogOpen}
        participants={participants}
        isAdmin={isAdmin}
        onRemoveParticipant={(userId) => {
          if (selectedConversation) {
            removeParticipant(selectedConversation.id, userId);
          }
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone
              and all messages will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave Group Confirmation Dialog */}
      <AlertDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave this group? You will no longer receive messages
              from this group.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmLeave}
              className="bg-warning text-warning-foreground hover:bg-warning/90"
            >
              Leave Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CurrentChatModule;
