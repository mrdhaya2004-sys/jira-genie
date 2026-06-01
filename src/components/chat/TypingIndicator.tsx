import React from 'react';
import HiveAIAvatar from '@/components/ai/HiveAIAvatar';

const TypingIndicator: React.FC = () => {
  return (
    <div data-skip-anchor="true" className="flex gap-3 animate-fade-in">
      <HiveAIAvatar size={32} />
      <div className="bg-chat-bot-bg text-chat-bot-fg px-4 py-3 rounded-2xl rounded-bl-md">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-muted-foreground/60 typing-dot" />
          <div className="h-2 w-2 rounded-full bg-muted-foreground/60 typing-dot" />
          <div className="h-2 w-2 rounded-full bg-muted-foreground/60 typing-dot" />
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
