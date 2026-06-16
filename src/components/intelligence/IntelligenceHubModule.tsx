import React, { useMemo } from 'react';
import { format, formatDistanceToNow, parseISO, subDays } from 'date-fns';
import {
  Activity,
  Brain,
  Clock,
  Flame,
  Sparkles,
  Trophy,
  TrendingUp,
  Zap,
  Target,
  GraduationCap,
  Timer,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useIntelligenceData } from '@/hooks/useIntelligenceData';
import { useAuth } from '@/contexts/AuthContext';

const MODULE_LABELS: Record<string, string> = {
  'agentic-ai': 'Hive Workspace',
  'test-case-generator': 'Test Case Generator',
  'logic-scenario-creator': 'Logic Scenario Creator',
  'xpath-generator': 'XPath Generator',
  'code-analyzer': 'Hive Code Analyzer',
  'defect-analyzer': 'AI Defect Analyzer',
  'jira-ticket-raiser': 'Jira Ticket Raiser',
  'gitlab-execution': 'GitLab AI Execution',
  'tickets': 'My Tickets',
  'chat': 'Hive AI Chat',
  'history': 'History',
  'mentions': 'Mentions',
  'intelligence-hub': 'Intelligence Hub',
  'ai-settings': 'AI Configuration',
  'profile': 'Profile',
  'account-settings': 'Settings',
};

const ACTION_LABELS: Record<string, string> = {
  module_opened: 'Opened',
  module_closed: 'Closed',
  test_case_generated: 'Generated test cases',
  scenario_generated: 'Generated scenario',
  xpath_generated: 'Generated XPath',
  code_reviewed: 'Reviewed code',
  defect_analyzed: 'Analyzed defect',
  pipeline_triggered: 'Triggered pipeline',
  ticket_created: 'Created ticket',
  chat_message_sent: 'Sent AI message',
};

// 3 minutes saved per AI-driven action (industry conservative estimate).
const MINUTES_SAVED_PER_AI_ACTION = 3;
const COST_PER_HOUR_SAVED = 35; // USD baseline

const PIE_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  '#6366f1',
  '#22d3ee',
  '#f59e0b',
  '#ec4899',
  '#10b981',
  '#a855f7',
  '#ef4444',
  '#14b8a6',
];

function formatDuration(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(n));
}

function moduleLabel(key: string): string {
  return MODULE_LABELS[key] ?? key;
}

function actionLabel(a: string): string {
  return ACTION_LABELS[a] ?? a.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

interface KpiCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number | null;
  accent?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, hint, icon: Icon, trend, accent }) => {
  const trendNode =
    trend == null ? null : trend > 0 ? (
      <span className="inline-flex items-center gap-0.5 text-emerald-500 text-xs font-medium">
        <ArrowUpRight className="h-3 w-3" /> {Math.abs(Math.round(trend))}%
      </span>
    ) : trend < 0 ? (
      <span className="inline-flex items-center gap-0.5 text-rose-500 text-xs font-medium">
        <ArrowDownRight className="h-3 w-3" /> {Math.abs(Math.round(trend))}%
      </span>
    ) : (
      <span className="inline-flex items-center gap-0.5 text-muted-foreground text-xs">
        <Minus className="h-3 w-3" /> 0%
      </span>
    );

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/70 backdrop-blur-md p-5 shadow-sm transition-colors hover:bg-card/80">
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{ background: accent ?? 'radial-gradient(circle at top right, hsl(var(--primary)), transparent 60%)' }}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
          <div className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground tabular-nums">{value}</div>
          {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
        </div>
        <div className="rounded-xl bg-primary/10 text-primary p-2">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {trendNode && <div className="relative mt-3">{trendNode}</div>}
    </div>
  );
};

const Section: React.FC<{ title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode }> = ({
  title,
  subtitle,
  right,
  children,
}) => (
  <section className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md p-5 shadow-sm">
    <header className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </header>
    {children}
  </section>
);

