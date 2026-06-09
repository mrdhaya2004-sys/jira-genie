import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CategoryFinding, Severity } from '@/types/codeAnalyzer';

const sevStyle: Record<Severity, string> = {
  critical: 'bg-rose-500/15 text-rose-600 border-rose-500/40',
  high: 'bg-orange-500/15 text-orange-600 border-orange-500/40',
  medium: 'bg-amber-500/15 text-amber-600 border-amber-500/40',
  low: 'bg-sky-500/15 text-sky-600 border-sky-500/40',
};

interface Props { title: string; emptyText: string; findings: CategoryFinding[]; icon: React.ReactNode }

const FindingsPanel: React.FC<Props> = ({ title, emptyText, findings, icon }) => {
  if (!findings || findings.length === 0) {
    return (
      <Card className="border-border/60"><CardContent className="p-6 text-center text-sm text-muted-foreground">
        {icon}<div className="mt-2">{emptyText}</div>
      </CardContent></Card>
    );
  }
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">{icon}{title}</h3>
      {findings.map((f, i) => (
        <Card key={i} className="border-border/60"><CardContent className="p-4 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={cn('border', sevStyle[f.severity] || sevStyle.low)}>{(f.severity || 'low').toUpperCase()}</Badge>
            {f.line != null && <Badge variant="outline">Line {f.line}</Badge>}
          </div>
          <h4 className="font-medium text-sm">{f.title}</h4>
          <p className="text-sm text-muted-foreground">{f.description}</p>
          {f.fix && <div className="text-sm bg-emerald-500/5 border border-emerald-500/20 rounded-md p-2 text-emerald-700 dark:text-emerald-400"><span className="font-medium">Fix: </span>{f.fix}</div>}
        </CardContent></Card>
      ))}
    </div>
  );
};

export default FindingsPanel;
