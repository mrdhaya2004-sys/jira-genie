import React, { useEffect, useRef, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, ChevronDown, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

export type LogLevel = 'info' | 'warn' | 'error' | 'success' | 'debug';
export type LogTab = 'build' | 'execution' | 'maven' | 'gradle' | 'terminal' | 'ai' | 'debug' | 'errors';

export interface ConsoleLine {
  id: string;
  tab: LogTab;
  level: LogLevel;
  module: string;
  time: string;
  durationMs?: number;
  text: string;
}

interface Props {
  lines: ConsoleLine[];
  onClear: (tab: LogTab) => void;
  onTerminal: (cmd: string) => void;
}

const levelColor: Record<LogLevel, string> = {
  info: 'text-slate-300',
  warn: 'text-amber-300',
  error: 'text-rose-400',
  success: 'text-emerald-400',
  debug: 'text-sky-300',
};

const TABS: { id: LogTab; label: string }[] = [
  { id: 'build', label: 'Build' },
  { id: 'execution', label: 'Execution' },
  { id: 'maven', label: 'Maven' },
  { id: 'gradle', label: 'Gradle' },
  { id: 'terminal', label: 'Terminal' },
  { id: 'ai', label: 'AI Logs' },
  { id: 'debug', label: 'Debug' },
  { id: 'errors', label: 'Errors' },
];

const StudioConsole: React.FC<Props> = ({ lines, onClear, onTerminal }) => {
  const [tab, setTab] = useState<LogTab>('execution');
  const [cmd, setCmd] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = lines.filter(l => l.tab === tab || (tab === 'errors' && l.level === 'error'));

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [filtered.length, tab]);

  return (
    <div className="flex flex-col h-full bg-[#0b1120] border-t border-white/10">
      <Tabs value={tab} onValueChange={(v) => setTab(v as LogTab)} className="flex flex-col h-full">
        <div className="flex items-center justify-between border-b border-white/10 px-2">
          <TabsList className="bg-transparent h-9 gap-0">
            {TABS.map(t => {
              const count = lines.filter(l => l.tab === t.id || (t.id === 'errors' && l.level === 'error')).length;
              return (
                <TabsTrigger
                  key={t.id}
                  value={t.id}
                  className="h-9 px-3 text-xs data-[state=active]:bg-white/5 data-[state=active]:text-foreground rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                >
                  {t.label}
                  {count > 0 && <span className="ml-1.5 text-[10px] text-muted-foreground">({count})</span>}
                </TabsTrigger>
              );
            })}
          </TabsList>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={() => onClear(tab)} className="h-7 text-xs">
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs">
              <ChevronDown className="h-3.5 w-3.5 mr-1" /> Scroll to end
            </Button>
          </div>
        </div>

        {TABS.map(t => (
          <TabsContent key={t.id} value={t.id} className="flex-1 min-h-0 m-0 p-0">
            <div ref={t.id === tab ? scrollRef : undefined} className="h-full overflow-y-auto font-mono text-[12px] leading-relaxed px-3 py-2">
              {filtered.length === 0 ? (
                <div className="text-muted-foreground/60 italic">No output yet — run a task to see live logs.</div>
              ) : filtered.map(l => (
                <div key={l.id} className="flex gap-3 py-0.5">
                  <span className="text-muted-foreground/50 shrink-0">{l.time}</span>
                  <span className="text-muted-foreground/70 shrink-0 w-16 truncate">{l.module}</span>
                  <span className={cn('shrink-0 w-14 uppercase text-[10px] font-bold', levelColor[l.level])}>{l.level}</span>
                  <span className="flex-1 whitespace-pre-wrap">{l.text}</span>
                  {l.durationMs != null && <span className="text-muted-foreground/50 shrink-0">{l.durationMs}ms</span>}
                </div>
              ))}
            </div>
            {t.id === 'terminal' && (
              <form
                onSubmit={(e) => { e.preventDefault(); if (cmd.trim()) { onTerminal(cmd.trim()); setCmd(''); } }}
                className="flex items-center gap-2 border-t border-white/10 px-3 py-2 bg-black/30"
              >
                <span className="text-emerald-400 font-mono text-xs">testzone $</span>
                <Input
                  value={cmd}
                  onChange={(e) => setCmd(e.target.value)}
                  placeholder='Try "run login regression" or "mvn test -Dgroups=smoke"'
                  className="h-8 bg-transparent border-white/10 font-mono text-xs"
                />
                <Button type="submit" size="sm" className="h-8"><Send className="h-3.5 w-3.5" /></Button>
              </form>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default StudioConsole;
