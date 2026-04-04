import React, { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import ChatSidebar from './ChatSidebar';
import ChatHeader from './ChatHeader';
import ChatMessageArea from './ChatMessageArea';
import ChatInputArea from './ChatInputArea';
import CreateChatDialog from './CreateChatDialog';
import ParticipantsDialog from './ParticipantsDialog';
import UserSearchPanel from './UserSearchPanel';
import ProfileIdSetupDialog from './ProfileIdSetupDialog';
import TypingIndicatorBar from './TypingIndicatorBar';
import TeamsSettingsDialog from '@/components/teams/TeamsSettingsDialog';
import { useChat } from '@/hooks/useChat';
import { useTestChats } from '@/hooks/useTestChats';
import { usePresence } from '@/hooks/usePresence';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useReactions } from '@/hooks/useReactions';
import { useProfileId } from '@/hooks/useProfileId';
import { useHiveMindChat } from '@/hooks/useHiveMindChat';
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
    conversations, selectedConversation, messages, participants,
    isLoading, isLoadingMessages, selectConversation, createConversation,
    sendMessage, deleteMessage, addParticipant, removeParticipant,
    deleteConversation, leaveConversation, setSelectedConversation
  } = useChat();

  const { testConversations, deleteTestConversation, deleteTestMessage, getTestMessages, isTestConversation } = useTestChats();
  const { getStatus, fetchPresence } = usePresence();
  const { profileId } = useProfileId();
  const { isHiveMindMention, extractHiveMindQuery, sendToHiveMind } = useHiveMindChat();

  const [testSelectedConv, setTestSelectedConv] = useState<string | null>(null);

  const activeConversation = testSelectedConv
    ? testConversations.find(c => c.id === testSelectedConv) || null
    : selectedConversation;

  const activeMessages = testSelectedConv ? getTestMessages(testSelectedConv) : messages;
  const allConversations = [...testConversations, ...conversations];

  // Typing indicator
  const { typingText, handleTyping } = useTypingIndicator(activeConversation?.id || null);

  // Reactions
  const { fetchReactions, toggleReaction, getReactionGroups } = useReactions(activeConversation?.id || null);

  // Fetch reactions when messages change
  useEffect(() => {
    if (activeMessages.length > 0 && !testSelectedConv) {
      fetchReactions(activeMessages.map(m => m.id));
    }
  }, [activeMessages, fetchReactions, testSelectedConv]);

  // Fetch presence for participants
  useEffect(() => {
    if (participants.length > 0) {
      fetchPresence(participants.map(p => p.user_id));
    }
  }, [participants, fetchPresence]);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDialogType, setCreateDialogType] = useState<'direct' | 'group'>('direct');
  const [participantsDialogOpen, setParticipantsDialogOpen] = useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [teamsSettingsOpen, setTeamsSettingsOpen] = useState(false);
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [profileSetupOpen, setProfileSetupOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);

  // Prompt for profile ID creation if not set
  useEffect(() => {
    if (user && profileId === null && !profileSetupOpen) {
      const timer = setTimeout(() => setProfileSetupOpen(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [user, profileId, profileSetupOpen]);

  const handleNewChat = () => { setCreateDialogType('direct'); setCreateDialogOpen(true); };
  const handleNewGroup = () => { setCreateDialogType('group'); setCreateDialogOpen(true); };

  const handleCreateConversation = async (data: CreateConversationData) => {
    const conversation = await createConversation(data);
    if (conversation) selectConversation(conversation);
  };

  const handleSendMessage = async (content: string) => {
    if (!activeConversation) return;
    if (isTestConversation(activeConversation.id)) return;
    await sendMessage({ conversation_id: activeConversation.id, content });

    if (isHiveMindMention(content)) {
      const query = extractHiveMindQuery(content);
      if (query) {
        sendToHiveMind(query, activeConversation.id);
      }
    }
  };

  const handleStartChatFromSearch = async (userId: string, userName: string) => {
    const existing = conversations.find(c => 
      c.type === 'direct' && 
      c.participants?.some(p => p.user_id === userId)
    );

    if (existing) {
      selectConversation(existing);
      setUserSearchOpen(false);
      return;
    }

    const conversation = await createConversation({
      type: 'direct',
      participant_ids: [userId],
      name: userName,
    });
    if (conversation) {
      selectConversation(conversation);
    }
    setUserSearchOpen(false);
  };

  const handleDeleteConversationClick = (conversationId: string) => {
    setConversationToDelete(conversationId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (conversationToDelete) {
      if (isTestConversation(conversationToDelete)) {
        deleteTestConversation(conversationToDelete);
        if (testSelectedConv === conversationToDelete) setTestSelectedConv(null);
      } else {
        await deleteConversation(conversationToDelete);
      }
      setConversationToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const handleConfirmLeave = async () => {
    if (selectedConversation) await leaveConversation(selectedConversation.id);
    setLeaveDialogOpen(false);
  };

  const handleAddMember = async (data: CreateConversationData) => {
    if (selectedConversation && data.participant_ids.length > 0) {
      for (const userId of data.participant_ids) {
        await addParticipant(selectedConversation.id, userId);
      }
    }
  };

  const isAdmin = participants.find(p => p.user_id === user?.id)?.is_admin || false;

  const handleSelectConversation = (conversation: typeof allConversations[0]) => {
    if (isTestConversation(conversation.id)) {
      setTestSelectedConv(conversation.id);
      setSelectedConversation(null);
    } else {
      setTestSelectedConv(null);
      selectConversation(conversation);
    }
  };

  const handleDeleteActiveMessage = (messageId: string) => {
    if (testSelectedConv) deleteTestMessage(messageId);
    else deleteMessage(messageId);
  };

  return (
    <div className="h-full flex overflow-hidden bg-background">
      {/* Sidebar - fixed width, never collapses */}
      <div className="relative flex-shrink-0 w-80 min-w-[280px]">
        <ChatSidebar
          conversations={allConversations}
          selectedConversation={activeConversation}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          onNewGroup={handleNewGroup}
          onDeleteConversation={handleDeleteConversationClick}
          onOpenTeamsSettings={() => setTeamsSettingsOpen(true)}
          onOpenUserSearch={() => setUserSearchOpen(true)}
          isLoading={isLoading}
          getPresenceStatus={getStatus}
        />
        <UserSearchPanel
          open={userSearchOpen}
          onClose={() => setUserSearchOpen(false)}
          onStartChat={handleStartChatFromSearch}
        />
      </div>

      {/* Main Chat Area - fills remaining space */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {activeConversation ? (
          <>
            <ChatHeader
              conversation={activeConversation}
              participants={testSelectedConv ? [] : participants}
              onAddParticipant={() => setAddMemberDialogOpen(true)}
              onViewParticipants={() => setParticipantsDialogOpen(true)}
              onLeaveGroup={() => setLeaveDialogOpen(true)}
              onDeleteConversation={() => handleDeleteConversationClick(activeConversation.id)}
              isTestChat={!!testSelectedConv}
              getPresenceStatus={getStatus}
            />
            <ChatMessageArea
              messages={activeMessages}
              isLoading={testSelectedConv ? false : isLoadingMessages}
              onDeleteMessage={handleDeleteActiveMessage}
              reactionGroups={testSelectedConv ? undefined : getReactionGroups}
              onToggleReaction={testSelectedConv ? undefined : toggleReaction}
            />
            <TypingIndicatorBar typingText={typingText} />
            <ChatInputArea
              onSend={handleSendMessage}
              onTyping={handleTyping}
              disabled={testSelectedConv ? false : isLoadingMessages}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium">Welcome to Current Chat</h3>
              <p className="text-sm mt-1">Select a conversation or search users with @</p>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CreateChatDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} type={createDialogType} onCreateConversation={handleCreateConversation} />
      <CreateChatDialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen} type="group" onCreateConversation={handleAddMember} />
      <ParticipantsDialog
        open={participantsDialogOpen}
        onOpenChange={setParticipantsDialogOpen}
        participants={participants}
        isAdmin={isAdmin}
        onRemoveParticipant={(userId) => { if (selectedConversation) removeParticipant(selectedConversation.id, userId); }}
      />
      <ProfileIdSetupDialog
        open={profileSetupOpen}
        onOpenChange={setProfileSetupOpen}
        onComplete={() => setProfileSetupOpen(false)}
      />

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This cannot be undone and all messages will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave Dialog */}
      <AlertDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Group</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to leave this group?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmLeave} className="bg-warning text-warning-foreground hover:bg-warning/90">Leave Group</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TeamsSettingsDialog open={teamsSettingsOpen} onOpenChange={setTeamsSettingsOpen} />
    </div>
  );
};

export default CurrentChatModule;
