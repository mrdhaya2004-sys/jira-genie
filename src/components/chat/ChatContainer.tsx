import React, { useEffect, useRef } from 'react';
import { useChat } from '@/contexts/ChatContext';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import DynamicInputForm from './DynamicInputForm';

const ChatContainer: React.FC = () => {
  const { messages, isTyping, handleUserInput, handleOptionSelect, handleDynamicInputSubmit, startNewTicket, handleEditTicket, currentPhase, dynamicInputs } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!hasStarted.current) {
      hasStarted.current = true;
      startNewTicket();
    }
  }, [startNewTicket]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleConfirm = () => {
    handleUserInput('confirm');
  };

  const handleCancel = () => {
    handleUserInput('cancel');
  };

  const handleEdit = () => {
    handleEditTicket();
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 scrollbar-thin"
      >
        <div className="max-w-3xl mx-auto space-y-4 pb-4">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              onOptionSelect={handleOptionSelect}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
              onEdit={handleEdit}
            />
          ))}
          {isTyping && <TypingIndicator />}
          
          {/* Dynamic Input Form */}
          {currentPhase === 'dynamic_questions' && dynamicInputs.length > 0 && (
            <DynamicInputForm 
              inputs={dynamicInputs}
              onSubmit={handleDynamicInputSubmit}
            />
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="max-w-3xl mx-auto w-full">
        <ChatInput
          onSend={handleUserInput}
          disabled={isTyping || currentPhase === 'dynamic_questions'}
          placeholder="Type your response..."
        />
      </div>
    </div>
  );
};

export default ChatContainer;
