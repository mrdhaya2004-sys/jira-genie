import React, { useMemo } from 'react';
import { useMyTickets } from '@/hooks/useMyTickets';
import TicketList from './TicketList';
import AIInsightsPanel from './AIInsightsPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  RefreshCw,
  Ticket,
  Search,
  Sparkles,
  Download,
  Filter,
  Mic,
  TrendingUp,
  CheckCircle2,
  AlertOctagon,
  Flame,
  ListChecks,
  Zap,
  Calendar,
  Percent,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const GlassChip: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  glow: string;
}> = ({ icon, label, value, color, glow }) => (
  <div
    className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.55] border border-white/60 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-0.5"
    style={{ boxShadow: `0 8px 24px -12px ${glow}` }}
  >
    <span style={{ color }} className="flex">{icon}</span>
    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">{label}</span>
    <span className="text-xs font-bold tabular-nums" style={{ color }}>{value}</span>
  </div>
);

const KpiCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number | string;
  gradient: string;
  accent: string;
  hint?: string;
}> = ({ icon, label, value, gradient, accent, hint }) => (
  <div
    className="group relative overflow-hidden rounded-2xl border border-white/60 bg-white/[0.55] backdrop-blur-[35px] p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_-20px_rgba(37,99,235,0.35)]"
  >
    <div
      className="absolute -top-8 -right-8 h-24 w-24 rounded-full opacity-40 blur-2xl transition-opacity duration-500 group-hover:opacity-70"
      style={{ background: gradient }}
    />
    <div className="relative flex items-start justify-between">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="mt-1.5 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
        {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
      </div>
      <div
        className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg"
        style={{ background: gradient, boxShadow: `0 8px 20px -8px ${accent}` }}
      >
        {icon}
      </div>
    </div>
  </div>
);

const FilterChip: React.FC<{
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}> = ({ label, active, onClick, count }) => (
  <button
    onClick={onClick}
    className={cn(
      'inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-xs font-semibold transition-all duration-200',
      active
        ? 'bg-gradient-to-r from-[#4F46E5] to-[#2563EB] text-white border-transparent shadow-[0_6px_18px_-6px_rgba(79,70,229,0.6)]'
        : 'bg-white/60 text-slate-700 border-white/70 backdrop-blur-xl hover:bg-white/80 hover:border-blue-200 hover:shadow-[0_6px_18px_-8px_rgba(37,99,235,0.35)]',
    )}
  >
    {label}
    {typeof count === 'number' && (
      <span
        className={cn(
          'inline-flex items-center justify-center h-4 min-w-[18px] px-1 rounded-full text-[10px] font-bold tabular-nums',
          active ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600',
        )}
      >
        {count}
      </span>
    )}
  </button>
);

const MyTicketsModule: React.FC = () => {
  const {
    tickets,
    isLoading,
    error,
    total,
    statuses,
    issueTypes,
    filters,
    updateFilters,
    refreshTickets,
  } = useMyTickets();

  const stats = useMemo(() => {
    const byCategory = { new: 0, indeterminate: 0, done: 0, undefined: 0 };
    const byPriority: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    let todayCount = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    tickets.forEach((t) => {
      byCategory[t.status.category] = (byCategory[t.status.category] ?? 0) + 1;
      const p = t.priority?.name || 'Medium';
      byPriority[p] = (byPriority[p] ?? 0) + 1;
      if (new Date(t.updated) >= today) todayCount += 1;
    });

    const totalT = tickets.length || 1;
    const completionRate = Math.round((byCategory.done / totalT) * 100);
    return {
      open: byCategory.new,
      inProgress: byCategory.indeterminate,
      completed: byCategory.done,
      critical: byPriority.Critical || 0,
      high: byPriority.High || 0,
      today: todayCount,
      aiPriority: (byPriority.Critical || 0) + (byPriority.High || 0),
      completionRate,
    };
  }, [tickets]);

  return (
    <div className="relative h-full flex flex-col overflow-hidden bg-[#F7F9FC] dark:bg-[#0B0D14]">
      {/* Ambient aurora background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 -left-32 h-[420px] w-[420px] rounded-full blur-[80px] opacity-[0.18]"
          style={{ background: 'radial-gradient(circle, #4F46E5 0%, transparent 70%)' }}
        />
        <div
          className="absolute -top-32 -right-24 h-[440px] w-[440px] rounded-full blur-[80px] opacity-[0.16]"
          style={{ background: 'radial-gradient(circle, #38BDF8 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-40 -left-20 h-[400px] w-[400px] rounded-full blur-[80px] opacity-[0.16]"
          style={{ background: 'radial-gradient(circle, #22D3EE 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-32 -right-32 h-[440px] w-[440px] rounded-full blur-[80px] opacity-[0.14]"
          style={{ background: 'radial-gradient(circle, #10B981 0%, transparent 70%)' }}
        />
      </div>

      {/* Floating glass header */}
      <div className="relative z-10 mx-2 sm:mx-4 mt-2 sm:mt-3 rounded-2xl border border-white/60 bg-white/[0.55] backdrop-blur-[35px] backdrop-saturate-150 shadow-[0_20px_60px_-20px_rgba(37,99,235,0.25)]">
        <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#4F46E5]/50 to-transparent" />
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="relative shrink-0">
              <div
                className="absolute -inset-1 rounded-2xl opacity-60 blur-lg"
                style={{ background: 'conic-gradient(from 0deg, #4F46E5, #2563EB, #38BDF8, #22D3EE, #10B981, #4F46E5)' }}
              />
              <div className="relative h-11 w-11 rounded-2xl bg-white flex items-center justify-center ring-1 ring-inset ring-white/60 shadow-[0_8px_24px_-8px_rgba(79,70,229,0.6)]">
                <Ticket className="h-5 w-5 text-[#4F46E5]" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-[20px] font-bold tracking-tight truncate bg-gradient-to-r from-[#4F46E5] via-[#2563EB] to-[#10B981] bg-clip-text text-transparent">
                🎫 My Tickets
              </h1>
              <p className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
                <Sparkles className="h-3 w-3 text-[#4F46E5]" />
                Track, manage and collaborate on your assigned work
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <GlassChip icon={<Calendar className="h-3.5 w-3.5" />} label="Today" value={stats.today} color="#4F46E5" glow="rgba(79,70,229,0.4)" />
            <GlassChip icon={<ListChecks className="h-3.5 w-3.5" />} label="Open" value={stats.open + stats.inProgress} color="#2563EB" glow="rgba(37,99,235,0.4)" />
            <GlassChip icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Done" value={stats.completed} color="#10B981" glow="rgba(16,185,129,0.4)" />
            <Button
              variant="outline"
              size="sm"
              onClick={refreshTickets}
              disabled={isLoading}
              className="h-9 gap-1.5 rounded-full bg-white/70 border-white/70 backdrop-blur-xl hover:bg-white/90"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 rounded-full bg-white/70 border-white/70 backdrop-blur-xl hover:bg-white/90"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="relative z-10 flex-1 overflow-y-auto px-2 sm:px-4 pb-4 pt-3">
        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
          <KpiCard icon={<ListChecks className="h-5 w-5" />} label="Open" value={stats.open} gradient="linear-gradient(135deg,#2563EB,#38BDF8)" accent="rgba(37,99,235,0.5)" />
          <KpiCard icon={<Zap className="h-5 w-5" />} label="In Progress" value={stats.inProgress} gradient="linear-gradient(135deg,#F59E0B,#FB923C)" accent="rgba(245,158,11,0.5)" />
          <KpiCard icon={<CheckCircle2 className="h-5 w-5" />} label="Completed" value={stats.completed} gradient="linear-gradient(135deg,#10B981,#34D399)" accent="rgba(16,185,129,0.5)" />
          <KpiCard icon={<AlertOctagon className="h-5 w-5" />} label="Critical" value={stats.critical} gradient="linear-gradient(135deg,#EF4444,#F87171)" accent="rgba(239,68,68,0.5)" />
          <KpiCard icon={<Flame className="h-5 w-5" />} label="High" value={stats.high} gradient="linear-gradient(135deg,#F97316,#FB923C)" accent="rgba(249,115,22,0.5)" />
          <KpiCard icon={<Calendar className="h-5 w-5" />} label="Today" value={stats.today} gradient="linear-gradient(135deg,#4F46E5,#8B5CF6)" accent="rgba(79,70,229,0.5)" />
          <KpiCard icon={<Sparkles className="h-5 w-5" />} label="AI Priority" value={stats.aiPriority} gradient="linear-gradient(135deg,#8B5CF6,#EC4899)" accent="rgba(139,92,246,0.5)" />
          <KpiCard icon={<Percent className="h-5 w-5" />} label="Completion" value={`${stats.completionRate}%`} gradient="linear-gradient(135deg,#06B6D4,#10B981)" accent="rgba(6,182,212,0.5)" hint={`${total} total`} />
        </div>

        {/* Search bar */}
        <div className="mt-4 flex items-center gap-2 rounded-[22px] border border-white/60 bg-white/[0.65] backdrop-blur-[35px] px-4 shadow-[0_20px_60px_-20px_rgba(37,99,235,0.15)] h-14">
          <Search className="h-5 w-5 text-slate-400 shrink-0" />
          <Input
            value={filters.searchQuery}
            onChange={(e) => updateFilters({ searchQuery: e.target.value })}
            placeholder="Search by Ticket ID, Summary or Assignee..."
            className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 h-full text-sm placeholder:text-slate-400 px-0"
          />
          <div className="hidden md:flex items-center gap-1.5">
            <Button variant="ghost" size="sm" className="h-9 gap-1.5 rounded-full text-slate-600 hover:bg-white/70">
              <Filter className="h-3.5 w-3.5" />
              Quick Filter
            </Button>
            <Button variant="ghost" size="sm" className="h-9 gap-1.5 rounded-full text-[#4F46E5] hover:bg-[#4F46E5]/10">
              <Sparkles className="h-3.5 w-3.5" />
              AI Search
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-slate-500 hover:bg-white/70">
              <Mic className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filter chips */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mr-1">Type</span>
          <FilterChip label="All" active={filters.issueType === 'all'} onClick={() => updateFilters({ issueType: 'all' })} />
          {issueTypes.map((t) => (
            <FilterChip
              key={t}
              label={t}
              active={filters.issueType === t}
              onClick={() => updateFilters({ issueType: t })}
            />
          ))}
          <span className="mx-2 h-4 w-px bg-slate-200" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mr-1">Status</span>
          <FilterChip label="All" active={filters.status === 'all'} onClick={() => updateFilters({ status: 'all' })} />
          {statuses.slice(0, 6).map((s) => (
            <FilterChip
              key={s}
              label={s}
              active={filters.status === s}
              onClick={() => updateFilters({ status: s })}
            />
          ))}
        </div>

        {/* AI Insights */}
        <AIInsightsPanel tickets={tickets} isLoading={isLoading} onFilter={updateFilters} />

        {/* Ticket list */}
        <div className="mt-4">
          <TicketList
            tickets={tickets}
            isLoading={isLoading}
            error={error}
            onRefresh={refreshTickets}
          />
        </div>
      </div>
    </div>
  );
};

export default MyTicketsModule;
