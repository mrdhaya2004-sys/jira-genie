import React, { useState, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, Smile } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputAreaProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  onSend,
  disabled = false,
  placeholder = "Type a message..."
}) => {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim()) {
      onSend(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-border bg-card p-4">
      <div className="flex items-end gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="flex-shrink-0 text-muted-foreground hover:text-foreground"
          disabled={disabled}
        >
          <Paperclip className="h-5 w-5" />
        </Button>

        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            "flex-1 min-h-[44px] max-h-32 resize-none py-3",
            "focus-visible:ring-1 focus-visible:ring-offset-0"
          )}
        />

        <Button
          variant="ghost"
          size="icon"
          className="flex-shrink-0 text-muted-foreground hover:text-foreground"
          disabled={disabled}
        >
          <Smile className="h-5 w-5" />
        </Button>

        <Button
          size="icon"
          className="flex-shrink-0"
          onClick={handleSend}
          disabled={disabled || !message.trim()}
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default ChatInputArea;
