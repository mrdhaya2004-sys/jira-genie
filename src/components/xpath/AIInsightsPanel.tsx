import React, { useMemo } from 'react';
import {
  Activity, AlertTriangle, Shield, Zap, Wrench, Sparkles, TrendingUp,
} from 'lucide-react';
import type { ElementAnalysis, XPathChatMessage } from '@/types/xpath';

interface AIInsightsPanelProps {
  messages: XPathChatMessage[];
}

type Scored = {
  el: ElementAnalysis;
  complexity: number;
  stability: number;
  flakiness: number;
  performance: number;
  maintain: number;
};

type MetricKey = 'complexity' | 'stability' | 'flakiness' | 'performance' | 'maintain';

interface MetricTheme {
  key: MetricKey;
  label: string;
  icon: React.ReactNode;
  gradient: string;      // card gradient (subtle bg)
  barGradient: string;   // progress fill gradient
  glow: string;          // hover glow rgba
  solid: string;         // text/accent color
  soft: string;          // soft skeleton bg
  invert?: boolean;      // higher = worse
  statusFor: (v: number) => { label: string; color: string };
}

const M: Record<MetricKey, MetricTheme> = {
  complexity: {
    key: 'complexity',
    label: 'Complexity',
    icon: <Activity className="h-4 w-4" />,
    gradient: 'linear-gradient(135deg, rgba(59,130,246,0.22), rgba(96,165,250,0.10))',
    barGradient: 'linear-gradient(135deg, #3B82F6, #60A5FA)',
    glow: 'rgba(59,130,246,0.45)',
    solid: '#60A5FA',
    soft: 'linear-gradient(135deg, rgba(59,130,246,0.18), rgba(96,165,250,0.08))',
    invert: true,
    statusFor: (v) =>
      v < 35 ? { label: 'Low', color: '#60A5FA' } :
      v < 65 ? { label: 'Medium', color: '#FB923C' } :
               { label: 'High', color: '#F87171' },
  },
  stability: {
    key: 'stability',
    label: 'Stability',
    icon: <Shield className="h-4 w-4" />,
    gradient: 'linear-gradient(135deg, rgba(16,185,129,0.22), rgba(52,211,153,0.10))',
    barGradient: 'linear-gradient(135deg, #10B981, #34D399)',
    glow: 'rgba(16,185,129,0.45)',
    solid: '#34D399',
    soft: 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(52,211,153,0.08))',
    statusFor: (v) =>
      v >= 90 ? { label: 'Excellent', color: '#34D399' } :
      v >= 70 ? { label: 'Good', color: '#34D399' } :
                { label: 'Risk', color: '#F87171' },
  },
  flakiness: {
    key: 'flakiness',
    label: 'Flakiness',
    icon: <AlertTriangle className="h-4 w-4" />,
    gradient: 'linear-gradient(135deg, rgba(239,68,68,0.22), rgba(248,113,113,0.10))',
    barGradient: 'linear-gradient(135deg, #EF4444, #F87171)',
    glow: 'rgba(239,68,68,0.45)',
    solid: '#F87171',
    soft: 'linear-gradient(135deg, rgba(239,68,68,0.18), rgba(248,113,113,0.08))',
    invert: true,
    statusFor: (v) =>
      v < 20 ? { label: 'Low Risk', color: '#60A5FA' } :
      v < 50 ? { label: 'Medium Risk', color: '#FB923C' } :
               { label: 'High Risk', color: '#F87171' },
  },
  performance: {
    key: 'performance',
    label: 'Performance',
    icon: <Zap className="h-4 w-4" />,
    gradient: 'linear-gradient(135deg, rgba(6,182,212,0.22), rgba(34,211,238,0.10))',
    barGradient: 'linear-gradient(135deg, #06B6D4, #22D3EE)',
    glow: 'rgba(6,182,212,0.45)',
    solid: '#22D3EE',
    soft: 'linear-gradient(135deg, rgba(6,182,212,0.18), rgba(34,211,238,0.08))',
    statusFor: (v) =>
      v >= 75 ? { label: 'Fast', color: '#22D3EE' } :
      v >= 50 ? { label: 'Average', color: '#FB923C' } :
                { label: 'Slow', color: '#F87171' },
  },
  maintain: {
    key: 'maintain',
    label: 'Maintainability',
    icon: <Wrench className="h-4 w-4" />,
    gradient: 'linear-gradient(135deg, rgba(139,92,246,0.22), rgba(167,139,250,0.10))',
    barGradient: 'linear-gradient(135deg, #8B5CF6, #A78BFA)',
    glow: 'rgba(139,92,246,0.45)',
    solid: '#A78BFA',
    soft: 'linear-gradient(135deg, rgba(139,92,246,0.18), rgba(167,139,250,0.08))',
    statusFor: (v) =>
      v >= 75 ? { label: 'Excellent', color: '#A78BFA' } :
      v >= 50 ? { label: 'Good', color: '#A78BFA' } :
                { label: 'Poor', color: '#F87171' },
  },
};

