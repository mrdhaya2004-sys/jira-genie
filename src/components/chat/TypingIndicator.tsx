import React from 'react';
import { Bot } from 'lucide-react';

const TypingIndicator: React.FC = () => {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
        <Bot className="h-4 w-4 text-accent-foreground" />
      </div>
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
