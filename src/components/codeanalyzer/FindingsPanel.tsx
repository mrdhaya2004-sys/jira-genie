import React from 'react';
import { cn } from '@/lib/utils';
import type { CategoryFinding, Severity } from '@/types/codeAnalyzer';

const sevStyle: Record<Severity, string> = {
  critical: 'bg-rose-500/10 text-rose-600 border-rose-500/40 dark:text-rose-400',
  high:     'bg-orange-500/10 text-orange-600 border-orange-500/40 dark:text-orange-400',
  medium:   'bg-amber-500/10 text-amber-600 border-amber-500/40 dark:text-amber-400',
  low:      'bg-sky-500/10 text-sky-600 border-sky-500/40 dark:text-sky-400',
};

interface Props { title: string; emptyText: string; findings: CategoryFinding[]; icon: React.ReactNode }

const FindingsPanel: React.FC<Props> = ({ title, emptyText, findings, icon }) => {
  if (!findings || findings.length === 0) {
    return (
      <div className="hca-glass p-8 text-center text-sm text-muted-foreground hca-rise">
        <div className="inline-flex h-10 w-10 rounded-full bg-primary/10 items-center justify-center mb-2">{icon}</div>
        <div>{emptyText}</div>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2 px-1">{icon}{title}</h3>
      {findings.map((f, i) => {
        const sev = (f.severity || 'low') as Severity;
        const conf = typeof f.confidence === 'number' ? Math.round(f.confidence) : null;
        return (
          <div key={i} className="hca-glass hca-glass-hover hca-rise p-4 space-y-2" style={{ animationDelay: `${i * 40}ms` }}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn('hca-chip border', sevStyle[sev])}>{sev.toUpperCase()}</span>
              {f.line != null && <span className="hca-chip">Line {f.line}</span>}
              {conf !== null && <span className="hca-chip text-primary">{conf}% confidence</span>}
            </div>
            <h4 className="font-semibold text-sm">{f.title}</h4>
            {f.evidence && f.evidence.trim() && (
              <div className="rounded-xl border border-border/50 bg-muted/40 px-3 py-2 text-xs font-mono overflow-x-auto">
                <span className="text-[10px] font-sans uppercase tracking-wider text-muted-foreground mr-2">Evidence</span>
                <code>{f.evidence}</code>
              </div>
            )}
            <p className="text-sm text-muted-foreground leading-snug">{f.description}</p>
            {f.fix && (
              <div className="text-sm rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3 text-emerald-700 dark:text-emerald-400">
                <span className="font-medium">Fix: </span>{f.fix}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default FindingsPanel;
