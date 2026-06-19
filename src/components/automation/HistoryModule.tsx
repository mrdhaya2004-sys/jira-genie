import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  History,
  Trash2,
  RotateCcw,
  Search,
  Download,
  CalendarDays,
  LayoutGrid,
  Sparkles,
  TrendingUp,
  Clock,
  Trophy,
  Activity,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHistoryLogs, HistoryLog } from '@/hooks/useHistoryLogs';
import { sessionHistoryService } from '@/lib/sessionHistory';
import HistoryLogEntry from './HistoryLogEntry';
import HistoryViewDialog from './HistoryViewDialog';
import SessionHistoryBar from './SessionHistoryBar';

const MODULE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'test-case-generator', label: 'Test Cases' },
  { value: 'logic-scenario-creator', label: 'Scenarios' },
  { value: 'xpath-generator', label: 'XPath' },
  { value: 'jira-ticket-raiser', label: 'Jira' },
  { value: 'agentic-ai', label: 'Agentic AI' },
];

type TimeRange = 'today' | 'week' | 'month' | 'year' | 'lifetime';
const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
  { value: 'lifetime', label: 'Lifetime' },
];

interface HistoryModuleProps {
  onResumeAction?: (module: string, prompt: string, historyLogId?: string) => void;
}

const startOf = (range: TimeRange): Date => {
  const d = new Date();
  if (range === 'today') { d.setHours(0, 0, 0, 0); return d; }
  if (range === 'week') {
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (range === 'month') return new Date(d.getFullYear(), d.getMonth(), 1);
  if (range === 'year') return new Date(d.getFullYear(), 0, 1);
  return new Date(0);
};

const HistoryModule: React.FC<HistoryModuleProps> = ({ onResumeAction }) => {
  const {
    logs,
    isLoading,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    filterModule,
    setFilterModule,
    fetchLogs,
    deleteLog,
    clearAllLogs,
    exportAsCSV,
  } = useHistoryLogs();

  const [viewingLog, setViewingLog] = useState<HistoryLog | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('lifetime');

  /* Time-range filtered logs */
  const filteredLogs = useMemo(() => {
    if (timeRange === 'lifetime') return logs;
    const cutoff = startOf(timeRange).getTime();
    return logs.filter(l => new Date(l.created_at).getTime() >= cutoff);
  }, [logs, timeRange]);

  /* Grouping */
  const grouped = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yest = new Date(today); yest.setDate(yest.getDate() - 1);
    const groups: Record<string, HistoryLog[]> = {};

    filteredLogs.forEach(log => {
      let key: string;
      if (viewMode === 'module') {
        key = sessionHistoryService.getModuleLabel(log.module_name);
      } else {
        const d = new Date(log.created_at);
        const ds = new Date(d); ds.setHours(0, 0, 0, 0);
        if (ds.getTime() === today.getTime()) key = 'Today';
        else if (ds.getTime() === yest.getTime()) key = 'Yesterday';
        else key = d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
      }
      (groups[key] ||= []).push(log);
    });
    return groups;
  }, [filteredLogs, viewMode]);

  /* AI Insights */
  const insights = useMemo(() => {
    if (filteredLogs.length === 0) {
      return { mostUsed: '—', mostProductiveDay: '—', mostActiveTime: '—', total: 0, recent: '—' };
    }
    const byModule: Record<string, number> = {};
    const byDay: Record<string, number> = {};
    const byHour: Record<number, number> = {};
    filteredLogs.forEach(l => {
      byModule[l.module_name] = (byModule[l.module_name] || 0) + 1;
      const d = new Date(l.created_at);
      const dayKey = d.toLocaleDateString('en-US', { weekday: 'long' });
      byDay[dayKey] = (byDay[dayKey] || 0) + 1;
      byHour[d.getHours()] = (byHour[d.getHours()] || 0) + 1;
    });
    const top = (o: Record<string, number>) => Object.entries(o).sort((a, b) => b[1] - a[1])[0];
    const topMod = top(byModule);
    const topDay = top(byDay);
    const topHour = Object.entries(byHour).sort((a, b) => b[1] - a[1])[0];
    const hourLabel = (h: number) => {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const hr = h % 12 || 12;
      return `${hr}:00 ${ampm}`;
    };
    return {
      mostUsed: topMod ? sessionHistoryService.getModuleLabel(topMod[0]) : '—',
      mostProductiveDay: topDay ? topDay[0] : '—',
      mostActiveTime: topHour ? hourLabel(Number(topHour[0])) : '—',
      total: filteredLogs.length,
      recent: sessionHistoryService.getModuleLabel(filteredLogs[0].module_name),
    };
  }, [filteredLogs]);

  return (
    <div className="h-full flex flex-col bg-background relative overflow-hidden">
      {/* Ambient mesh gradient backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-70 dark:opacity-50">
        <div className="absolute -top-32 -left-20 h-80 w-80 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.35), transparent 60%)' }} />
        <div className="absolute top-20 right-0 h-96 w-96 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.32), transparent 60%)' }} />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.32), transparent 60%)' }} />
      </div>

      <SessionHistoryBar />

      <ScrollArea className="flex-1">
        <div className="px-4 sm:px-6 py-5 max-w-6xl mx-auto space-y-6">

          {/* ============ HERO ============ */}
          <div className="relative overflow-hidden rounded-3xl border border-white/30 dark:border-white/[0.08] bg-white/40 dark:bg-white/[0.03] backdrop-blur-2xl p-6 sm:p-8 shadow-[0_30px_60px_-30px_rgba(99,102,241,0.45)]">
            {/* Animated gradient orb */}
            <div className="pointer-events-none absolute inset-0 opacity-90">
              <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(168,85,247,0.10) 45%, rgba(6,182,212,0.12))' }} />
              <div className="absolute -top-16 -right-10 h-72 w-72 rounded-full blur-3xl animate-pulse" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.45), transparent 60%)', animationDuration: '6s' }} />
              <div className="absolute -bottom-20 -left-10 h-72 w-72 rounded-full blur-3xl animate-pulse" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.45), transparent 60%)', animationDuration: '7s' }} />
            </div>

            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-[0_10px_30px_-8px_rgba(99,102,241,0.55)]"
                  style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6 55%, #06B6D4)' }}>
                  <History className="h-7 w-7" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-foreground/60 font-semibold mb-1.5">
                    <Sparkles className="h-3 w-3" /> AI Activity Timeline
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-clip-text text-transparent"
                    style={{ backgroundImage: 'linear-gradient(135deg, #3B82F6, #8B5CF6 55%, #06B6D4)' }}>
                    Persistent History
                  </h1>
                  <p className="text-sm text-foreground/70 mt-1 max-w-xl">
                    Your complete AI activity timeline and productivity journey.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {filteredLogs.length > 0 && (
                  <>
                    <Button variant="outline" size="sm" onClick={exportAsCSV} className="h-9 bg-white/50 dark:bg-white/[0.05] backdrop-blur-md border-white/40 dark:border-white/10">
                      <Download className="h-4 w-4 mr-1.5" /> Export
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearAllLogs} className="h-9 bg-white/50 dark:bg-white/[0.05] backdrop-blur-md border-white/40 dark:border-white/10 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4 mr-1.5" /> Clear
                    </Button>
                  </>
                )}
                <Button size="sm" onClick={fetchLogs} className="h-9 text-white border-0 shadow-[0_8px_20px_-8px_rgba(99,102,241,0.6)]"
                  style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)' }}>
                  <RotateCcw className="h-4 w-4 mr-1.5" /> Refresh
                </Button>
              </div>
            </div>
          </div>

          {/* ============ AI INSIGHTS ============ */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <InsightCard tint="blue" icon={Trophy} label="Most Used Module" value={insights.mostUsed} />
            <InsightCard tint="purple" icon={TrendingUp} label="Most Productive Day" value={insights.mostProductiveDay} />
            <InsightCard tint="cyan" icon={Clock} label="Most Active Time" value={insights.mostActiveTime} />
            <InsightCard tint="green" icon={Activity} label="Total Activities" value={String(insights.total)} hint={insights.total > 0 ? `Latest: ${insights.recent}` : undefined} />
          </div>

          {/* ============ TOOLBAR ============ */}
          <div className="rounded-2xl border border-white/30 dark:border-white/[0.08] bg-white/50 dark:bg-white/[0.03] backdrop-blur-xl p-3 sm:p-4 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by module, keyword, action, or date…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 h-10 bg-white/60 dark:bg-white/[0.04] border-white/40 dark:border-white/10 backdrop-blur-md rounded-xl"
              />
            </div>

            {/* Range chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              {TIME_RANGES.map(r => (
                <Chip key={r.value} active={timeRange === r.value} onClick={() => setTimeRange(r.value)}>
                  {r.label}
                </Chip>
              ))}
              <div className="mx-2 h-5 w-px bg-border/60" />
              <button
                onClick={() => setViewMode(viewMode === 'date' ? 'module' : 'date')}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 h-7 rounded-full text-xs font-medium border transition-all',
                  'bg-white/60 dark:bg-white/[0.04] border-white/40 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/[0.08]'
                )}
              >
                {viewMode === 'date' ? <CalendarDays className="h-3 w-3" /> : <LayoutGrid className="h-3 w-3" />}
                Group: {viewMode === 'date' ? 'Date' : 'Module'}
              </button>
            </div>

            {/* Module filter chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              {MODULE_OPTIONS.map(opt => (
                <Chip key={opt.value} active={filterModule === opt.value} onClick={() => setFilterModule(opt.value)} variant="module">
                  {opt.label}
                </Chip>
              ))}
            </div>
          </div>

          {/* ============ TIMELINE ============ */}
          <div className="relative">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <RotateCcw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : Object.keys(grouped).length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-8">
                {Object.entries(grouped).map(([groupKey, groupLogs]) => (
                  <div key={groupKey} className="relative">
                    <div className="sticky top-0 z-10 -mx-2 px-2 py-2 backdrop-blur-md mb-3">
                      <div className="flex items-center gap-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold text-white shadow-[0_8px_24px_-10px_rgba(99,102,241,0.6)]"
                          style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)' }}>
                          <Zap className="h-3.5 w-3.5" />
                          {groupKey}
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">{groupLogs.length} {groupLogs.length === 1 ? 'activity' : 'activities'}</span>
                        <div className="flex-1 h-px bg-gradient-to-r from-border/60 to-transparent" />
                      </div>
                    </div>

                    {/* Vertical rail */}
                    <div className="relative">
                      <div className="absolute left-[14px] top-2 bottom-2 w-px"
                        style={{ background: 'linear-gradient(180deg, rgba(59,130,246,0.4), rgba(139,92,246,0.3), rgba(6,182,212,0.4))' }} />
                      <div>
                        {groupLogs.map(log => (
                          <HistoryLogEntry
                            key={log.id}
                            log={log}
                            onDelete={deleteLog}
                            onView={setViewingLog}
                            onResume={onResumeAction}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </ScrollArea>

      <HistoryViewDialog
        log={viewingLog}
        open={!!viewingLog}
        onOpenChange={(open) => { if (!open) setViewingLog(null); }}
      />
    </div>
  );
};

/* ---------- Insight Card ---------- */
const TINT_MAP = {
  blue:   { grad: 'linear-gradient(135deg, #3B82F6, #6366F1)', glow: 'shadow-[0_18px_40px_-22px_rgba(59,130,246,0.7)]', wash: 'rgba(59,130,246,0.12)' },
  purple: { grad: 'linear-gradient(135deg, #8B5CF6, #A855F7)', glow: 'shadow-[0_18px_40px_-22px_rgba(139,92,246,0.7)]', wash: 'rgba(139,92,246,0.12)' },
  cyan:   { grad: 'linear-gradient(135deg, #06B6D4, #0EA5E9)', glow: 'shadow-[0_18px_40px_-22px_rgba(6,182,212,0.7)]',   wash: 'rgba(6,182,212,0.12)' },
  green:  { grad: 'linear-gradient(135deg, #10B981, #14B8A6)', glow: 'shadow-[0_18px_40px_-22px_rgba(16,185,129,0.7)]',  wash: 'rgba(16,185,129,0.12)' },
} as const;
type TintKey = keyof typeof TINT_MAP;

const InsightCard: React.FC<{
  tint: TintKey;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
}> = ({ tint, icon: Icon, label, value, hint }) => {
  const t = TINT_MAP[tint];
  return (
    <div className={cn(
      'relative overflow-hidden rounded-2xl p-4 border border-white/40 dark:border-white/[0.06] bg-white/55 dark:bg-white/[0.04] backdrop-blur-xl transition-all hover:-translate-y-0.5',
      t.glow,
    )}>
      <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(120% 120% at 0% 0%, ${t.wash}, transparent 55%)` }} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">{label}</div>
          <div className="mt-1.5 text-lg font-semibold text-foreground truncate" title={value}>{value}</div>
          {hint && <div className="mt-1 text-[11px] text-muted-foreground truncate">{hint}</div>}
        </div>
        <div className="h-9 w-9 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: t.grad }}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
};

/* ---------- Chip ---------- */
const Chip: React.FC<{ active?: boolean; onClick?: () => void; children: React.ReactNode; variant?: 'range' | 'module' }> = ({
  active, onClick, children,
}) => (
  <button
    onClick={onClick}
    className={cn(
      'inline-flex items-center px-3 h-7 rounded-full text-xs font-medium border transition-all',
      active
        ? 'text-white border-transparent shadow-[0_6px_18px_-8px_rgba(99,102,241,0.7)]'
        : 'bg-white/60 dark:bg-white/[0.04] border-white/40 dark:border-white/10 text-foreground/80 hover:bg-white/80 dark:hover:bg-white/[0.08]'
    )}
    style={active ? { background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)' } : undefined}
  >
    {children}
  </button>
);

/* ---------- Empty state ---------- */
const EmptyState: React.FC = () => (
  <div className="relative overflow-hidden rounded-3xl border border-white/30 dark:border-white/[0.08] bg-white/50 dark:bg-white/[0.03] backdrop-blur-2xl p-12 text-center">
    <div className="pointer-events-none absolute inset-0 opacity-80">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.35), transparent 60%)' }} />
    </div>
    <div className="relative">
      <div className="mx-auto h-20 w-20 rounded-3xl flex items-center justify-center text-white shadow-[0_18px_40px_-12px_rgba(139,92,246,0.7)] mb-5"
        style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6 55%, #06B6D4)' }}>
        <Sparkles className="h-9 w-9" />
      </div>
      <h3 className="text-xl font-semibold bg-clip-text text-transparent mb-2"
        style={{ backgroundImage: 'linear-gradient(135deg, #3B82F6, #8B5CF6 55%, #06B6D4)' }}>
        Your journey starts here.
      </h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        Every action you perform in TestZone will be recorded and visualized — generate test cases, scenarios, XPaths, analyze defects, and watch your QA journey unfold.
      </p>
    </div>
  </div>
);

export default HistoryModule;
