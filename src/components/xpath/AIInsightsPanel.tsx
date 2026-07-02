import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, RadialBarChart, RadialBar } from 'recharts';
import { Activity, AlertTriangle, Gauge, Wrench, Zap, TrendingUp, Sparkles } from 'lucide-react';
import type { ElementAnalysis, XPathChatMessage } from '@/types/xpath';

interface AIInsightsPanelProps {
  messages: XPathChatMessage[];
}

type Scored = {
  el: ElementAnalysis;
  complexity: number;   // 0..100 (higher = more complex)
  stability: number;    // 0..100 (higher = more stable)
  flakiness: number;    // 0..100 (higher = more risk)
  performance: number;  // 0..100 (higher = faster)
  maintain: number;     // 0..100 (higher = more maintainable)
};

// ---- Scoring heuristics (pure UI/visualization layer) ----
function scoreElement(el: ElementAnalysis): Scored {
  const primary = el.locators?.primary_xpath || '';
  const absolute = el.locators?.absolute_xpath || '';
  const hasId = /@id=|resource-id|#[\w-]+/.test(primary) || !!el.locators?.accessibility_id;
  const hasTestId = /data-testid|testID|accessibility_identifier/.test(primary);
  const depth = (absolute.match(/\//g) || []).length;
  const predicates = (primary.match(/\[/g) || []).length;
  const usesIndex = /\[\d+\]/.test(primary);
  const usesText = /text\(\)|contains\(/.test(primary);

  // Complexity: longer path + more predicates -> higher
  const complexity = Math.min(100, depth * 6 + predicates * 8 + (usesIndex ? 15 : 0));

  // Stability from AI + boosts
  const stabilityBase = el.stability === 'high' ? 90 : el.stability === 'medium' ? 65 : 40;
  const stability = Math.min(100, stabilityBase + (hasId ? 6 : 0) + (hasTestId ? 4 : 0) - (usesIndex ? 12 : 0));

  // Flakiness: index-only, text-based, low uniqueness
  const uniq = typeof el.uniqueness === 'number' ? el.uniqueness : 0.8;
  const flakiness = Math.min(100, (usesIndex ? 45 : 0) + (usesText ? 20 : 0) + (1 - uniq) * 40 + (predicates > 3 ? 10 : 0));

  // Performance: shorter, id-based queries are faster
  const performance = Math.max(20, 100 - depth * 4 - predicates * 3 + (hasId ? 10 : 0));

  // Maintainability: readable, id/testid based, low complexity, high confidence
  const conf = typeof el.confidence === 'number' ? el.confidence : 0.85;
  const maintain = Math.round(
    Math.max(0, Math.min(100, conf * 60 + (hasTestId ? 15 : 0) + (hasId ? 15 : 0) - (usesIndex ? 15 : 0) - complexity * 0.1))
  );

  return { el, complexity, stability, flakiness: Math.round(flakiness), performance: Math.round(performance), maintain };
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

  const avg = (key: keyof Omit<Scored, 'el'>) =>
    hasData ? Math.round(scored.reduce((s, x) => s + (x[key] as number), 0) / scored.length) : 0;

  const metrics = {
    complexity: avg('complexity'),
    stability: avg('stability'),
    flakiness: avg('flakiness'),
    performance: avg('performance'),
    maintain: avg('maintain'),
  };

  return (
    <div className="glass-card rounded-3xl p-4 sm:p-5 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full bg-gradient-to-br from-[hsl(217_91%_60%/0.25)] to-[hsl(262_83%_65%/0.15)] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-gradient-to-br from-[hsl(160_84%_45%/0.2)] to-[hsl(189_94%_50%/0.15)] blur-3xl" />

      <div className="relative flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[hsl(217_91%_60%)] to-[hsl(262_83%_65%)] blur-md opacity-70" />
            <div className="relative h-8 w-8 rounded-lg bg-gradient-to-br from-[hsl(217_91%_60%)] to-[hsl(262_83%_65%)] flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight">AI Insights</h3>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {hasData ? `${scored.length} locator${scored.length > 1 ? 's' : ''} analyzed` : 'Awaiting locators…'}
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          <span className="text-[10px] font-bold tracking-wider text-emerald-500 uppercase">Live</span>
        </div>
      </div>

      {/* Donut grid */}
      <div className="relative grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <Donut label="Complexity" value={metrics.complexity} tone="cyan" icon={<Activity className="h-3.5 w-3.5" />} invert />
        <Donut label="Stability" value={metrics.stability} tone="green" icon={<Gauge className="h-3.5 w-3.5" />} />
        <Donut label="Flakiness" value={metrics.flakiness} tone="rose" icon={<AlertTriangle className="h-3.5 w-3.5" />} invert />
        <Donut label="Performance" value={metrics.performance} tone="blue" icon={<Zap className="h-3.5 w-3.5" />} />
        <Donut label="Maintainability" value={metrics.maintain} tone="purple" icon={<Wrench className="h-3.5 w-3.5" />} />
      </div>

      {/* Progress bars per element */}
      <div className="relative rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md p-3 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-3.5 w-3.5 text-[hsl(217_91%_60%)]" />
          <h4 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">Per-Locator Scores</h4>
        </div>
        {hasData ? (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {scored.slice(0, 8).map((s, i) => (
              <div key={i} className="grid grid-cols-12 items-center gap-2">
                <div className="col-span-4 truncate text-[11px] font-medium" title={s.el.element_name}>
                  {s.el.element_name || s.el.tag}
                </div>
                <div className="col-span-2"><Bar value={s.stability} tone="green" /></div>
                <div className="col-span-2"><Bar value={s.flakiness} tone="rose" /></div>
                <div className="col-span-2"><Bar value={s.performance} tone="blue" /></div>
                <div className="col-span-2"><Bar value={s.maintain} tone="purple" /></div>
              </div>
            ))}
            <div className="grid grid-cols-12 items-center gap-2 pt-1 border-t border-white/10 text-[9px] uppercase tracking-wider text-muted-foreground">
              <div className="col-span-4">Element</div>
              <div className="col-span-2">Stable</div>
              <div className="col-span-2">Flaky</div>
              <div className="col-span-2">Perf</div>
              <div className="col-span-2">Maint</div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-3 text-center">Generate a locator to see per-element analytics.</p>
        )}
      </div>

      {/* Heatmap */}
      <div className="relative rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md p-3">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="h-3.5 w-3.5 text-[hsl(262_83%_65%)]" />
          <h4 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">Risk Heatmap</h4>
        </div>
        {hasData ? (
          <Heatmap scored={scored} />
        ) : (
          <p className="text-xs text-muted-foreground py-3 text-center">Heatmap will populate as you generate locators.</p>
        )}
      </div>
    </div>
  );
};

// ---------- Sub components ----------

type Tone = 'blue' | 'green' | 'purple' | 'cyan' | 'rose';
const toneHsl: Record<Tone, string> = {
  blue: 'hsl(217 91% 60%)',
  green: 'hsl(160 84% 45%)',
  purple: 'hsl(262 83% 65%)',
  cyan: 'hsl(189 94% 50%)',
  rose: 'hsl(349 89% 60%)',
};

const Donut: React.FC<{ label: string; value: number; tone: Tone; icon: React.ReactNode; invert?: boolean }> = ({
  label, value, tone, icon, invert,
}) => {
  const color = toneHsl[tone];
  const data = [{ name: label, value: Math.max(0, Math.min(100, value)) }, { name: 'rest', value: 100 - value }];
  const displayValue = value;
  const good = invert ? value < 40 : value >= 70;
  const bad = invert ? value > 70 : value < 40;
  const status = good ? 'Good' : bad ? 'Risk' : 'OK';

  return (
    <div className="relative rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md p-3 flex flex-col items-center justify-center transition-all hover:bg-white/10 hover:-translate-y-0.5">
      <div className="relative w-[92px] h-[92px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              <linearGradient id={`g-${label}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.95} />
                <stop offset="100%" stopColor={color} stopOpacity={0.55} />
              </linearGradient>
            </defs>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={30}
              outerRadius={44}
              startAngle={90}
              endAngle={-270}
              stroke="none"
              isAnimationActive
            >
              <Cell fill={`url(#g-${label})`} />
              <Cell fill="hsl(0 0% 100% / 0.08)" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] font-bold tabular-nums" style={{ color }}>{displayValue}%</span>
          <span className="text-[8px] uppercase tracking-wider text-muted-foreground">{status}</span>
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-1">
        <span style={{ color }}>{icon}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
    </div>
  );
};

const Bar: React.FC<{ value: number; tone: Tone }> = ({ value, tone }) => {
  const color = toneHsl[tone];
  return (
    <div className="relative h-2 rounded-full bg-white/10 overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{
          width: `${Math.max(4, Math.min(100, value))}%`,
          background: `linear-gradient(90deg, ${color}, ${color}99)`,
          boxShadow: `0 0 10px ${color}66`,
        }}
      />
      <span className="absolute -top-4 right-0 text-[9px] font-semibold tabular-nums text-muted-foreground">{value}</span>
    </div>
  );
};

const Heatmap: React.FC<{ scored: Scored[] }> = ({ scored }) => {
  const rows = [
    { key: 'complexity', label: 'Complexity', invert: true as const },
    { key: 'stability', label: 'Stability', invert: false as const },
    { key: 'flakiness', label: 'Flakiness', invert: true as const },
    { key: 'performance', label: 'Performance', invert: false as const },
    { key: 'maintain', label: 'Maintainability', invert: false as const },
  ];
  const cells = scored.slice(0, 12);

  const cellColor = (v: number, invert: boolean) => {
    const good = invert ? 100 - v : v; // 0..100 higher = better
    if (good >= 75) return 'hsl(160 84% 45%)';
    if (good >= 55) return 'hsl(189 94% 50%)';
    if (good >= 35) return 'hsl(45 96% 55%)';
    return 'hsl(349 89% 60%)';
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[420px]">
        <div className="grid gap-1" style={{ gridTemplateColumns: `120px repeat(${cells.length}, minmax(28px, 1fr))` }}>
          <div />
          {cells.map((s, i) => (
            <div key={i} className="text-[9px] text-center truncate text-muted-foreground" title={s.el.element_name}>
              {(s.el.element_name || s.el.tag || `#${i + 1}`).slice(0, 6)}
            </div>
          ))}
          {rows.map((row) => (
            <React.Fragment key={row.key}>
              <div className="text-[10px] font-semibold text-muted-foreground pr-2 flex items-center">{row.label}</div>
              {cells.map((s, i) => {
                const v = s[row.key as keyof Omit<Scored, 'el'>] as number;
                const bg = cellColor(v, row.invert);
                return (
                  <div
                    key={i}
                    title={`${row.label}: ${v}`}
                    className="h-7 rounded-md ring-1 ring-white/10 transition-transform hover:scale-110 flex items-center justify-center"
                    style={{ backgroundColor: `${bg}`, opacity: 0.35 + (v / 100) * 0.55 }}
                  >
                    <span className="text-[9px] font-bold text-white/90 tabular-nums">{v}</span>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
        <div className="flex items-center justify-end gap-2 mt-2 text-[9px] uppercase tracking-wider text-muted-foreground">
          <span>Low</span>
          <div className="h-2 w-24 rounded-full" style={{ background: 'linear-gradient(90deg, hsl(349 89% 60%), hsl(45 96% 55%), hsl(189 94% 50%), hsl(160 84% 45%))' }} />
          <span>High</span>
        </div>
      </div>
    </div>
  );
};

export default AIInsightsPanel;
