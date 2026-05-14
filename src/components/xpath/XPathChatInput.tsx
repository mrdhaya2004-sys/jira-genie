import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';

interface XPathChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  initialValue?: string;
}

const XPathChatInput: React.FC<XPathChatInputProps> = ({
  onSend,
  disabled = false,
  placeholder = "Describe the element you need XPaths for...",
  initialValue,
}) => {
  const [input, setInput] = useState(initialValue || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update input when initialValue changes (resume feature)
  useEffect(() => {
    if (initialValue) {
      setInput(initialValue);
      textareaRef.current?.focus();
    }
  }, [initialValue]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  return (
    <form onSubmit={handleSubmit} className="relative border-t border-border/60 backdrop-blur-xl bg-card/70 p-4">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="flex gap-2 items-end">
        <div className="flex-1 relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 via-primary/10 to-primary/30 rounded-lg opacity-0 group-focus-within:opacity-100 blur transition duration-300" />
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="relative min-h-[44px] max-h-[120px] resize-none bg-background/80 backdrop-blur-sm border-border/60 focus-visible:ring-primary/40"
            rows={1}
          />
        </div>
        <Button
          type="submit"
          size="icon"
          disabled={disabled || !input.trim()}
          className="relative h-11 w-11 flex-shrink-0 bg-gradient-to-br from-primary via-primary to-primary/80 hover:shadow-[0_0_20px_-2px_hsl(var(--primary)/0.6)] transition-all duration-300 overflow-hidden group"
        >
          <span className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 -translate-x-full group-hover:translate-x-full transition-all duration-700" />
          <Send className="h-4 w-4 relative z-10" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
        <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-muted border border-border/60 font-mono">Enter</kbd>
        to send,
        <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-muted border border-border/60 font-mono">Shift+Enter</kbd>
        for new line
      </p>
    </form>
  );
};

export default XPathChatInput;
