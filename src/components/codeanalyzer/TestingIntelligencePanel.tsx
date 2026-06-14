import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Beaker, ListChecks, Sparkles, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AnalysisResult } from '@/types/codeAnalyzer';
import { sanitizeStringArray, sanitizeText } from '@/lib/sanitizeText';
import ScoreRing from './ScoreRing';

interface Props { result: AnalysisResult }

const TestingIntelligencePanel: React.FC<Props> = ({ result }) => {
  const ti = result.testingIntelligence;
  if (!ti) {
    return (
      <div className="hca-glass p-8 text-center text-sm text-muted-foreground hca-rise">
        <Beaker className="h-5 w-5 mx-auto mb-2 text-primary" />
        Testing intelligence will appear after the next analysis.
      </div>
    );
  }
  const cats = sanitizeStringArray(ti.categories);
  const missing = sanitizeStringArray(ti.missingScenarios);
  const recs = sanitizeStringArray(ti.recommendedTestCases);
  const a = ti.automationScores;

  return (
    <section className="space-y-4">
      <div className="hca-glass hca-glass-hover hca-rise p-5">
        <header className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Beaker className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Testing Intelligence</h3>
          </div>
          <ScoreRing value={Number(ti.coverageScore) || 0} label="Coverage" size={72} stroke={6} />
        </header>

        {cats.length > 0 && (
          <div className="mb-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Testing Categories Detected</div>
            <div className="flex flex-wrap gap-1.5">
              {cats.map((c, i) => <Badge key={i} variant="secondary" className="rounded-full px-3">{c}</Badge>)}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-500" /> Missing Scenarios
            </div>
            {missing.length === 0
              ? <p className="text-sm text-muted-foreground">None detected.</p>
              : <ul className="space-y-1 text-sm">{missing.map((m, i) => <li key={i} className="flex gap-2 text-amber-700 dark:text-amber-400"><span>!</span>{m}</li>)}</ul>
            }
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <ListChecks className="h-3.5 w-3.5 text-emerald-500" /> Recommended Test Cases
            </div>
            {recs.length === 0
              ? <p className="text-sm text-muted-foreground">No additional tests recommended.</p>
              : <ul className="space-y-1 text-sm">{recs.map((m, i) => <li key={i} className="flex gap-2"><span className="text-emerald-500">✓</span>{m}</li>)}</ul>
            }
          </div>
        </div>
      </div>

      {a && (
        <div className="hca-glass hca-glass-hover hca-rise p-5">
          <header className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Automation Quality</h3>
          </header>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ScoreCell label="Locator Quality" value={a.locatorQuality} />
            <ScoreCell label="Wait Strategy" value={a.waitStrategy} />
            <ScoreCell label="Framework Maturity" value={a.frameworkMaturity} />
            <ScoreCell label="Stability" value={a.automationStability} />
          </div>
          {a.flakyTestRisk && (
            <div className={cn('mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs border',
              a.flakyTestRisk === 'low' ? 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10'
              : a.flakyTestRisk === 'medium' ? 'border-amber-500/30 text-amber-600 bg-amber-500/10'
              : 'border-rose-500/30 text-rose-600 bg-rose-500/10')}>
              Flaky Test Risk · {sanitizeText(a.flakyTestRisk).toUpperCase()}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

const ScoreCell: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="rounded-2xl border border-border/50 bg-card/60 p-3 flex items-center gap-3">
    <ScoreRing value={Number(value) || 0} size={56} stroke={5} />
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{Number(value) || 0}<span className="text-xs text-muted-foreground font-normal">/100</span></div>
    </div>
  </div>
);

export default TestingIntelligencePanel;
