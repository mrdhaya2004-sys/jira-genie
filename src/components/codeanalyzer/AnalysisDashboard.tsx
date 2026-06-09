import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Shield, Zap, Bug, Wrench, Activity, BookOpen, TrendingUp, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AnalysisResult } from '@/types/codeAnalyzer';

interface Props { result: AnalysisResult }

const scoreColor = (n: number) =>
  n >= 85 ? 'text-emerald-500' : n >= 70 ? 'text-amber-500' : n >= 50 ? 'text-orange-500' : 'text-rose-500';
const ringColor = (n: number) =>
  n >= 85 ? 'stroke-emerald-500' : n >= 70 ? 'stroke-amber-500' : n >= 50 ? 'stroke-orange-500' : 'stroke-rose-500';

const ScoreRing: React.FC<{ value: number; label: string; size?: number }> = ({ value, label, size = 120 }) => {
  const radius = size / 2 - 8;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (Math.max(0, Math.min(100, value)) / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={8} className="fill-none stroke-muted" />
          <circle
            cx={size / 2} cy={size / 2} r={radius} strokeWidth={8} strokeLinecap="round"
            className={cn('fill-none transition-all', ringColor(value))}
            strokeDasharray={circ} strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('text-2xl font-bold', scoreColor(value))}>{value}</span>
          <span className="text-[10px] text-muted-foreground">/ 100</span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground text-center">{label}</span>
    </div>
  );
};

const SubScoreBar: React.FC<{ label: string; value: number; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between text-xs">
      <span className="flex items-center gap-1.5 text-muted-foreground">{icon}{label}</span>
      <span className={cn('font-semibold', scoreColor(value))}>{value}%</span>
    </div>
    <Progress value={value} className="h-1.5" />
  </div>
);

const AnalysisDashboard: React.FC<Props> = ({ result }) => {
  const sev = result.sevCounts;
  const stability = result.automationStability;
  const riskColor = stability.risk === 'low' ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
    : stability.risk === 'medium' ? 'bg-amber-500/15 text-amber-600 border-amber-500/30'
    : 'bg-rose-500/15 text-rose-600 border-rose-500/30';

  return (
    <div className="space-y-4">
      <Card className="glass-effect border-border/60">
        <CardContent className="p-5">
          <div className="flex flex-col lg:flex-row gap-6 items-center">
            <div className="flex items-center gap-6">
              <ScoreRing value={result.overallScore} label="Overall Score" size={140} />
              <ScoreRing value={stability.score} label="Automation Stability" size={120} />
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{result.language}</Badge>
                {result.framework && <Badge variant="outline">{result.framework}</Badge>}
                <Badge className={cn('border', riskColor)}>Risk: {stability.risk.toUpperCase()}</Badge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{result.summary}</p>
              {stability.reasons?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {stability.reasons.map((r, i) => (
                    <Badge key={i} variant="outline" className="text-[10px]">⚠️ {r}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {([
          { label: 'Critical', value: sev.critical, color: 'text-rose-500 border-rose-500/30 bg-rose-500/10' },
          { label: 'High', value: sev.high, color: 'text-orange-500 border-orange-500/30 bg-orange-500/10' },
          { label: 'Medium', value: sev.medium, color: 'text-amber-500 border-amber-500/30 bg-amber-500/10' },
          { label: 'Low', value: sev.low, color: 'text-sky-500 border-sky-500/30 bg-sky-500/10' },
        ]).map((c) => (
          <Card key={c.label} className={cn('border', c.color)}>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold">{c.value}</div>
              <div className="text-xs uppercase tracking-wide mt-1">{c.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass-effect border-border/60">
        <CardContent className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
          <SubScoreBar label="Readability" value={result.subScores.readability} icon={<BookOpen className="h-3 w-3" />} />
          <SubScoreBar label="Maintainability" value={result.subScores.maintainability} icon={<Wrench className="h-3 w-3" />} />
          <SubScoreBar label="Stability" value={result.subScores.stability} icon={<Activity className="h-3 w-3" />} />
          <SubScoreBar label="Performance" value={result.subScores.performance} icon={<Zap className="h-3 w-3" />} />
          <SubScoreBar label="Security" value={result.subScores.security} icon={<Shield className="h-3 w-3" />} />
          <SubScoreBar label="Automation Best Practice" value={result.subScores.automationBestPractice} icon={<Bug className="h-3 w-3" />} />
          <SubScoreBar label="Scalability" value={result.subScores.scalability} icon={<TrendingUp className="h-3 w-3" />} />
        </CardContent>
      </Card>

      {result.expectedImprovements?.length > 0 && (
        <Card className="glass-effect border-border/60">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary" /> Expected Improvements
            </div>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {result.expectedImprovements.map((s, i) => (
                <li key={i} className="flex gap-2"><span className="text-primary">→</span>{s}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AnalysisDashboard;
