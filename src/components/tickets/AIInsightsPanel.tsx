import React, { useMemo } from 'react';
import { Bug, CalendarClock, Ban, Sparkles, ArrowRight } from 'lucide-react';
import { JiraTicketItem } from '@/types/myTickets';
import { cn } from '@/lib/utils';

interface AIInsightsPanelProps {
  tickets: JiraTicketItem[];
  isLoading?: boolean;
  onFilter?: (patch: { issueType?: string; status?: string; searchQuery?: string }) => void;
}

interface InsightCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint: string;
  gradient: string;
  accent: string;
  onClick?: () => void;
}

const InsightCard: React.FC<InsightCardProps> = ({ icon, label, value, hint, gradient, accent, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="group relative overflow-hidden rounded-2xl border border-white/60 bg-white/[0.55] backdrop-blur-[35px] p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_-20px_rgba(37,99,235,0.35)]"
  >
    <div
      className="absolute -top-10 -right-10 h-28 w-28 rounded-full opacity-40 blur-2xl transition-opacity duration-500 group-hover:opacity-70"
      style={{ background: gradient }}
    />
    <div className="relative flex items-start justify-between">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="mt-1.5 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
        <p className="mt-0.5 text-[11px] text-slate-500 truncate">{hint}</p>
      </div>
      <div
        className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg"
        style={{ background: gradient, boxShadow: `0 8px 20px -8px ${accent}` }}
      >
        {icon}
      </div>
    </div>
    <div className="relative mt-3 flex items-center gap-1 text-[11px] font-semibold text-slate-500 opacity-0 transition-opacity group-hover:opacity-100">
      View <ArrowRight className="h-3 w-3" />
    </div>
  </button>
);

const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({ tickets, isLoading, onFilter }) => {
  const insights = useMemo(() => {
    const now = new Date();
    const in7 = new Date();
    in7.setDate(now.getDate() + 7);

    let openDefects = 0;
    let upcomingDeadlines = 0;
    let blocked = 0;
    let aiSuggestions = 0;

    tickets.forEach((t) => {
      const notDone = t.status.category !== 'done';
      const type = (t.issueType?.name || '').toLowerCase();
      const statusName = (t.status?.name || '').toLowerCase();
      const labels = (t.labels || []).map((l) => l.toLowerCase());
      const priority = (t.priority?.name || '').toLowerCase();

      if (notDone && (type === 'bug' || type === 'defect')) openDefects += 1;

      if (notDone && t.dueDate) {
        const d = new Date(t.dueDate);
        if (!Number.isNaN(d.getTime()) && d >= new Date(now.toDateString()) && d <= in7) {
          upcomingDeadlines += 1;
        }
      }

      if (
        notDone &&
        (statusName.includes('blocked') || statusName.includes('block') || labels.includes('blocked') || labels.includes('impediment'))
      ) {
        blocked += 1;
      }

      if (
        t.isAICreated ||
        labels.includes('ai') ||
        labels.includes('ai-suggested') ||
        (notDone && (priority === 'critical' || priority === 'highest'))
      ) {
        aiSuggestions += 1;
      }
    });

    return { openDefects, upcomingDeadlines, blocked, aiSuggestions };
  }, [tickets]);

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center gap-2 px-1">
        <Sparkles className="h-3.5 w-3.5 text-[#8B5CF6]" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">AI Insights</span>
        <span className={cn('text-[11px] text-slate-400', isLoading && 'animate-pulse')}>
          {isLoading ? 'Analyzing your tickets…' : `Based on ${tickets.length} of your tickets`}
        </span>
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <InsightCard
          icon={<Bug className="h-5 w-5" />}
          label="Open Defects"
          value={insights.openDefects}
          hint="Bugs not yet resolved"
          gradient="linear-gradient(135deg,#EF4444,#F97316)"
          accent="rgba(239,68,68,0.5)"
          onClick={() => onFilter?.({ issueType: 'Bug', status: 'all' })}
        />
        <InsightCard
          icon={<CalendarClock className="h-5 w-5" />}
          label="Upcoming Deadlines"
          value={insights.upcomingDeadlines}
          hint="Due within 7 days"
          gradient="linear-gradient(135deg,#F59E0B,#FB923C)"
          accent="rgba(245,158,11,0.5)"
        />
        <InsightCard
          icon={<Ban className="h-5 w-5" />}
          label="Blocked Tickets"
          value={insights.blocked}
          hint="Status or label: blocked"
          gradient="linear-gradient(135deg,#8B5CF6,#EC4899)"
          accent="rgba(139,92,246,0.5)"
          onClick={() => onFilter?.({ searchQuery: 'blocked' })}
        />
        <InsightCard
          icon={<Sparkles className="h-5 w-5" />}
          label="AI Suggestions"
          value={insights.aiSuggestions}
          hint="Critical / AI-flagged items"
          gradient="linear-gradient(135deg,#4F46E5,#22D3EE)"
          accent="rgba(79,70,229,0.5)"
        />
      </div>
    </div>
  );
};

export default AIInsightsPanel;
