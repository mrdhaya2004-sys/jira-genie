import React from 'react';
import { ReactionGroup } from '@/hooks/useReactions';
import { cn } from '@/lib/utils';

interface MessageReactionsProps {
  reactions: ReactionGroup[];
  onToggle: (emoji: string) => void;
}

const MessageReactions: React.FC<MessageReactionsProps> = ({ reactions, onToggle }) => {
  if (reactions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1 mx-1">
      {reactions.map(({ emoji, count, hasReacted }) => (
        <button
          key={emoji}
          onClick={() => onToggle(emoji)}
          className={cn(
            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-colors",
            hasReacted
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
          )}
        >
          <span>{emoji}</span>
          <span className="font-medium">{count}</span>
        </button>
      ))}
    </div>
  );
};

export default MessageReactions;
