import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Play, Copy, Check, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CodePlaygroundProps {
  initialCode: string;
  initialLanguage?: string;
  onClose: () => void;
}

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'csharp', label: 'C#' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'sql', label: 'SQL' },
  { value: 'bash', label: 'Bash' },
  { value: 'json', label: 'JSON' },
];

const detectLanguage = (lang?: string): string => {
  if (!lang) return 'javascript';
  const lower = lang.toLowerCase();
  const match = LANGUAGES.find(l => l.value === lower || l.label.toLowerCase() === lower);
  if (match) return match.value;
  if (lower === 'js' || lower === 'jsx') return 'javascript';
  if (lower === 'ts' || lower === 'tsx') return 'typescript';
  if (lower === 'py') return 'python';
  if (lower === 'cs') return 'csharp';
  if (lower === 'sh' || lower === 'shell') return 'bash';
  return 'javascript';
};

// Simple simulated execution for JS
const simulateRun = (code: string, language: string): string => {
  if (language === 'javascript' || language === 'typescript') {
    try {
      const logs: string[] = [];
      const fakeConsole = {
        log: (...args: unknown[]) => logs.push(args.map(String).join(' ')),
        error: (...args: unknown[]) => logs.push(`[ERROR] ${args.map(String).join(' ')}`),
        warn: (...args: unknown[]) => logs.push(`[WARN] ${args.map(String).join(' ')}`),
      };
      // eslint-disable-next-line no-new-func
      const fn = new Function('console', code);
      fn(fakeConsole);
      return logs.length > 0 ? logs.join('\n') : '✅ Code executed successfully (no output)';
    } catch (err) {
      return `❌ Error: ${err instanceof Error ? err.message : String(err)}`;
    }
  }
  return `⚠️ Simulated execution is only available for JavaScript/TypeScript.\n\nFor ${language}, please use a local IDE or online compiler.`;
};

const CodePlayground: React.FC<CodePlaygroundProps> = ({ initialCode, initialLanguage, onClose }) => {
  const [code, setCode] = useState(initialCode);
  const [language, setLanguage] = useState(detectLanguage(initialLanguage));
  const [output, setOutput] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Code copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const handleRun = useCallback(() => {
    setOutput(simulateRun(code, language));
  }, [code, language]);

  return (
    <div className={cn(
      "fixed z-[10000] bg-card border border-border rounded-2xl shadow-2xl shadow-black/30 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in-0 duration-300",
      isExpanded
        ? "inset-4"
        : "bottom-24 right-6 w-[460px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-8rem)]"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/50">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-warning/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-success/60" />
          </div>
          <span className="text-xs font-medium text-muted-foreground ml-1">Code Playground</span>
        </div>
        <div className="flex items-center gap-1">
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="h-7 w-[130px] text-xs border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map(l => (
                <SelectItem key={l.value} value={l.value} className="text-xs">{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 relative">
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            className="absolute inset-0 w-full h-full p-4 bg-sidebar text-sidebar-foreground font-mono text-xs leading-relaxed resize-none border-0 focus:outline-none focus:ring-0 tab-size-2"
            style={{ tabSize: 2 }}
          />
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-7 gap-1.5 text-xs bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
              onClick={handleRun}
            >
              <Play className="h-3 w-3" />
              Run
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={handleCopy}
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <span className="text-[10px] text-muted-foreground">
            {language === 'javascript' || language === 'typescript' ? 'Sandbox execution' : 'Simulated only'}
          </span>
        </div>

        {/* Output console */}
        {output !== null && (
          <div className="border-t border-border">
            <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Output</span>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setOutput(null)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
            <ScrollArea className="max-h-[150px]">
              <pre className="p-3 text-xs font-mono text-foreground whitespace-pre-wrap bg-sidebar">
                {output}
              </pre>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
};

export default CodePlayground;
