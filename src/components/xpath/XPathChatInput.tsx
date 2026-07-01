import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Send, Paperclip, X, ImageIcon, FileCode2, ClipboardPaste } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { XPathChatExtras } from '@/types/xpath';

interface XPathChatInputProps {
  onSend: (message: string, extras?: XPathChatExtras) => void;
  disabled?: boolean;
  placeholder?: string;
  initialValue?: string;
}

const MAX_SCREENSHOTS = 4;
const MAX_SOURCE_BYTES = 4_000_000;
const IMAGE_MAX_DIM = 1280;
const TEXT_EXTS = ['.html', '.htm', '.xml', '.txt', '.json'];

async function fileToDataUrl(file: File, maxDim = IMAGE_MAX_DIM): Promise<string> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas');
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    return canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.82);
  } catch {
    return await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result || ''));
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }
}

const XPathChatInput: React.FC<XPathChatInputProps> = ({
  onSend,
  disabled = false,
  placeholder = 'Describe the element you need XPaths for…',
  initialValue,
}) => {
  const [input, setInput] = useState(initialValue || '');
  const [pastedDom, setPastedDom] = useState('');
  const [sourceFiles, setSourceFiles] = useState<{ name: string; text: string }[]>([]);
  const [screenshots, setScreenshots] = useState<{ name: string; dataUrl: string }[]>([]);
  const [attachOpen, setAttachOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sourceInputRef = useRef<HTMLInputElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (initialValue) {
      setInput(initialValue);
      textareaRef.current?.focus();
    }
  }, [initialValue]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const attachCount = (pastedDom.trim() ? 1 : 0) + sourceFiles.length + screenshots.length;
  const hasAnything = input.trim().length > 0 || attachCount > 0;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!hasAnything || disabled) return;
    const extras: XPathChatExtras = {};
    if (pastedDom.trim()) extras.pastedDom = pastedDom.trim();
    if (sourceFiles.length > 0) {
      extras.sourceFilesText = sourceFiles
        .map((f) => `<!-- ${f.name} -->\n${f.text}`)
        .join('\n\n');
      extras.sourceFileNames = sourceFiles.map((f) => f.name);
    }
    if (screenshots.length > 0) extras.screenshots = screenshots;
    onSend(input.trim() || 'Analyze the attached UI and generate locators.', Object.keys(extras).length ? extras : undefined);
    setInput('');
    setPastedDom('');
    setSourceFiles([]);
    setScreenshots([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSourceFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    let total = sourceFiles.reduce((n, f) => n + f.text.length, 0);
    const next = [...sourceFiles];
    for (const f of Array.from(files)) {
      const lower = f.name.toLowerCase();
      if (!TEXT_EXTS.some((e) => lower.endsWith(e))) {
        toast({ title: 'Unsupported file', description: `${f.name} — upload .html, .xml, .txt or .json`, variant: 'destructive' });
        continue;
      }
      const text = await f.text();
      if (total + text.length > MAX_SOURCE_BYTES) {
        toast({ title: 'Source too large', description: 'Combined source files exceed 4MB.', variant: 'destructive' });
        break;
      }
      total += text.length;
      next.push({ name: f.name, text });
    }
    setSourceFiles(next);
  };

  const handleScreenshots = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const next = [...screenshots];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith('image/')) continue;
      if (next.length >= MAX_SCREENSHOTS) {
        toast({ title: 'Max screenshots', description: `Only ${MAX_SCREENSHOTS} images allowed.`, variant: 'destructive' });
        break;
      }
      const dataUrl = await fileToDataUrl(f);
      next.push({ name: f.name, dataUrl });
    }
    setScreenshots(next);
  };

  return (
    <form onSubmit={handleSubmit} className="relative border-t border-border/60 backdrop-blur-xl bg-card/70 p-4">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      {/* Attachment chips */}
      {attachCount > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {pastedDom.trim() && (
            <Chip icon={<ClipboardPaste className="h-3 w-3" />} label={`Pasted DOM · ${pastedDom.length.toLocaleString()} chars`} onRemove={() => setPastedDom('')} />
          )}
          {sourceFiles.map((f, i) => (
            <Chip key={`s-${i}`} icon={<FileCode2 className="h-3 w-3" />} label={f.name} onRemove={() => setSourceFiles((prev) => prev.filter((_, j) => j !== i))} />
          ))}
          {screenshots.map((s, i) => (
            <Chip key={`i-${i}`} icon={<ImageIcon className="h-3 w-3" />} label={s.name} onRemove={() => setScreenshots((prev) => prev.filter((_, j) => j !== i))} />
          ))}
        </div>
      )}

      <div className="flex gap-2 items-end">
        {/* Attach popover */}
        <Popover open={attachOpen} onOpenChange={setAttachOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              disabled={disabled}
              className="relative h-11 w-11 flex-shrink-0 rounded-xl border border-border/60 bg-background/60 backdrop-blur-sm hover:border-primary/40"
              aria-label="Attach DOM, source or screenshots"
            >
              <Paperclip className="h-4 w-4" />
              {attachCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                  {attachCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-[420px] max-w-[calc(100vw-2rem)] p-3 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Paste HTML / DOM / App Source</label>
                {pastedDom && <button type="button" className="text-[10px] text-muted-foreground hover:text-foreground" onClick={() => setPastedDom('')}>Clear</button>}
              </div>
              <Textarea
                value={pastedDom}
                onChange={(e) => setPastedDom(e.target.value)}
                placeholder='<html>…</html> or Appium page source (<hierarchy>…)'
                className="min-h-[120px] max-h-[220px] text-xs font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button type="button" size="sm" variant="outline" className="justify-start gap-2" onClick={() => sourceInputRef.current?.click()}>
                <FileCode2 className="h-3.5 w-3.5" /> Upload source
              </Button>
              <Button type="button" size="sm" variant="outline" className="justify-start gap-2" onClick={() => imgInputRef.current?.click()}>
                <ImageIcon className="h-3.5 w-3.5" /> Upload screenshots
              </Button>
              <input ref={sourceInputRef} type="file" multiple accept=".html,.htm,.xml,.txt,.json,text/html,text/xml,application/xml,application/json,text/plain" hidden onChange={(e) => { handleSourceFiles(e.target.files); e.target.value = ''; }} />
              <input ref={imgInputRef} type="file" multiple accept="image/*" hidden onChange={(e) => { handleScreenshots(e.target.files); e.target.value = ''; }} />
            </div>

            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Paste any DOM/HTML/XML, upload up to 4 screenshots and describe the element you need — the pipeline will emit
              absolute, relative, dynamic, CSS, and platform-specific locators.
            </p>
          </PopoverContent>
        </Popover>

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
          disabled={disabled || !hasAnything}
          className="relative h-11 w-11 flex-shrink-0 bg-gradient-to-br from-primary via-primary to-primary/80 hover:shadow-[0_0_20px_-2px_hsl(var(--primary)/0.6)] transition-all duration-300 overflow-hidden group"
        >
          <span className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 -translate-x-full group-hover:translate-x-full transition-all duration-700" />
          <Send className="h-4 w-4 relative z-10" />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
        <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-muted border border-border/60 font-mono">Enter</kbd>
        send ·
        <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-muted border border-border/60 font-mono">Shift+Enter</kbd>
        new line ·
        <span className="opacity-70">Attach DOM, source files, or screenshots via the paperclip.</span>
      </p>
    </form>
  );
};

const Chip: React.FC<{ icon: React.ReactNode; label: string; onRemove: () => void }> = ({ icon, label, onRemove }) => (
  <span className="inline-flex items-center gap-1.5 h-6 pl-2 pr-1 rounded-full bg-primary/10 border border-primary/30 text-[11px] text-foreground/80 max-w-[220px]">
    <span className="text-primary">{icon}</span>
    <span className="truncate">{label}</span>
    <button type="button" onClick={onRemove} className="h-4 w-4 rounded-full hover:bg-primary/20 inline-flex items-center justify-center" aria-label={`Remove ${label}`}>
      <X className="h-3 w-3" />
    </button>
  </span>
);

export default XPathChatInput;
