import React, { useState, KeyboardEvent, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, Smile, Code, X, FileIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const QUICK_EMOJIS = ['😀', '😂', '❤️', '👍', '👎', '🎉', '🔥', '✅', '❌', '🤔', '👀', '🚀', '💯', '🙏', '😍', '🥳'];

interface ChatInputAreaProps {
  onSend: (content: string) => void;
  onFileUpload?: (file: File) => void;
  onTyping?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  onSend,
  onFileUpload,
  onTyping,
  disabled = false,
  placeholder = "Type a message..."
}) => {
  const [message, setMessage] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [showCodeWrap, setShowCodeWrap] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    let content = message.trim();
    if (!content && !attachedFile) return;

    if (attachedFile && onFileUpload) {
      onFileUpload(attachedFile);
      setAttachedFile(null);
    }

    if (content) {
      onSend(content);
      setMessage('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    onTyping?.();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
    }
  };

  const insertEmoji = (emoji: string) => {
    setMessage(prev => prev + emoji);
    setEmojiOpen(false);
  };

  const wrapInCodeBlock = () => {
    if (message.trim()) {
      setMessage(prev => `\`\`\`\n${prev}\n\`\`\``);
    } else {
      setMessage('```\n\n```');
    }
    setShowCodeWrap(false);
  };

  return (
    <div className="relative border-t border-white/10 bg-card/40 backdrop-blur-2xl">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      {/* Attached file preview */}
      {attachedFile && (
        <div className="px-4 pt-3 pb-0">
          <div className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/10 backdrop-blur-xl rounded-xl px-3 py-2 text-sm">
            <FileIcon className="h-4 w-4 text-muted-foreground" />
            <span className="truncate max-w-[200px]">{attachedFile.name}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-5 w-5"
              onClick={() => setAttachedFile(null)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      <div className="p-3">
        <div className="flex items-end gap-1.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl p-1.5 shadow-[inset_0_1px_0_0_hsl(0_0%_100%_/_0.05)] focus-within:border-primary/40 focus-within:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)] transition-all">
          <Button
            variant="ghost"
            size="icon-sm"
            className="flex-shrink-0 text-muted-foreground hover:text-foreground hover:bg-white/10 rounded-lg h-9 w-9"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
          />

          <Button
            variant="ghost"
            size="icon-sm"
            className="flex-shrink-0 text-muted-foreground hover:text-foreground hover:bg-white/10 rounded-lg h-9 w-9"
            disabled={disabled}
            onClick={wrapInCodeBlock}
            title="Insert code block"
          >
            <Code className="h-4 w-4" />
          </Button>

          <Textarea
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              "flex-1 min-h-[36px] max-h-32 resize-none py-2 px-2 bg-transparent border-0 shadow-none",
              "focus-visible:ring-0 focus-visible:ring-offset-0"
            )}
          />

          <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="flex-shrink-0 text-muted-foreground hover:text-foreground hover:bg-white/10 rounded-lg h-9 w-9"
                disabled={disabled}
              >
                <Smile className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" side="top" align="end">
              <div className="grid grid-cols-8 gap-1">
                {QUICK_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => insertEmoji(emoji)}
                    className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted transition-colors text-lg"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Button
            size="icon-sm"
            className="flex-shrink-0 h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-cyan-500 hover:from-primary hover:to-cyan-400 text-primary-foreground shadow-[0_4px_16px_-4px_hsl(var(--primary)/0.6)] hover:shadow-[0_6px_20px_-4px_hsl(var(--primary)/0.8)] active:scale-95 transition-all disabled:opacity-40 disabled:shadow-none"
            onClick={handleSend}
            disabled={disabled || (!message.trim() && !attachedFile)}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInputArea;