const ScoreRing: React.FC<{ score: number; label: string; sublabel?: string }> = ({ score, label, sublabel }) => {
  const safe = Math.max(0, Math.min(100, score));
  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (safe / 100) * circumference;
  const status = safe >= 85 ? 'Excellent' : safe >= 70 ? 'Healthy' : safe >= 50 ? 'Improving' : 'Needs focus';

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-32 w-32 flex-shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r="52" stroke="hsl(var(--muted))" strokeWidth="10" fill="none" />
          <circle
            cx="60"
            cy="60"
            r="52"
            stroke="url(#scoreGrad)"
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 800ms ease' }}
          />
          <defs>
            <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="hsl(var(--accent))" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-3xl font-bold tracking-tight text-foreground tabular-nums">{Math.round(safe)}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">/100</div>
        </div>
      </div>
      <div>
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-lg font-semibold text-foreground">{status}</div>
        {sublabel && <div className="text-xs text-muted-foreground mt-1">{sublabel}</div>}
      </div>
    </div>
  );
};

const IntelligenceHubModule: React.FC = () => {
  const { profile } = useAuth();
  const { summary, recent, loading } = useIntelligenceData();

  const derived = useMemo(() => {
    const byModule = summary.by_module ?? {};
    const byAction = summary.by_action ?? {};
    const totalEvents = summary.lifetime.events || 0;

    const moduleEntries = Object.entries(byModule).sort((a, b) => b[1] - a[1]);
    const mostUsed = moduleEntries[0]?.[0];
    const leastUsed = moduleEntries[moduleEntries.length - 1]?.[0];

    // Scores (0-100), tuned so even small activity feels rewarding.
    const cap = (n: number, max: number) => Math.min(100, Math.round((n / max) * 100));
    const productivity = cap(summary.month.events, 200);
    const automation = cap((byAction.test_case_generated ?? 0) + (byAction.xpath_generated ?? 0) + (byAction.pipeline_triggered ?? 0), 100);
    const quality = cap((byAction.code_reviewed ?? 0) + (byAction.defect_analyzed ?? 0), 80);
    const aiUtilization = cap(byAction.chat_message_sent ?? 0, 150);
    const efficiency = cap(summary.active_days_month, 20);
    const learning = cap(Object.keys(byModule).length * 12, 100);
    const overall = Math.round((productivity + automation + quality + aiUtilization + efficiency + learning) / 6);
    const qaHealth = Math.round((efficiency + productivity + automation + aiUtilization) / 4);

    // Month-over-month delta.
    const monthDelta =
      summary.prev_month.events > 0
        ? ((summary.month.events - summary.prev_month.events) / summary.prev_month.events) * 100
        : summary.month.events > 0
        ? 100
        : 0;

    // Time saved (AI vs manual estimate).
    const aiActions = totalEvents;
    const minutesSaved = aiActions * MINUTES_SAVED_PER_AI_ACTION;
    const hoursSaved = minutesSaved / 60;
    const costSaved = hoursSaved * COST_PER_HOUR_SAVED;

    // Last 30 days area data.
    const today = new Date();
    const days: { date: string; label: string; value: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = subDays(today, i);
      const key = format(d, 'yyyy-MM-dd');
      days.push({ date: key, label: format(d, 'MMM d'), value: summary.by_day_30?.[key] ?? 0 });
    }

    // Most productive hour & day.
    const hourEntries = Object.entries(summary.by_hour ?? {});
    const peakHour = hourEntries.sort((a, b) => b[1] - a[1])[0]?.[0];
    const dowEntries = Object.entries(summary.by_dow ?? {});
    const dowNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const peakDow = dowEntries.sort((a, b) => b[1] - a[1])[0]?.[0];

    // Pie data — top 8 modules.
    const pieData = moduleEntries.slice(0, 8).map(([k, v]) => ({ name: moduleLabel(k), value: v }));
    const barData = moduleEntries.slice(0, 10).map(([k, v]) => ({ name: moduleLabel(k).split(' ').slice(0, 2).join(' '), value: v }));

    // Skill / learning bars from module diversity.
    const skill = (modKey: string, base = 25) => Math.min(100, base + (byModule[modKey] ?? 0) * 4);
    const skills = [
      { name: 'Web Testing', value: skill('xpath-generator', 30) },
      { name: 'Automation', value: skill('gitlab-execution', 25) },
      { name: 'API Testing', value: skill('code-analyzer', 25) },
      { name: 'Mobile Testing', value: skill('xpath-generator', 20) },
      { name: 'AI Testing', value: Math.min(100, 30 + (byAction.chat_message_sent ?? 0) * 2) },
    ];

    // Achievements.
    const achievements = [
      { id: 'tc', icon: Trophy, label: 'Test Case Master', desc: 'Generate 1,000 test cases', unlocked: (byAction.test_case_generated ?? 0) >= 1000, progress: byAction.test_case_generated ?? 0, goal: 1000 },
      { id: 'xp', icon: Award, label: 'XPath Expert', desc: 'Generate 5,000 XPaths', unlocked: (byAction.xpath_generated ?? 0) >= 5000, progress: byAction.xpath_generated ?? 0, goal: 5000 },
      { id: 'cr', icon: Sparkles, label: 'AI Reviewer', desc: 'Review 1,000 scripts', unlocked: (byAction.code_reviewed ?? 0) >= 1000, progress: byAction.code_reviewed ?? 0, goal: 1000 },
      { id: 'df', icon: Target, label: 'Defect Hunter', desc: 'Analyze 500 defects', unlocked: (byAction.defect_analyzed ?? 0) >= 500, progress: byAction.defect_analyzed ?? 0, goal: 500 },
      { id: 'au', icon: Zap, label: 'Automation Champion', desc: '100 pipelines triggered', unlocked: (byAction.pipeline_triggered ?? 0) >= 100, progress: byAction.pipeline_triggered ?? 0, goal: 100 },
      { id: 'st', icon: Flame, label: 'Streak Builder', desc: '20 active days this month', unlocked: summary.active_days_month >= 20, progress: summary.active_days_month, goal: 20 },
    ];

    return {
      mostUsed,
      leastUsed,
      productivity,
      automation,
      quality,
      aiUtilization,
      efficiency,
      learning,
      overall,
      qaHealth,
      monthDelta,
      hoursSaved,
      costSaved,
      days,
      peakHour,
      peakDow: peakDow != null ? dowNames[parseInt(peakDow, 10)] : undefined,
      pieData,
      barData,
      skills,
      achievements,
    };
  }, [summary]);

  if (loading) {
    return (
      <div className="h-full overflow-y-auto p-6 space-y-4">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-background via-background to-muted/20">
      <div className="mx-auto max-w-7xl p-6 lg:p-8 space-y-6">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-accent/5 to-background p-6 lg:p-8">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
          <div className="relative flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-10">
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/50 backdrop-blur px-3 py-1 text-[11px] font-medium text-muted-foreground">
                <Sparkles className="h-3 w-3 text-primary" />
                Personal QA Performance & Productivity Center
              </div>
              <h1 className="mt-3 text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
                Welcome back, {firstName}.
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">
                Your TestZone Intelligence Hub — every action, score, and insight, learning from how you work.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="secondary" className="rounded-full">
                  <Flame className="h-3 w-3 mr-1 text-orange-500" />
                  {summary.active_days_month} active days this month
                </Badge>
                <Badge variant="secondary" className="rounded-full">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDuration(summary.today.duration)} today
                </Badge>
                <Badge variant="secondary" className="rounded-full">
                  <Activity className="h-3 w-3 mr-1" />
                  {formatNumber(summary.lifetime.events)} lifetime events
                </Badge>
              </div>
            </div>
            <div className="flex-shrink-0 grid grid-cols-2 gap-6">
              <ScoreRing score={derived.overall} label="Productivity Score" sublabel={`${derived.monthDelta >= 0 ? '↑' : '↓'} ${Math.abs(Math.round(derived.monthDelta))}% vs last month`} />
              <ScoreRing score={derived.qaHealth} label="QA Health Score" />
            </div>
          </div>
        </div>

        {/* Lifetime KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Test Cases" value={formatNumber(summary.by_action.test_case_generated ?? 0)} icon={Trophy} hint="Lifetime generated" />
          <KpiCard label="XPaths" value={formatNumber(summary.by_action.xpath_generated ?? 0)} icon={Zap} hint="Lifetime generated" />
          <KpiCard label="Code Reviews" value={formatNumber(summary.by_action.code_reviewed ?? 0)} icon={Sparkles} hint="By AI Code Analyzer" />
          <KpiCard label="Defects Analyzed" value={formatNumber(summary.by_action.defect_analyzed ?? 0)} icon={Target} hint="Lifetime" />
          <KpiCard label="Pipelines" value={formatNumber(summary.by_action.pipeline_triggered ?? 0)} icon={Activity} hint="GitLab executions" />
          <KpiCard label="AI Conversations" value={formatNumber(summary.by_action.chat_message_sent ?? 0)} icon={Brain} hint="Messages with Hive AI" />
          <KpiCard label="Hours Saved" value={`${formatNumber(derived.hoursSaved)}h`} icon={Timer} hint="vs manual baseline" />
          <KpiCard label="Cost Saved" value={`$${formatNumber(derived.costSaved)}`} icon={TrendingUp} hint={`@ $${COST_PER_HOUR_SAVED}/hr`} />
        </div>

        {/* Usage Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
            <KpiCard label="Today" value={formatDuration(summary.today.duration)} hint={`${summary.today.events} events`} icon={Clock} />
            <KpiCard label="This Week" value={formatDuration(summary.week.duration)} hint={`${summary.week.events} events`} icon={Clock} />
            <KpiCard label="This Month" value={formatDuration(summary.month.duration)} hint={`${summary.month.events} events`} icon={Clock} trend={derived.monthDelta} />
            <KpiCard label="This Year" value={formatDuration(summary.year.duration)} hint={`${summary.year.events} events`} icon={Clock} />
          </div>

          <div className="lg:col-span-3">
            <Section title="Activity — Last 30 Days" subtitle="Events recorded per day across all modules">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={derived.days}>
                    <defs>
                      <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} interval={4} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <RTooltip
                      contentStyle={{
                        background: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                    />
                    <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#actGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Section>
          </div>
        </div>

        {/* Module Usage */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Section title="Module Usage Breakdown" subtitle="Where your time and focus are going">
            <div className="h-72">
              {derived.pieData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Start using a module to see your distribution.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={derived.pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                    >
                      {derived.pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RTooltip
                      contentStyle={{
                        background: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
              {derived.pieData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
                  <span className="h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="truncate flex-1">{d.name}</span>
                  <span className="tabular-nums text-foreground/80">{d.value}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Most-Used Modules" subtitle="Top 10 by activity">
            <div className="h-72">
              {derived.barData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  No module activity yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={derived.barData} layout="vertical" margin={{ left: 12, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={120} />
                    <RTooltip
                      contentStyle={{
                        background: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]} fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Section>
        </div>

        {/* Performance scores grid + AI insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <Section title="Performance Analytics" subtitle="A complete breakdown of how you're performing">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: 'Quality', v: derived.quality },
                  { label: 'Automation', v: derived.automation },
                  { label: 'Productivity', v: derived.productivity },
                  { label: 'AI Utilization', v: derived.aiUtilization },
                  { label: 'Testing Efficiency', v: derived.efficiency },
                  { label: 'Learning', v: derived.learning },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-border/60 p-4 bg-background/40">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">{s.label}</span>
                      <span className="text-sm font-semibold tabular-nums">{s.v}</span>
                    </div>
                    <Progress value={s.v} className="h-1.5" />
                  </div>
                ))}
              </div>
            </Section>
          </div>

          <Section title="AI Insights" subtitle="Personalized recommendations" right={<Brain className="h-4 w-4 text-primary" />}>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 text-primary p-1.5 mt-0.5"><Trophy className="h-3.5 w-3.5" /></div>
                <div>
                  <div className="text-foreground font-medium">Most used module</div>
                  <div className="text-xs text-muted-foreground">{derived.mostUsed ? moduleLabel(derived.mostUsed) : '—'}</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 text-primary p-1.5 mt-0.5"><Clock className="h-3.5 w-3.5" /></div>
                <div>
                  <div className="text-foreground font-medium">Most productive time</div>
                  <div className="text-xs text-muted-foreground">{derived.peakHour != null ? `${derived.peakHour}:00 – ${(parseInt(derived.peakHour, 10) + 2) % 24}:00` : '—'}</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 text-primary p-1.5 mt-0.5"><Flame className="h-3.5 w-3.5" /></div>
                <div>
                  <div className="text-foreground font-medium">Most active day</div>
                  <div className="text-xs text-muted-foreground">{derived.peakDow ?? '—'}</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="rounded-lg bg-accent/15 text-accent-foreground p-1.5 mt-0.5"><Sparkles className="h-3.5 w-3.5" /></div>
                <div>
                  <div className="text-foreground font-medium">Suggestion</div>
                  <div className="text-xs text-muted-foreground">
                    {derived.leastUsed && derived.leastUsed !== derived.mostUsed
                      ? `Try ${moduleLabel(derived.leastUsed)} more often to broaden your automation coverage.`
                      : 'Keep exploring modules to unlock new productivity gains.'}
                  </div>
                </div>
              </li>
            </ul>
          </Section>
        </div>

        {/* Learning + Time Saved */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Section title="Learning Analytics" subtitle="Skill growth across QA disciplines" right={<GraduationCap className="h-4 w-4 text-primary" />}>
            <div className="space-y-3">
              {derived.skills.map((s) => (
                <div key={s.name}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-foreground">{s.name}</span>
                    <span className="text-muted-foreground tabular-nums">{s.value}%</span>
                  </div>
                  <Progress value={s.value} className="h-1.5" />
                </div>
              ))}
            </div>
          </Section>

          <Section title="Time Saved Analytics" subtitle="AI vs manual estimate" right={<Timer className="h-4 w-4 text-primary" />}>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded-xl border border-border/60 p-4 bg-background/40">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Manual estimate</div>
                <div className="text-xl font-semibold mt-1 tabular-nums">{formatNumber(derived.hoursSaved * 4)}h</div>
              </div>
              <div className="rounded-xl border border-border/60 p-4 bg-background/40">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">With TestZone</div>
                <div className="text-xl font-semibold mt-1 tabular-nums">{formatNumber(derived.hoursSaved)}h</div>
              </div>
              <div className="rounded-xl border border-primary/30 p-4 bg-primary/5">
                <div className="text-[10px] uppercase tracking-wider text-primary">You saved</div>
                <div className="text-xl font-semibold mt-1 tabular-nums text-primary">{formatNumber(derived.hoursSaved * 3)}h</div>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Estimated at {MINUTES_SAVED_PER_AI_ACTION} minutes per AI-assisted action — adjusts as you continue using TestZone.
            </p>
          </Section>
        </div>

        {/* Achievements */}
        <Section title="Achievements" subtitle="Milestones unlocked through your TestZone journey" right={<Trophy className="h-4 w-4 text-primary" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {derived.achievements.map((a) => {
              const pct = Math.min(100, Math.round((a.progress / a.goal) * 100));
              return (
                <div
                  key={a.id}
                  className={`rounded-xl border p-4 transition-colors ${
                    a.unlocked
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-border/60 bg-background/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`rounded-lg p-2 ${a.unlocked ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      <a.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground">{a.label}</div>
                      <div className="text-xs text-muted-foreground">{a.desc}</div>
                    </div>
                    {a.unlocked && <Badge className="rounded-full text-[10px]">Unlocked</Badge>}
                  </div>
                  <div className="mt-3">
                    <Progress value={pct} className="h-1" />
                    <div className="mt-1 text-[10px] text-muted-foreground tabular-nums text-right">
                      {formatNumber(a.progress)} / {formatNumber(a.goal)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Activity Timeline */}
        <Section title="AI Activity Timeline" subtitle="Your most recent actions across TestZone" right={<Activity className="h-4 w-4 text-primary" />}>
          {recent.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No activity yet — open any module and your timeline will start populating instantly.
            </div>
          ) : (
            <ol className="relative border-l border-border/60 ml-3">
              {recent.slice(0, 20).map((e) => (
                <li key={e.id} className="ml-4 pb-4 last:pb-0">
                  <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm text-foreground truncate">
                        <span className="font-medium">{actionLabel(e.action)}</span>{' '}
                        <span className="text-muted-foreground">in {moduleLabel(e.module)}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {(() => {
                          try {
                            return `${format(parseISO(e.created_at), 'MMM d, HH:mm')} · ${formatDistanceToNow(parseISO(e.created_at), { addSuffix: true })}`;
                          } catch {
                            return e.created_at;
                          }
                        })()}
                      </div>
                    </div>
                    {e.duration_ms > 0 && (
                      <Badge variant="secondary" className="rounded-full text-[10px] flex-shrink-0">
                        {formatDuration(e.duration_ms)}
                      </Badge>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Section>

        <p className="text-center text-[11px] text-muted-foreground py-4">
          All metrics are stored permanently in your cloud profile — synced across devices, browsers, and sessions.
        </p>
      </div>
    </div>
  );
};

export default IntelligenceHubModule;
