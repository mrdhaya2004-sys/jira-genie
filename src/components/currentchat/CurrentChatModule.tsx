import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare, Sparkles, Users, AtSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useChat } from '@/hooks/useChat';
import { usePresence } from '@/hooks/usePresence';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useReactions } from '@/hooks/useReactions';
import { useProfileId } from '@/hooks/useProfileId';
import { useHiveMindChat } from '@/hooks/useHiveMindChat';
import { useAuth } from '@/contexts/AuthContext';
import { ChatMessageData, CreateConversationData } from '@/types/chat';
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
    sendMessage, deleteMessage, editMessage, togglePinConversation, toggleFavoriteConversation,
    addParticipant, removeParticipant,
    deleteConversation, leaveConversation, setSelectedConversation,
  } = useChat();

  const { getStatus, fetchPresence } = usePresence();
  const { profileId } = useProfileId();
  const { isHiveMindMention, extractHiveMindQuery, sendToHiveMind } = useHiveMindChat();

  const activeConversation = selectedConversation;

  const { typingText, handleTyping } = useTypingIndicator(activeConversation?.id || null);
  const { fetchReactions, toggleReaction, getReactionGroups } = useReactions(activeConversation?.id || null);

  // Reply / edit state
  const [replyTo, setReplyTo] = useState<ChatMessageData | null>(null);
  const [editing, setEditing] = useState<ChatMessageData | null>(null);

  // Clear reply/edit state when switching conversation
  useEffect(() => {
    setReplyTo(null);
    setEditing(null);
  }, [activeConversation?.id]);

  useEffect(() => {
    if (messages.length > 0) fetchReactions(messages.map(m => m.id));
  }, [messages, fetchReactions]);

  useEffect(() => {
    if (participants.length > 0) fetchPresence(participants.map(p => p.user_id));
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

  useEffect(() => {
    if (user && profileId === null && !profileSetupOpen) {
      const t = setTimeout(() => setProfileSetupOpen(true), 2000);
      return () => clearTimeout(t);
    }
  }, [user, profileId, profileSetupOpen]);

  const handleNewChat = () => { setCreateDialogType('direct'); setCreateDialogOpen(true); };
  const handleNewGroup = () => { setCreateDialogType('group'); setCreateDialogOpen(true); };

  const handleCreateConversation = async (data: CreateConversationData) => {
    const conv = await createConversation(data);
    if (conv) selectConversation(conv);
  };

  const handleSendMessage = async (content: string) => {
    if (!activeConversation) return;

    if (editing) {
      await editMessage(editing.id, content);
      setEditing(null);
      return;
    }

    await sendMessage({
      conversation_id: activeConversation.id,
      content,
      reply_to_id: replyTo?.id || null,
    });
    setReplyTo(null);

    if (isHiveMindMention(content)) {
      const query = extractHiveMindQuery(content);
      if (query) sendToHiveMind(query, activeConversation.id);
    }
  };

  const handleStartChatFromSearch = async (userId: string, userName: string) => {
    const existing = conversations.find(c =>
      c.type === 'direct' && c.participants?.some(p => p.user_id === userId)
    );
    if (existing) {
      selectConversation(existing);
      setUserSearchOpen(false);
      return;
    }
    const conv = await createConversation({
      type: 'direct',
      participant_ids: [userId],
      name: userName,
    });
    if (conv) selectConversation(conv);
    setUserSearchOpen(false);
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

  // Resizable panel persistence
  const STORAGE_KEY = 'tz_chat_sidebar_size';
  const initialSidebarSize = useMemo(() => {
    try {
      const v = parseFloat(localStorage.getItem(STORAGE_KEY) || '');
      if (!isNaN(v) && v >= 18 && v <= 50) return v;
    } catch {}
    return 28;
  }, []);

  const resizeSaveRef = useRef<number | null>(null);
  const handlePanelResize = useCallback((sizes: number[]) => {
    if (resizeSaveRef.current) window.clearTimeout(resizeSaveRef.current);
    resizeSaveRef.current = window.setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, String(sizes[0])); } catch {}
    }, 160);
  }, []);

  useEffect(() => () => {
    if (resizeSaveRef.current) window.clearTimeout(resizeSaveRef.current);
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-background">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 w-[480px] h-[480px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/3 -right-24 w-[420px] h-[420px] rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 w-[420px] h-[420px] rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <ResizablePanelGroup
        direction="horizontal"
        onLayout={handlePanelResize}
        className="relative h-full w-full"
      >
        <ResizablePanel
          defaultSize={initialSidebarSize}
          minSize={20}
          maxSize={50}
          className="relative h-full min-w-0"
        >
          <ChatSidebar
            conversations={conversations}
            selectedConversation={activeConversation}
            onSelectConversation={selectConversation}
            onNewChat={handleNewChat}
            onNewGroup={handleNewGroup}
            onDeleteConversation={handleDeleteConversationClick}
            onTogglePin={togglePinConversation}
            onToggleFavorite={toggleFavoriteConversation}
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
        </ResizablePanel>

        <ResizableHandle
          withHandle
          className="w-px bg-white/10 hover:bg-primary/40 transition-colors data-[resize-handle-state=drag]:bg-primary/60"
        />

        <ResizablePanel defaultSize={100 - initialSidebarSize} minSize={40}>
          <div className="flex flex-col h-full min-w-0 bg-transparent">
            {activeConversation ? (
              <>
                <ChatHeader
                  conversation={activeConversation}
                  participants={participants}
                  onAddParticipant={() => setAddMemberDialogOpen(true)}
                  onViewParticipants={() => setParticipantsDialogOpen(true)}
                  onLeaveGroup={() => setLeaveDialogOpen(true)}
                  onDeleteConversation={() => handleDeleteConversationClick(activeConversation.id)}
                  getPresenceStatus={getStatus}
                />
                <ChatMessageArea
                  messages={messages}
                  isLoading={isLoadingMessages}
                  participants={participants}
                  onDeleteMessage={deleteMessage}
                  onReplyToMessage={setReplyTo}
                  onEditMessage={setEditing}
                  reactionGroups={getReactionGroups}
                  onToggleReaction={toggleReaction}
                />
                <TypingIndicatorBar typingText={typingText} />
                <ChatInputArea
                  onSend={handleSendMessage}
                  onTyping={handleTyping}
                  disabled={isLoadingMessages}
                  replyTo={replyTo}
                  onCancelReply={() => setReplyTo(null)}
                  editing={editing}
                  onCancelEdit={() => setEditing(null)}
                />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground p-8">
                <div className="text-center max-w-md animate-fade-in">
                  <div className="relative mx-auto mb-6 w-20 h-20">
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/30 to-cyan-400/20 blur-2xl" />
                    <div className="relative h-20 w-20 rounded-3xl bg-card/40 backdrop-blur-2xl border border-white/15 flex items-center justify-center shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.35)]">
                      <MessageSquare className="h-9 w-9 text-primary" />
                      <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-cyan-400 animate-pulse" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">
                    {conversations.length === 0 ? 'Start a new conversation' : 'Select a conversation'}
                  </h3>
                  <p className="text-sm mt-2 text-muted-foreground">
                    {conversations.length === 0
                      ? 'Find a teammate or create a group to begin messaging.'
                      : 'Pick a chat from the list to view messages.'}
                  </p>
                  <div className="mt-6 flex items-center justify-center gap-2">
                    <Button onClick={() => setUserSearchOpen(true)} className="gap-2">
                      <AtSign className="h-4 w-4" /> Search Users
                    </Button>
                    <Button variant="outline" onClick={handleNewGroup} className="gap-2">
                      <Users className="h-4 w-4" /> Create Group
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

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
