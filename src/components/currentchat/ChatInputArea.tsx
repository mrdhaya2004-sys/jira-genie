import React, { useState, useEffect, KeyboardEvent, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, Smile, Code, X, FileIcon, Reply, Pencil } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { ChatMessageData } from '@/types/chat';

const QUICK_EMOJIS = ['😀', '😂', '❤️', '👍', '👎', '🎉', '🔥', '✅', '❌', '🤔', '👀', '🚀', '💯', '🙏', '😍', '🥳'];

interface ChatInputAreaProps {
  onSend: (content: string) => void;
  onFileUpload?: (file: File) => void;
  onTyping?: () => void;
  disabled?: boolean;
  placeholder?: string;
  replyTo?: ChatMessageData | null;
  onCancelReply?: () => void;
  editing?: ChatMessageData | null;
  onCancelEdit?: () => void;
}

const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  onSend,
  onFileUpload,
  onTyping,
  disabled = false,
  placeholder = 'Type a message...',
  replyTo = null,
  onCancelReply,
  editing = null,
  onCancelEdit,
}) => {
  const [message, setMessage] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync editing content into the input
  useEffect(() => {
    if (editing) {
      setMessage(editing.content);
      textareaRef.current?.focus();
    }
  }, [editing?.id]);

  // Focus when starting a reply
  useEffect(() => {
    if (replyTo) textareaRef.current?.focus();
  }, [replyTo?.id]);

  const handleSend = () => {
    const content = message.trim();
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
    } else if (e.key === 'Escape') {
      if (editing && onCancelEdit) { onCancelEdit(); setMessage(''); }
      else if (replyTo && onCancelReply) { onCancelReply(); }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    onTyping?.();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAttachedFile(file);
  };

  const insertEmoji = (emoji: string) => {
    setMessage(prev => prev + emoji);
    setEmojiOpen(false);
  };

  const wrapInCodeBlock = () => {
    if (message.trim()) setMessage(prev => `\`\`\`\n${prev}\n\`\`\``);
    else setMessage('```\n\n```');
  };

  return (
    <div className="relative border-t border-white/10 bg-card/40 backdrop-blur-2xl">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

      {/* Editing banner */}
      {editing && (
        <div className="px-4 pt-3 pb-0 animate-fade-in">
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2 text-sm">
            <Pencil className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-amber-500">Editing message</div>
              <div className="truncate text-xs text-muted-foreground">{editing.content}</div>
            </div>
            <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={() => { onCancelEdit?.(); setMessage(''); }}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Reply banner */}
      {!editing && replyTo && (
        <div className="px-4 pt-3 pb-0 animate-fade-in">
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-xl px-3 py-2 text-sm">
            <Reply className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-primary">
                Replying to {replyTo.sender?.full_name || 'message'}
              </div>
              <div className="truncate text-xs text-muted-foreground">{replyTo.content}</div>
            </div>
            <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={onCancelReply}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Attached file preview */}
      {attachedFile && (
        <div className="px-4 pt-3 pb-0">
          <div className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/10 backdrop-blur-xl rounded-xl px-3 py-2 text-sm">
            <FileIcon className="h-4 w-4 text-muted-foreground" />
            <span className="truncate max-w-[200px]">{attachedFile.name}</span>
            <Button variant="ghost" size="icon-sm" className="h-5 w-5" onClick={() => setAttachedFile(null)}>
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
            disabled={disabled || !!editing}
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />

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
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={editing ? 'Edit your message...' : placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              'flex-1 min-h-[36px] max-h-32 resize-none py-2 px-2 bg-transparent border-0 shadow-none',
              'focus-visible:ring-0 focus-visible:ring-offset-0'
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
