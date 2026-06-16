import React, { useEffect, useMemo, useRef, useState } from 'react';
import { format, formatDistanceToNow, parseISO, subDays } from 'date-fns';
import {
  Activity, Brain, Clock, Flame, Sparkles, Trophy, TrendingUp, Zap, Target,
  GraduationCap, Timer, Award, ArrowUpRight, ArrowDownRight, Minus, ShieldCheck,
  Heart,
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip as RTooltip, AreaChart, Area, CartesianGrid,
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

// Vibrant per-module color system (premium palette).
const MODULE_COLORS: Record<string, string> = {
  'test-case-generator': '#10B981', // Green
  'code-analyzer':       '#3B82F6', // Blue
  'xpath-generator':     '#8B5CF6', // Purple
  'defect-analyzer':     '#EF4444', // Red
  'gitlab-execution':    '#F97316', // Orange
  'jira-ticket-raiser':  '#F59E0B', // Amber
  'logic-scenario-creator': '#06B6D4', // Cyan
  'agentic-ai':          '#A855F7',
  'chat':                '#06B6D4',
  'tickets':             '#0EA5E9',
  'history':             '#64748B',
  'mentions':            '#EC4899',
  'intelligence-hub':    '#6366F1',
};
const PALETTE_FALLBACK = ['#3B82F6', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#A855F7', '#F97316', '#14B8A6'];

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

const MINUTES_SAVED_PER_AI_ACTION = 3;
const COST_PER_HOUR_SAVED = 35;

const moduleColor = (k: string, i = 0) => MODULE_COLORS[k] ?? PALETTE_FALLBACK[i % PALETTE_FALLBACK.length];
const moduleLabel = (k: string) => MODULE_LABELS[k] ?? k;
const actionLabel = (a: string) => ACTION_LABELS[a] ?? a.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function formatDuration(ms: number) {
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}
function formatNumber(n: number) {
  return new Intl.NumberFormat('en-US').format(Math.round(n));
}

/* Smooth animated number counter */
function useCounter(target: number, duration = 900) {
  const [v, setV] = useState(0);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);
  useEffect(() => {
    fromRef.current = v;
    startRef.current = null;
    let raf = 0;
    const tick = (t: number) => {
      if (startRef.current == null) startRef.current = t;
      const p = Math.min(1, (t - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(fromRef.current + (target - fromRef.current) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return v;
}

const Counter: React.FC<{ value: number; format?: (n: number) => string; className?: string }> = ({ value, format = formatNumber, className }) => {
  const v = useCounter(value);
  return <span className={className}>{format(v)}</span>;
};

/* ------------ Colorful Glass KPI ------------ */
type Tint = 'blue' | 'purple' | 'green' | 'amber' | 'cyan' | 'rose' | 'orange';
const tintIcon: Record<Tint, string> = {
  blue: 'bg-blue-500/15 text-blue-600 dark:text-blue-300',
  purple: 'bg-violet-500/15 text-violet-600 dark:text-violet-300',
  green: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
  amber: 'bg-amber-500/15 text-amber-600 dark:text-amber-300',
  cyan: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300',
  rose: 'bg-rose-500/15 text-rose-600 dark:text-rose-300',
  orange: 'bg-orange-500/15 text-orange-600 dark:text-orange-300',
};

interface KpiCardProps {
  label: string; value: number | string; hint?: string; tint?: Tint;
  icon: React.ComponentType<{ className?: string }>; trend?: number | null;
  animatedValue?: number; format?: (n: number) => string;
}
const KpiCard: React.FC<KpiCardProps> = ({ label, value, hint, tint = 'blue', icon: Icon, trend, animatedValue, format }) => {
  const trendNode = trend == null ? null
    : trend > 0 ? <span className="inline-flex items-center gap-0.5 text-emerald-500 text-xs font-medium"><ArrowUpRight className="h-3 w-3" /> {Math.abs(Math.round(trend))}%</span>
    : trend < 0 ? <span className="inline-flex items-center gap-0.5 text-rose-500 text-xs font-medium"><ArrowDownRight className="h-3 w-3" /> {Math.abs(Math.round(trend))}%</span>
    : <span className="inline-flex items-center gap-0.5 text-muted-foreground text-xs"><Minus className="h-3 w-3" /> 0%</span>;

  return (
    <div className={`ih-glass ih-tint-${tint} ih-glow-${tint} rounded-2xl p-5 overflow-hidden`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
          <div className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground tabular-nums ih-count">
            {animatedValue != null ? <Counter value={animatedValue} format={format} /> : value}
          </div>
          {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
        </div>
        <div className={`rounded-xl p-2 ${tintIcon[tint]}`}><Icon className="h-4 w-4" /></div>
      </div>
      {trendNode && <div className="mt-3">{trendNode}</div>}
    </div>
  );
};

/* ------------ Generic glass section ------------ */
const Section: React.FC<{ title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode; tint?: Tint; className?: string }> = ({
  title, subtitle, right, children, tint, className,
}) => (
  <section className={`ih-glass ${tint ? `ih-tint-${tint}` : ''} rounded-2xl p-5 ${className ?? ''}`}>
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

/* ------------ Apple Activity Rings ------------ */
const ActivityRings: React.FC<{ rings: { value: number; color: string; label: string }[] }> = ({ rings }) => {
  const radii = [62, 48, 34];
  return (
    <div className="relative h-44 w-44 mx-auto">
      {/* subtle backing disc so rings pop on the hero gradient */}
      <div className="absolute inset-1.5 rounded-full bg-black/45 backdrop-blur-md" />
      <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90 relative z-10">
        {rings.map((r, i) => {
          const radius = radii[i] ?? 30;
          const c = 2 * Math.PI * radius;
          const off = c - (Math.min(100, r.value) / 100) * c;
          return (
            <g key={i}>
              {/* track: white-ish at 25 % so it’s visible on dark backgrounds */}
              <circle cx="80" cy="80" r={radius} stroke="rgba(255,255,255,0.35)" strokeWidth="11" fill="none" />
              {/* progress ring with soft glow */}
              <circle cx="80" cy="80" r={radius} stroke={r.color} strokeWidth="11" fill="none"
                strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}
                style={{
                  transition: 'stroke-dashoffset 900ms cubic-bezier(.2,.7,.2,1)',
                  filter: `drop-shadow(0 0 6px ${r.color}) drop-shadow(0 0 14px ${r.color}66)`,
                }} />
            </g>
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center z-20"
        style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.55))' }}>
        <div className="text-3xl font-bold tabular-nums text-white">
          <Counter value={Math.round((rings.reduce((s, r) => s + r.value, 0) / rings.length))} />
        </div>
        <div className="text-[10px] uppercase tracking-wider text-white/95 mt-0.5">avg score</div>
      </div>
    </div>
  );
};

/* ------------ Gradient Donut ------------ */
const GradientDonut: React.FC<{ data: { name: string; value: number; color: string }[] }> = ({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <PieChart>
      <defs>
        {data.map((d, i) => (
          <linearGradient key={i} id={`pieGrad-${i}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={d.color} stopOpacity={1} />
            <stop offset="100%" stopColor={d.color} stopOpacity={0.55} />
          </linearGradient>
        ))}
      </defs>
      <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%"
        innerRadius={62} outerRadius={100} paddingAngle={3}
        stroke="hsl(var(--background))" strokeWidth={2}>
        {data.map((_, i) => <Cell key={i} fill={`url(#pieGrad-${i})`} />)}
      </Pie>
      <RTooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} />
    </PieChart>
  </ResponsiveContainer>
);

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

    const cap = (n: number, max: number) => Math.min(100, Math.round((n / max) * 100));
    const productivity = cap(summary.month.events, 200);
    const automation = cap((byAction.test_case_generated ?? 0) + (byAction.xpath_generated ?? 0) + (byAction.pipeline_triggered ?? 0), 100);
    const quality = cap((byAction.code_reviewed ?? 0) + (byAction.defect_analyzed ?? 0), 80);
    const aiUtilization = cap(byAction.chat_message_sent ?? 0, 150);
    const efficiency = cap(summary.active_days_month, 20);
    const learning = cap(Object.keys(byModule).length * 12, 100);
    const overall = Math.round((productivity + automation + quality + aiUtilization + efficiency + learning) / 6);
    const qaHealth = Math.round((efficiency + productivity + automation + aiUtilization) / 4);

    const monthDelta = summary.prev_month.events > 0
      ? ((summary.month.events - summary.prev_month.events) / summary.prev_month.events) * 100
      : summary.month.events > 0 ? 100 : 0;

    const aiActions = totalEvents;
    const minutesSaved = aiActions * MINUTES_SAVED_PER_AI_ACTION;
    const hoursSaved = minutesSaved / 60;
    const costSaved = hoursSaved * COST_PER_HOUR_SAVED;

    const today = new Date();
    const days: { date: string; label: string; value: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = subDays(today, i);
      const key = format(d, 'yyyy-MM-dd');
      days.push({ date: key, label: format(d, 'MMM d'), value: summary.by_day_30?.[key] ?? 0 });
    }

    const hourEntries = Object.entries(summary.by_hour ?? {});
    const peakHour = hourEntries.sort((a, b) => b[1] - a[1])[0]?.[0];
    const dowEntries = Object.entries(summary.by_dow ?? {});
    const dowNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const peakDow = dowEntries.sort((a, b) => b[1] - a[1])[0]?.[0];

    const pieData = moduleEntries.slice(0, 8).map(([k, v], i) => ({ name: moduleLabel(k), value: v, color: moduleColor(k, i) }));
    const barData = moduleEntries.slice(0, 10).map(([k, v], i) => ({
      name: moduleLabel(k).split(' ').slice(0, 2).join(' '),
      value: v,
      color: moduleColor(k, i),
    }));

    const skill = (modKey: string, base = 25) => Math.min(100, base + (byModule[modKey] ?? 0) * 4);
    const skills = [
      { name: 'Web Testing', value: skill('xpath-generator', 30), color: '#8B5CF6' },
      { name: 'Automation', value: skill('gitlab-execution', 25), color: '#F97316' },
      { name: 'API Testing', value: skill('code-analyzer', 25), color: '#3B82F6' },
      { name: 'Mobile Testing', value: skill('xpath-generator', 20), color: '#06B6D4' },
      { name: 'AI Testing', value: Math.min(100, 30 + (byAction.chat_message_sent ?? 0) * 2), color: '#10B981' },
    ];

    const achievements = [
      { id: 'tc', icon: Trophy, label: 'Test Case Master', desc: 'Generate 1,000 test cases', unlocked: (byAction.test_case_generated ?? 0) >= 1000, progress: byAction.test_case_generated ?? 0, goal: 1000, color: '#10B981' },
      { id: 'xp', icon: Award, label: 'XPath Expert', desc: 'Generate 5,000 XPaths', unlocked: (byAction.xpath_generated ?? 0) >= 5000, progress: byAction.xpath_generated ?? 0, goal: 5000, color: '#8B5CF6' },
      { id: 'cr', icon: Sparkles, label: 'AI Reviewer', desc: 'Review 1,000 scripts', unlocked: (byAction.code_reviewed ?? 0) >= 1000, progress: byAction.code_reviewed ?? 0, goal: 1000, color: '#3B82F6' },
      { id: 'df', icon: Target, label: 'Defect Hunter', desc: 'Analyze 500 defects', unlocked: (byAction.defect_analyzed ?? 0) >= 500, progress: byAction.defect_analyzed ?? 0, goal: 500, color: '#EF4444' },
      { id: 'au', icon: Zap, label: 'Automation Champion', desc: '100 pipelines triggered', unlocked: (byAction.pipeline_triggered ?? 0) >= 100, progress: byAction.pipeline_triggered ?? 0, goal: 100, color: '#F97316' },
      { id: 'st', icon: Flame, label: 'Streak Builder', desc: '20 active days this month', unlocked: summary.active_days_month >= 20, progress: summary.active_days_month, goal: 20, color: '#F59E0B' },
    ];

    return {
      mostUsed, leastUsed, productivity, automation, quality, aiUtilization, efficiency, learning,
      overall, qaHealth, monthDelta, hoursSaved, costSaved, days, peakHour,
      peakDow: peakDow != null ? dowNames[parseInt(peakDow, 10)] : undefined,
      pieData, barData, skills, achievements,
    };
  }, [summary]);

  if (loading) {
    return (
      <div className="h-full overflow-y-auto ih-mesh-bg p-6 space-y-4">
        <Skeleton className="h-40 w-full rounded-3xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';
  const healthLabel = derived.qaHealth >= 85 ? 'Excellent' : derived.qaHealth >= 70 ? 'Healthy' : derived.qaHealth >= 50 ? 'Improving' : 'Needs focus';

  return (
    <div className="h-full overflow-y-auto ih-mesh-bg">
      <div className="mx-auto max-w-7xl p-6 lg:p-8 space-y-6">

        {/* ============= HERO ============= */}
        <div className="relative overflow-hidden rounded-3xl">
          <div className="absolute inset-0 ih-hero-gradient" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.35),transparent_55%)]" />
          <div className="absolute inset-0 backdrop-blur-[2px]" />
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-cyan-400/40 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-violet-500/40 blur-3xl pointer-events-none" />

          <div className="relative p-6 lg:p-10 flex flex-col lg:flex-row lg:items-center gap-8">
            <div className="flex-1 min-w-0 text-white">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 backdrop-blur px-3 py-1 text-[11px] font-medium">
                <Sparkles className="h-3 w-3" />
                TestZone Intelligence Hub
              </div>
              <h1 className="mt-3 text-3xl lg:text-4xl font-bold tracking-tight drop-shadow-sm">
                Welcome back, {firstName} <span className="inline-block">👋</span>
              </h1>
              <p className="mt-2 text-sm lg:text-base text-white/85 max-w-xl">
                Your personal AI-powered QA command center — every action, score, and insight, learning from how you work.
              </p>

              <div className="mt-5 grid grid-cols-3 gap-3 max-w-xl">
                <div className="rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-white/80">Productivity</div>
                  <div className="mt-1 flex items-baseline gap-1 font-semibold tabular-nums">
                    <Counter value={derived.overall} className="text-2xl" /><span className="text-xs text-white/70">/100</span>
                  </div>
                </div>
                <div className="rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-white/80">AI Health</div>
                  <div className="mt-1 flex items-center gap-1.5 font-semibold">
                    <Heart className="h-4 w-4 text-emerald-200" />
                    <span className="text-base">{healthLabel}</span>
                  </div>
                </div>
                <div className="rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-white/80">Time Saved</div>
                  <div className="mt-1 flex items-baseline gap-1 font-semibold tabular-nums">
                    <Counter value={derived.hoursSaved} className="text-2xl" /><span className="text-xs text-white/70">hrs</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Badge className="rounded-full bg-white/15 backdrop-blur border-white/25 text-white hover:bg-white/20">
                  <Flame className="h-3 w-3 mr-1 text-amber-200" />
                  {summary.active_days_month} active days
                </Badge>
                <Badge className="rounded-full bg-white/15 backdrop-blur border-white/25 text-white hover:bg-white/20">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDuration(summary.today.duration)} today
                </Badge>
                <Badge className="rounded-full bg-white/15 backdrop-blur border-white/25 text-white hover:bg-white/20">
                  <Activity className="h-3 w-3 mr-1" />
                  {formatNumber(summary.lifetime.events)} lifetime events
                </Badge>
              </div>
            </div>

            {/* Apple-style Activity Rings */}
            <div className="flex-shrink-0 rounded-3xl bg-white/15 backdrop-blur-xl border border-white/25 p-5 w-full lg:w-auto">
              <ActivityRings
                rings={[
                  { value: derived.productivity, color: '#3B82F6', label: 'Productivity' },
                  { value: derived.automation,   color: '#8B5CF6', label: 'Automation'   },
                  { value: derived.aiUtilization,color: '#06B6D4', label: 'AI'           },
                ]}
              />
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div><div className="h-1.5 w-full rounded-full bg-blue-400" /><div className="text-[10px] text-white/85 mt-1">Productivity</div></div>
                <div><div className="h-1.5 w-full rounded-full bg-violet-400" /><div className="text-[10px] text-white/85 mt-1">Automation</div></div>
                <div><div className="h-1.5 w-full rounded-full bg-cyan-300" /><div className="text-[10px] text-white/85 mt-1">AI</div></div>
              </div>
            </div>
          </div>
        </div>

        {/* ============= COLOR KPI GRID ============= */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard tint="green"  label="Test Cases"        icon={Trophy}      hint="Lifetime generated" animatedValue={summary.by_action.test_case_generated ?? 0} value={0} />
          <KpiCard tint="purple" label="XPaths"            icon={Zap}         hint="Lifetime generated" animatedValue={summary.by_action.xpath_generated ?? 0} value={0} />
          <KpiCard tint="blue"   label="Code Reviews"      icon={Sparkles}    hint="By AI Code Analyzer" animatedValue={summary.by_action.code_reviewed ?? 0} value={0} />
          <KpiCard tint="rose"   label="Defects Analyzed"  icon={Target}      hint="Lifetime" animatedValue={summary.by_action.defect_analyzed ?? 0} value={0} />
          <KpiCard tint="orange" label="Pipelines"         icon={Activity}    hint="GitLab executions" animatedValue={summary.by_action.pipeline_triggered ?? 0} value={0} />
          <KpiCard tint="cyan"   label="AI Conversations"  icon={Brain}       hint="Messages with Hive AI" animatedValue={summary.by_action.chat_message_sent ?? 0} value={0} />
          <KpiCard tint="amber"  label="Hours Saved"       icon={Timer}       hint="vs manual baseline" animatedValue={derived.hoursSaved} value={0} format={(n) => `${formatNumber(n)}h`} />
          <KpiCard tint="green"  label="Cost Saved"        icon={TrendingUp}  hint={`@ $${COST_PER_HOUR_SAVED}/hr`} animatedValue={derived.costSaved} value={0} format={(n) => `$${formatNumber(n)}`} />
        </div>

        {/* ============= USAGE ANALYTICS ============= */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
            <KpiCard tint="blue"   label="Today"      value={formatDuration(summary.today.duration)} hint={`${summary.today.events} events`} icon={Clock} />
            <KpiCard tint="purple" label="This Week"  value={formatDuration(summary.week.duration)}  hint={`${summary.week.events} events`}  icon={Clock} />
            <KpiCard tint="cyan"   label="This Month" value={formatDuration(summary.month.duration)} hint={`${summary.month.events} events`} icon={Clock} trend={derived.monthDelta} />
            <KpiCard tint="green"  label="This Year"  value={formatDuration(summary.year.duration)}  hint={`${summary.year.events} events`}  icon={Clock} />
          </div>

          <div className="lg:col-span-3">
            <Section tint="blue" title="Activity — Last 30 Days" subtitle="Events recorded per day across all modules">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={derived.days}>
                    <defs>
                      <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.55} />
                        <stop offset="55%" stopColor="#8B5CF6" stopOpacity={0.30} />
                        <stop offset="100%" stopColor="#06B6D4" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="actStroke" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#3B82F6" />
                        <stop offset="50%" stopColor="#8B5CF6" />
                        <stop offset="100%" stopColor="#06B6D4" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} interval={4} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <RTooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} />
                    <Area type="monotone" dataKey="value" stroke="url(#actStroke)" strokeWidth={2.5} fill="url(#actGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Section>
          </div>
        </div>

        {/* ============= MODULE USAGE ============= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Section tint="purple" title="Module Usage Breakdown" subtitle="Where your time and focus are going">
            <div className="h-72">
              {derived.pieData.length === 0
                ? <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Start using a module to see your distribution.</div>
                : <GradientDonut data={derived.pieData} />}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
              {derived.pieData.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
                  <span className="h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ background: d.color, boxShadow: `0 0 8px ${d.color}80` }} />
                  <span className="truncate flex-1">{d.name}</span>
                  <span className="tabular-nums text-foreground/80">{d.value}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section tint="cyan" title="Most-Used Modules" subtitle="Top 10 by activity">
            <div className="h-72">
              {derived.barData.length === 0
                ? <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No module activity yet.</div>
                : <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={derived.barData} layout="vertical" margin={{ left: 12, right: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={120} />
                      <RTooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} />
                      <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                        {derived.barData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>}
            </div>
          </Section>
        </div>

        {/* ============= PERFORMANCE + AI INSIGHTS (with Orb) ============= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <Section tint="green" title="Performance Analytics" subtitle="A complete breakdown of how you're performing"
              right={<ShieldCheck className="h-4 w-4 text-emerald-500" />}>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {([
                  { label: 'Quality',            v: derived.quality,       c: '#10B981' },
                  { label: 'Automation',         v: derived.automation,    c: '#8B5CF6' },
                  { label: 'Productivity',       v: derived.productivity,  c: '#3B82F6' },
                  { label: 'AI Utilization',     v: derived.aiUtilization, c: '#06B6D4' },
                  { label: 'Testing Efficiency', v: derived.efficiency,    c: '#F59E0B' },
                  { label: 'Learning',           v: derived.learning,      c: '#EC4899' },
                ]).map((s) => (
                  <div key={s.label} className="rounded-xl border border-white/40 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-md p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">{s.label}</span>
                      <span className="text-sm font-semibold tabular-nums" style={{ color: s.c }}>{s.v}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${s.v}%`, background: `linear-gradient(90deg, ${s.c}, ${s.c}aa)`, boxShadow: `0 0 10px ${s.c}66` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </div>

          {/* AI Orb Panel */}
          <Section tint="cyan" title="AI Insights" subtitle="Personalized recommendations"
            right={<Brain className="h-4 w-4 text-cyan-500" />}>
            <div className="flex items-center justify-center mb-4">
              <div className="ih-orb h-24 w-24" />
            </div>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <div className="rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-300 p-1.5 mt-0.5"><Trophy className="h-3.5 w-3.5" /></div>
                <div>
                  <div className="text-foreground font-medium">Most used module</div>
                  <div className="text-xs text-muted-foreground">{derived.mostUsed ? moduleLabel(derived.mostUsed) : '—'}</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="rounded-lg bg-violet-500/15 text-violet-600 dark:text-violet-300 p-1.5 mt-0.5"><Clock className="h-3.5 w-3.5" /></div>
                <div>
                  <div className="text-foreground font-medium">Most productive time</div>
                  <div className="text-xs text-muted-foreground">{derived.peakHour != null ? `${derived.peakHour}:00 – ${(parseInt(derived.peakHour, 10) + 2) % 24}:00` : '—'}</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-300 p-1.5 mt-0.5"><Flame className="h-3.5 w-3.5" /></div>
                <div>
                  <div className="text-foreground font-medium">Most active day</div>
                  <div className="text-xs text-muted-foreground">{derived.peakDow ?? '—'}</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="rounded-lg bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 p-1.5 mt-0.5"><Sparkles className="h-3.5 w-3.5" /></div>
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

        {/* ============= LEARNING + TIME SAVED ============= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Section tint="purple" title="Learning Analytics" subtitle="Skill growth across QA disciplines"
            right={<GraduationCap className="h-4 w-4 text-violet-500" />}>
            <div className="space-y-3">
              {derived.skills.map((s) => (
                <div key={s.name}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-foreground">{s.name}</span>
                    <span className="tabular-nums" style={{ color: s.color }}>{s.value}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${s.value}%`, background: `linear-gradient(90deg, ${s.color}, ${s.color}aa)`, boxShadow: `0 0 10px ${s.color}66` }} />
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section tint="amber" title="Time Saved Analytics" subtitle="AI vs manual estimate"
            right={<Timer className="h-4 w-4 text-amber-500" />}>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl border border-white/40 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-md p-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Manual estimate</div>
                <div className="text-xl font-semibold mt-1 tabular-nums">{formatNumber(derived.hoursSaved * 4)}h</div>
              </div>
              <div className="rounded-xl border border-white/40 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-md p-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">With TestZone</div>
                <div className="text-xl font-semibold mt-1 tabular-nums">{formatNumber(derived.hoursSaved)}h</div>
              </div>
              <div className="rounded-xl p-4 text-white" style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6,#06B6D4)' }}>
                <div className="text-[10px] uppercase tracking-wider text-white/90">You saved</div>
                <div className="text-xl font-semibold mt-1 tabular-nums">{formatNumber(derived.hoursSaved * 3)}h</div>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Estimated at {MINUTES_SAVED_PER_AI_ACTION} minutes per AI-assisted action — adjusts as you continue using TestZone.
            </p>
          </Section>
        </div>

        {/* ============= ACHIEVEMENTS ============= */}
        <Section tint="amber" title="Achievements" subtitle="Milestones unlocked through your TestZone journey"
          right={<Trophy className="h-4 w-4 text-amber-500" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {derived.achievements.map((a) => {
              const pct = Math.min(100, Math.round((a.progress / a.goal) * 100));
              return (
                <div key={a.id}
                  className="rounded-xl p-4 border border-white/40 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-md transition-all hover:-translate-y-px"
                  style={a.unlocked ? { boxShadow: `0 0 0 1px ${a.color}55, 0 18px 40px -18px ${a.color}88` } : undefined}>
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg p-2 text-white" style={{ background: a.unlocked ? `linear-gradient(135deg, ${a.color}, ${a.color}cc)` : 'hsl(var(--muted))', color: a.unlocked ? '#fff' : 'hsl(var(--muted-foreground))' }}>
                      <a.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground">{a.label}</div>
                      <div className="text-xs text-muted-foreground">{a.desc}</div>
                    </div>
                    {a.unlocked && (
                      <Badge className="rounded-full text-[10px] text-white border-0" style={{ background: a.color }}>Unlocked</Badge>
                    )}
                  </div>
                  <div className="mt-3">
                    <div className="h-1 rounded-full bg-muted/60 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${a.color}, ${a.color}aa)` }} />
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground tabular-nums text-right">
                      {formatNumber(a.progress)} / {formatNumber(a.goal)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* ============= ACTIVITY TIMELINE ============= */}
        <Section tint="blue" title="AI Activity Timeline" subtitle="Your most recent actions across TestZone"
          right={<Activity className="h-4 w-4 text-blue-500" />}>
          {recent.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No activity yet — open any module and your timeline will start populating instantly.
            </div>
          ) : (
            <ol className="relative border-l border-border/60 ml-3">
              {recent.slice(0, 20).map((e) => {
                const c = moduleColor(e.module);
                return (
                  <li key={e.id} className="ml-4 pb-4 last:pb-0">
                    <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-background"
                      style={{ background: c, boxShadow: `0 0 10px ${c}aa` }} />
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
                            } catch { return e.created_at; }
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
                );
              })}
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
