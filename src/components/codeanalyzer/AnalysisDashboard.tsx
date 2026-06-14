import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Shield, Zap, Bug, Wrench, Activity, BookOpen, TrendingUp, Sparkles, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sanitizeText, sanitizeStringArray } from '@/lib/sanitizeText';
import type { AnalysisResult } from '@/types/codeAnalyzer';
import ScoreRing from './ScoreRing';
import AIInsightsPanel from './AIInsightsPanel';

interface Props { result: AnalysisResult }

const scoreColor = (n: number) =>
  n >= 85 ? 'text-emerald-500' : n >= 70 ? 'text-amber-500' : n >= 50 ? 'text-orange-500' : 'text-rose-500';

const MetricCard: React.FC<{ label: string; value: number; icon: React.ReactNode; tint: string }> = ({ label, value, icon, tint }) => (
  <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-4 hca-rise hca-glass-hover">
    <div className={`absolute -top-10 -right-10 h-32 w-32 rounded-full blur-3xl opacity-40 ${tint}`} />
    <div className="relative flex items-center gap-3">
      <ScoreRing value={value} size={64} stroke={6} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
          {icon}{label}
        </div>
        <div className={cn('text-xl font-semibold tabular-nums', scoreColor(value))}>{value}<span className="text-xs text-muted-foreground font-normal"> / 100</span></div>
      </div>
    </div>
  </div>
);

const SeverityTile: React.FC<{ label: string; value: number; tone: string; ring: string }> = ({ label, value, tone, ring }) => (
  <div className={cn('relative overflow-hidden rounded-2xl border p-4 backdrop-blur-xl hca-rise hca-glass-hover', tone)}>
    <div className={cn('absolute -top-8 -right-8 h-24 w-24 rounded-full blur-2xl opacity-50', ring)} />
    <div className="relative">
      <div className="text-3xl font-semibold tabular-nums">{value}</div>
      <div className="text-[11px] uppercase tracking-wider mt-1 opacity-80">{label}</div>
    </div>
  </div>
);

const AnalysisDashboard: React.FC<Props> = ({ result }) => {
  const sev = result.sevCounts;
  const stability = result.automationStability;
  const riskColor = stability.risk === 'low' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
    : stability.risk === 'medium' ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
    : 'bg-rose-500/10 text-rose-600 border-rose-500/30';

  return (
    <div className="space-y-5">
      {/* Hero score + summary */}
      <section className="hca-glass hca-glass-hover hca-rise p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row gap-6 items-center">
          <div className="flex items-center gap-6">
            <ScoreRing value={result.overallScore} label="Overall" size={156} stroke={10} />
            <ScoreRing value={stability.score} label="Stability" size={120} stroke={8} />
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full px-3">{result.language}</Badge>
              {result.framework && <Badge variant="outline" className="rounded-full px-3">{result.framework}</Badge>}
              <Badge className={cn('border rounded-full px-3', riskColor)}>Risk · {stability.risk.toUpperCase()}</Badge>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{sanitizeText(result.summary)}</p>
            {stability.reasons?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {sanitizeStringArray(stability.reasons).map((r, i) => (
                  <span key={i} className="hca-chip text-amber-600 dark:text-amber-400"><ChevronRight className="h-3 w-3" />{r}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Severity tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SeverityTile label="Critical" value={sev.critical} tone="border-rose-500/25 bg-rose-500/5 text-rose-600 dark:text-rose-400" ring="bg-rose-500/40" />
        <SeverityTile label="High"     value={sev.high}     tone="border-orange-500/25 bg-orange-500/5 text-orange-600 dark:text-orange-400" ring="bg-orange-500/40" />
        <SeverityTile label="Medium"   value={sev.medium}   tone="border-amber-500/25 bg-amber-500/5 text-amber-600 dark:text-amber-400" ring="bg-amber-500/40" />
        <SeverityTile label="Low"      value={sev.low}      tone="border-sky-500/25 bg-sky-500/5 text-sky-600 dark:text-sky-400" ring="bg-sky-500/40" />
      </div>

      {/* Subscore metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <MetricCard label="Readability"      value={result.subScores.readability}      icon={<BookOpen className="h-3 w-3" />} tint="bg-sky-500/50" />
        <MetricCard label="Maintainability"  value={result.subScores.maintainability}  icon={<Wrench className="h-3 w-3" />}   tint="bg-indigo-500/50" />
        <MetricCard label="Stability"        value={result.subScores.stability}        icon={<Activity className="h-3 w-3" />} tint="bg-emerald-500/50" />
        <MetricCard label="Performance"      value={result.subScores.performance}      icon={<Zap className="h-3 w-3" />}      tint="bg-amber-500/50" />
        <MetricCard label="Security"         value={result.subScores.security}         icon={<Shield className="h-3 w-3" />}   tint="bg-rose-500/50" />
        <MetricCard label="Automation BP"    value={result.subScores.automationBestPractice} icon={<Bug className="h-3 w-3" />} tint="bg-violet-500/50" />
        <MetricCard label="Scalability"      value={result.subScores.scalability}      icon={<TrendingUp className="h-3 w-3" />} tint="bg-teal-500/50" />
      </div>

      {/* AI Insights */}
      <AIInsightsPanel result={result} />

      {result.expectedImprovements?.length > 0 && (
        <section className="hca-glass hca-glass-hover hca-rise p-5">
          <div className="flex items-center gap-2 mb-3 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary" /> Expected Improvements
          </div>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {sanitizeStringArray(result.expectedImprovements).map((s, i) => (
              <li key={i} className="flex gap-2"><span className="text-primary mt-0.5">→</span>{s}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default AnalysisDashboard;
