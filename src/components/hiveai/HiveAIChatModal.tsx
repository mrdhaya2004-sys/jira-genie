import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, X, User, Minimize2, Code2, Copy, Check } from 'lucide-react';
import HiveAIAvatar from '@/components/ai/HiveAIAvatar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import CodePlayground from './CodePlayground';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import ScrollToBottomButton from '@/components/common/ScrollToBottomButton';
import { supabase } from '@/integrations/supabase/client';

type Message = { role: 'user' | 'assistant'; content: string };

const GREETING = "Hey there! 👋 I'm **Hive AI**, your smart assistant for the Test Zone platform.\n\nAsk me anything  general questions, technical help, grammar checks, translations, or platform guidance!";

interface HiveAIChatModalProps {
  open: boolean;
  onClose: () => void;
}

// Inline code block renderer with copy + playground button
const CodeBlock: React.FC<{
  code: string;
  language?: string;
  onOpenPlayground: (code: string, lang?: string) => void;
}> = ({ code, language, onOpenPlayground }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2 rounded-lg border border-border overflow-hidden bg-sidebar">
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b border-border">
        <span className="text-[10px] text-muted-foreground font-mono">{language || 'code'}</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy} title="Copy code">
            {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onOpenPlayground(code, language)}
            title="Open in Playground"
          >
            <Code2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <pre className="p-3 text-xs font-mono overflow-x-auto whitespace-pre text-sidebar-foreground">
        <code>{code}</code>
      </pre>
      <div className="px-3 py-1.5 border-t border-border bg-muted/30">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
          onClick={() => onOpenPlayground(code, language)}
        >
          <Code2 className="h-3 w-3" />
          Open in Playground
        </Button>
      </div>
    </div>
  );
};

const HiveAIChatModal: React.FC<HiveAIChatModalProps> = ({ open, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: GREETING },
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [playground, setPlayground] = useState<{ code: string; language?: string } | null>(null);
  const { containerRef: scrollRef, scrollToBottom, isAtBottom } = useAutoScroll<HTMLDivElement>({
    dependencies: [isStreaming],
    messageCount: messages.length,
  });
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  const openPlayground = useCallback((code: string, language?: string) => {
    setPlayground({ code, language });
  }, []);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isStreaming) return;

    const userMsg: Message = { role: 'user', content: text.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsStreaming(true);

    let assistantContent = '';

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to use Hive AI.');
        setIsStreaming(false);
        return;
      }
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hive-ai-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Request failed' }));
        if (resp.status === 429) toast.error('Rate limit exceeded. Please wait a moment.');
        else if (resp.status === 402) toast.error('AI credits exhausted. Please add credits.');
        else toast.error(err.error || 'Failed to get response');
        setIsStreaming(false);
        return;
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const upsertAssistant = (content: string) => {
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant' && prev.length === updatedMessages.length + 1) {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content } : m);
          }
          return [...prev, { role: 'assistant', content }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              upsertAssistant(assistantContent);
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error('Hive AI error:', e);
      toast.error('Failed to get AI response');
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed bottom-24 right-6 z-[9998] w-[380px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-8rem)]
          rounded-2xl border border-border bg-card shadow-2xl shadow-black/20
          flex flex-col overflow-hidden
          animate-in slide-in-from-bottom-4 fade-in-0 duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10">
          <div className="flex items-center gap-2.5">
            <HiveAIAvatar size={32} />
            <div>
              <h3 className="text-sm font-semibold text-foreground">Hive AI</h3>
              <p className="text-[10px] text-muted-foreground">Your Test Zone Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <Minimize2 className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="relative flex-1 min-h-0">
          <div ref={scrollRef} className="absolute inset-0 overflow-y-auto p-3 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={cn('flex gap-2.5', msg.role === 'user' && 'flex-row-reverse')}>
              {msg.role === 'assistant' ? (
                <HiveAIAvatar size={28} />
              ) : (
                <div className="flex-shrink-0 h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              )}
              <div className={cn(
                'max-w-[80%] px-3 py-2 rounded-2xl text-sm',
                msg.role === 'assistant'
                  ? 'bg-muted text-foreground rounded-bl-md'
                  : 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white rounded-br-md'
              )}>
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:mt-1 [&>ol]:mt-1 text-[13px] leading-relaxed">
                    <ReactMarkdown
                      components={{
                        code({ className, children, ...props }) {
                          const match = /language-(\w+)/.exec(className || '');
                          const codeStr = String(children).replace(/\n$/, '');
                          // If it's a fenced code block (has language class or multiline)
                          if (match || codeStr.includes('\n')) {
                            return (
                              <CodeBlock
                                code={codeStr}
                                language={match?.[1]}
                                onOpenPlayground={openPlayground}
                              />
                            );
                          }
                          // Inline code
                          return <code className="px-1 py-0.5 rounded bg-muted text-[12px] font-mono" {...props}>{children}</code>;
                        },
                        pre({ children }) {
                          // Unwrap pre to let code component handle rendering
                          return <>{children}</>;
                        },
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-[13px]">{msg.content}</p>
                )}
              </div>
            </div>
          ))}

          {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
            <div data-skip-anchor="true" className="flex gap-2.5">
              <HiveAIAvatar size={28} />
              <div className="bg-muted px-3 py-2 rounded-2xl rounded-bl-md">
                <div className="flex items-center gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
          </div>
          <ScrollToBottomButton visible={!isAtBottom} onClick={() => scrollToBottom('smooth')} />
        </div>

        {/* Input */}
        <div className="border-t border-border p-3">
          <div className="flex items-end gap-2">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Hive AI anything..."
              disabled={isStreaming}
              rows={1}
              className="flex-1 min-h-[40px] max-h-24 resize-none py-2.5 text-sm rounded-xl"
            />
            <Button
              size="icon"
              className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
              onClick={() => sendMessage(input)}
              disabled={isStreaming || !input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Code Playground */}
      {playground && (
        <CodePlayground
          initialCode={playground.code}
          initialLanguage={playground.language}
          onClose={() => setPlayground(null)}
        />
      )}
    </>
  );
};

export default HiveAIChatModal;
