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
  dark?: boolean;
}

const levelColorDark: Record<LogLevel, string> = {
  info: 'text-slate-300',
  warn: 'text-amber-300',
  error: 'text-rose-400',
  success: 'text-emerald-400',
  debug: 'text-sky-300',
};

const levelColorLight: Record<LogLevel, string> = {
  info: 'text-slate-600',
  warn: 'text-amber-600',
  error: 'text-rose-600',
  success: 'text-emerald-600',
  debug: 'text-[#2563EB]',
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

const StudioConsole: React.FC<Props> = ({ lines, onClear, onTerminal, dark = false }) => {
  const [tab, setTab] = useState<LogTab>('execution');
  const [cmd, setCmd] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = lines.filter(l => l.tab === tab || (tab === 'errors' && l.level === 'error'));

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [filtered.length, tab]);

  const levelColor = dark ? levelColorDark : levelColorLight;
  const rootBg = dark ? 'bg-[#0b1120] border-white/10' : 'bg-white/85 backdrop-blur-xl border-slate-200/70';
  const barBorder = dark ? 'border-white/10' : 'border-slate-200/70';
  const timeCls = dark ? 'text-muted-foreground/50' : 'text-slate-400';
  const moduleCls = dark ? 'text-muted-foreground/70' : 'text-slate-500';
  const bodyText = dark ? 'text-slate-200' : 'text-slate-700';
  const activeTab = dark
    ? 'data-[state=active]:bg-white/5 data-[state=active]:text-foreground'
    : 'data-[state=active]:bg-blue-50/70 data-[state=active]:text-[#1D4ED8]';
  const termBar = dark ? 'bg-black/30 border-white/10' : 'bg-slate-50/70 border-slate-200/70';
  const inputCls = dark ? 'bg-transparent border-white/10' : 'bg-white border-slate-200';

  return (
    <div className={cn('flex flex-col h-full border-t', rootBg)}>
      <Tabs value={tab} onValueChange={(v) => setTab(v as LogTab)} className="flex flex-col h-full">
        <div className={cn('flex items-center justify-between border-b px-2', barBorder)}>
          <TabsList className="bg-transparent h-9 gap-0">
            {TABS.map(t => {
              const count = lines.filter(l => l.tab === t.id || (t.id === 'errors' && l.level === 'error')).length;
              return (
                <TabsTrigger
                  key={t.id}
                  value={t.id}
                  className={cn(
                    'h-9 px-3 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-[#2563EB]',
                    activeTab
                  )}
                >
                  {t.label}
                  {count > 0 && <span className={cn('ml-1.5 text-[10px]', dark ? 'text-muted-foreground' : 'text-slate-400')}>({count})</span>}
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
            <div ref={t.id === tab ? scrollRef : undefined} className={cn('h-full overflow-y-auto font-mono text-[12px] leading-relaxed px-3 py-2', bodyText)}>
              {filtered.length === 0 ? (
                <div className={cn('italic', dark ? 'text-muted-foreground/60' : 'text-slate-400')}>No output yet — run a task to see live logs.</div>
              ) : filtered.map(l => (
                <div key={l.id} className="flex gap-3 py-0.5">
                  <span className={cn('shrink-0', timeCls)}>{l.time}</span>
                  <span className={cn('shrink-0 w-16 truncate', moduleCls)}>{l.module}</span>
                  <span className={cn('shrink-0 w-14 uppercase text-[10px] font-bold', levelColor[l.level])}>{l.level}</span>
                  <span className="flex-1 whitespace-pre-wrap">{l.text}</span>
                  {l.durationMs != null && <span className={cn('shrink-0', timeCls)}>{l.durationMs}ms</span>}
                </div>
              ))}
            </div>
            {t.id === 'terminal' && (
              <form
                onSubmit={(e) => { e.preventDefault(); if (cmd.trim()) { onTerminal(cmd.trim()); setCmd(''); } }}
                className={cn('flex items-center gap-2 border-t px-3 py-2', termBar)}
              >
                <span className={cn('font-mono text-xs', dark ? 'text-emerald-400' : 'text-emerald-600')}>testzone $</span>
                <Input
                  value={cmd}
                  onChange={(e) => setCmd(e.target.value)}
                  placeholder='Try "run login regression" or "mvn test -Dgroups=smoke"'
                  className={cn('h-8 font-mono text-xs', inputCls)}
                />
                <Button type="submit" size="sm" className="h-8 bg-gradient-to-r from-[#2563EB] to-[#06B6D4] text-white"><Send className="h-3.5 w-3.5" /></Button>
              </form>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default StudioConsole;