const ORDER: MetricKey[] = ['complexity', 'stability', 'flakiness', 'performance', 'maintain'];

// ---- Scoring heuristics ----
function scoreElement(el: ElementAnalysis): Scored {
  const primary = el.locators?.primary_xpath || '';
  const absolute = el.locators?.absolute_xpath || '';
  const hasId = /@id=|resource-id|#[\w-]+/.test(primary) || !!el.locators?.accessibility_id;
  const hasTestId = /data-testid|testID|accessibility_identifier/.test(primary);
  const depth = (absolute.match(/\//g) || []).length;
  const predicates = (primary.match(/\[/g) || []).length;
  const usesIndex = /\[\d+\]/.test(primary);
  const usesText = /text\(\)|contains\(/.test(primary);

  const complexity = Math.min(100, depth * 6 + predicates * 8 + (usesIndex ? 15 : 0));
  const stabilityBase = el.stability === 'high' ? 90 : el.stability === 'medium' ? 65 : 40;
  const stability = Math.min(100, stabilityBase + (hasId ? 6 : 0) + (hasTestId ? 4 : 0) - (usesIndex ? 12 : 0));
  const uniq = typeof el.uniqueness === 'number' ? el.uniqueness : 0.8;
  const flakiness = Math.min(100, (usesIndex ? 45 : 0) + (usesText ? 20 : 0) + (1 - uniq) * 40 + (predicates > 3 ? 10 : 0));
  const performance = Math.max(20, 100 - depth * 4 - predicates * 3 + (hasId ? 10 : 0));
  const conf = typeof el.confidence === 'number' ? el.confidence : 0.85;
  const maintain = Math.round(
    Math.max(0, Math.min(100, conf * 60 + (hasTestId ? 15 : 0) + (hasId ? 15 : 0) - (usesIndex ? 15 : 0) - complexity * 0.1))
  );

  return {
    el,
    complexity,
    stability,
    flakiness: Math.round(flakiness),
    performance: Math.round(performance),
    maintain,
  };
}

const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({ messages }) => {
  const scored = useMemo<Scored[]>(() => {
    const els: ElementAnalysis[] = [];
    for (const m of messages) {
      if (m.type === 'xpath_structured' && m.analysis?.elements?.length) els.push(...m.analysis.elements);
    }
    return els.map(scoreElement);
  }, [messages]);

  const hasData = scored.length > 0;

  const avg = (key: MetricKey) =>
    hasData ? Math.round(scored.reduce((s, x) => s + (x[key] as number), 0) / scored.length) : 0;

  const values: Record<MetricKey, number> = {
    complexity: avg('complexity'),
    stability: avg('stability'),
    flakiness: avg('flakiness'),
    performance: avg('performance'),
    maintain: avg('maintain'),
  };

  return (
    <div className="glass-card rounded-3xl p-5 sm:p-6 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full bg-gradient-to-br from-[hsl(217_91%_60%/0.25)] to-[hsl(262_83%_65%/0.15)] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-gradient-to-br from-[hsl(160_84%_45%/0.2)] to-[hsl(189_94%_50%/0.15)] blur-3xl" />

      <div className="relative flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] blur-md opacity-70" />
            <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight text-foreground">AI Insights</h3>
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium mt-0.5">
              {hasData ? `${scored.length} locator${scored.length > 1 ? 's' : ''} analyzed` : 'Waiting for XPath analysis…'}
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          <span className="text-[10px] font-bold tracking-wider text-emerald-500 uppercase">Live</span>
        </div>
      </div>

      {/* Metric cards — equal-height 5-col grid */}
      <div className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5 mb-5 auto-rows-fr">
        {ORDER.map((k) => (
          <MetricCard key={k} theme={M[k]} value={values[k]} hasData={hasData} />
        ))}
      </div>

      {/* Per-locator panel */}
      <div className="relative rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-[#60A5FA]" />
            <h4 className="text-xs font-semibold tracking-[0.14em] uppercase text-muted-foreground">Per-Locator Scores</h4>
          </div>
          {hasData && (
            <span className="text-[10px] font-medium text-muted-foreground/80">
              {scored.length} element{scored.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {hasData ? (
          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
            <div className="grid grid-cols-12 items-center gap-2 pb-1.5 border-b border-white/10 text-[9px] uppercase tracking-[0.14em] text-muted-foreground/80 font-semibold">
              <div className="col-span-4">Element</div>
              <div className="col-span-2">Stable</div>
              <div className="col-span-2">Flaky</div>
              <div className="col-span-2">Perf</div>
              <div className="col-span-2">Maint</div>
            </div>
            {scored.slice(0, 8).map((s, i) => (
              <div key={i} className="grid grid-cols-12 items-center gap-2">
                <div className="col-span-4 truncate text-[11px] font-medium text-foreground/90" title={s.el.element_name}>
                  {s.el.element_name || s.el.tag}
                </div>
                <div className="col-span-2"><Bar value={s.stability} theme={M.stability} /></div>
                <div className="col-span-2"><Bar value={s.flakiness} theme={M.flakiness} /></div>
                <div className="col-span-2"><Bar value={s.performance} theme={M.performance} /></div>
                <div className="col-span-2"><Bar value={s.maintain} theme={M.maintain} /></div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyLocatorState />
        )}
      </div>


      <style>{`
        @keyframes ih-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes ih-bar-fill {
          from { width: 0%; }
        }
        .ih-metric-card {
          background: rgba(255,255,255,0.08);
          backdrop-filter: blur(25px);
          -webkit-backdrop-filter: blur(25px);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.15);
          transition: transform .35s cubic-bezier(.2,.8,.2,1), box-shadow .35s ease, border-color .35s ease;
        }
        .ih-metric-card:hover {
          transform: translateY(-3px) scale(1.02);
        }
        .ih-shimmer::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
          animation: ih-shimmer 1.8s infinite;
        }
        .ih-bar-fill {
          animation: ih-bar-fill .8s ease-out;
        }
      `}</style>
    </div>
  );
};

// ---------- Metric card ----------
const MetricCard: React.FC<{ theme: MetricTheme; value: number; hasData: boolean }> = ({ theme, value, hasData }) => {
  const status = hasData ? theme.statusFor(value) : { label: '—', color: 'rgba(255,255,255,0.5)' };
  const barValue = hasData ? Math.max(4, Math.min(100, value)) : 0;

  return (
    <div
      className="ih-metric-card relative overflow-hidden p-3.5 group"
      style={{
        ['--glow' as any]: theme.glow,
        borderColor: `${theme.solid}40`,
        boxShadow: `0 10px 30px rgba(0,0,0,0.12), 0 0 0 1px ${theme.solid}22`,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          `0 14px 36px rgba(0,0,0,0.22), 0 0 0 1px ${theme.glow}, 0 0 32px ${theme.glow}`;
        (e.currentTarget as HTMLDivElement).style.borderColor = theme.glow;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 10px 30px rgba(0,0,0,0.12), 0 0 0 1px ${theme.solid}22`;
        (e.currentTarget as HTMLDivElement).style.borderColor = `${theme.solid}40`;
      }}
    >
      {/* colored gradient wash */}
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{ background: hasData ? theme.gradient : theme.soft }}
      />
      {/* corner glow */}
      <div
        className="pointer-events-none absolute -top-10 -right-10 h-24 w-24 rounded-full blur-2xl opacity-70"
        style={{ background: theme.barGradient }}
      />

      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <div
            className="h-8 w-8 rounded-xl flex items-center justify-center text-white shadow-lg"
            style={{ background: theme.barGradient, boxShadow: `0 6px 18px ${theme.glow}` }}
          >
            {theme.icon}
          </div>
          {hasData ? (
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{
                color: status.color,
                background: `${status.color}1A`,
                border: `1px solid ${status.color}55`,
              }}
            >
              {status.label}
            </span>
          ) : (
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{
                color: theme.solid,
                background: `${theme.solid}1A`,
                border: `1px solid ${theme.solid}55`,
              }}
            >
              Idle
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-1">
          <span
            className="text-2xl font-bold tabular-nums"
            style={{ color: hasData ? theme.solid : 'rgba(255,255,255,0.55)' }}
          >
            {hasData ? value : '—'}
          </span>
          {hasData && <span className="text-xs font-semibold text-muted-foreground">%</span>}
        </div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-0.5">
          {theme.label}
        </div>

        {/* progress bar */}
        <div
          className="relative mt-2.5 overflow-hidden"
          style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.10)' }}
        >
          {hasData ? (
            <div
              className="ih-bar-fill h-full rounded-full"
              style={{
                width: `${barValue}%`,
                background: theme.barGradient,
                boxShadow: `0 0 12px ${theme.glow}`,
              }}
            />
          ) : (
            <div className="ih-shimmer absolute inset-0 rounded-full" style={{ background: theme.soft }} />
          )}
        </div>
      </div>
    </div>
  );
};

// ---------- Per-locator bar ----------
const Bar: React.FC<{ value: number; theme: MetricTheme }> = ({ value, theme }) => (
  <div className="relative h-2 rounded-full bg-white/10 overflow-hidden">
    <div
      className="h-full rounded-full transition-all"
      style={{
        width: `${Math.max(4, Math.min(100, value))}%`,
        background: theme.barGradient,
        boxShadow: `0 0 10px ${theme.glow}`,
      }}
    />
    <span className="absolute -top-4 right-0 text-[9px] font-semibold tabular-nums text-muted-foreground">{value}</span>
  </div>
);

// ---------- Empty state ----------
const EmptyLocatorState: React.FC = () => (
  <div className="relative flex flex-col items-center justify-center py-8 px-4 text-center">
    <div className="relative mb-4">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#3B82F6]/40 to-[#8B5CF6]/40 blur-xl" />
      <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-[#3B82F6]/15 to-[#8B5CF6]/15 border border-white/15 backdrop-blur-xl flex items-center justify-center">
        <TrendingUp className="h-6 w-6 text-[#60A5FA]" />
      </div>
    </div>
    <p className="text-sm font-semibold text-foreground/90 mb-1">Generate a locator to see analytics</p>
    <p className="text-xs text-muted-foreground max-w-sm">
      Per-element stability, flakiness, performance, and maintainability scores will appear here after your first XPath analysis.
    </p>
    {/* Animated placeholder bars */}
    <div className="mt-5 w-full max-w-md space-y-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="grid grid-cols-12 items-center gap-2">
          <div className="col-span-4 h-2 rounded-full bg-white/8 overflow-hidden relative">
            <div className="ih-shimmer absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(59,130,246,0.12), rgba(139,92,246,0.12))' }} />
          </div>
          {[M.stability, M.flakiness, M.performance, M.maintain].map((t, j) => (
            <div key={j} className="col-span-2 h-2 rounded-full bg-white/8 overflow-hidden relative">
              <div className="ih-shimmer absolute inset-0" style={{ background: t.soft }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

export default AIInsightsPanel;
