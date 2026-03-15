import React from 'react';

interface TypingIndicatorBarProps {
  typingText: string | null;
}

const TypingIndicatorBar: React.FC<TypingIndicatorBarProps> = ({ typingText }) => {
  if (!typingText) return null;

  return (
    <div className="px-4 py-1.5 border-t border-border bg-muted/30">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-primary typing-dot" />
          <div className="h-1.5 w-1.5 rounded-full bg-primary typing-dot" />
          <div className="h-1.5 w-1.5 rounded-full bg-primary typing-dot" />
        </div>
        <span className="italic">{typingText}</span>
      </div>
    </div>
  );
};

export default TypingIndicatorBar;
