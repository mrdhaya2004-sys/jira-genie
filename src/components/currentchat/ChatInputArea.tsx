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
    <div className="border-t border-border bg-card">
      {/* Attached file preview */}
      {attachedFile && (
        <div className="px-4 pt-3 pb-0">
          <div className="inline-flex items-center gap-2 bg-muted rounded-lg px-3 py-2 text-sm">
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

      <div className="p-4">
        <div className="flex items-end gap-2">
          {/* File attachment */}
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0 text-muted-foreground hover:text-foreground"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Code block */}
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0 text-muted-foreground hover:text-foreground"
            disabled={disabled}
            onClick={wrapInCodeBlock}
            title="Insert code block"
          >
            <Code className="h-5 w-5" />
          </Button>

          <Textarea
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              "flex-1 min-h-[44px] max-h-32 resize-none py-3",
              "focus-visible:ring-1 focus-visible:ring-offset-0"
            )}
          />

          {/* Emoji */}
          <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                disabled={disabled}
              >
                <Smile className="h-5 w-5" />
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
            size="icon"
            className="flex-shrink-0"
            onClick={handleSend}
            disabled={disabled || (!message.trim() && !attachedFile)}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInputArea;
