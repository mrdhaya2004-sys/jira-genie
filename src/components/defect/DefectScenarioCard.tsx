import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertCircle, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DefectScenario } from '@/types/defectAnalyzer';

const STATUS_META: Record<DefectScenario['status'], { label: string; icon: React.ElementType; cls: string }> = {
  passed: { label: 'Passed', icon: CheckCircle2, cls: 'bg-success/15 text-success border-success/40' },
  failed: { label: 'Failed', icon: XCircle, cls: 'bg-destructive/15 text-destructive border-destructive/40' },
  flaky: { label: 'Flaky', icon: RefreshCcw, cls: 'bg-warning/15 text-warning border-warning/40' },
  skipped: { label: 'Skipped', icon: AlertCircle, cls: 'bg-muted/30 text-muted-foreground border-border' },
  unknown: { label: 'Unknown', icon: AlertCircle, cls: 'bg-muted/30 text-muted-foreground border-border' },
};

const DefectScenarioCard: React.FC<{ scenario: DefectScenario }> = ({ scenario }) => {
  const meta = STATUS_META[scenario.status] || STATUS_META.unknown;
  const Icon = meta.icon;

  return (
    <Card className="glass-card overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-semibold truncate">{scenario.name}</h4>
              {scenario.isFlaky && scenario.status !== 'flaky' && (
                <Badge variant="outline" className="text-[10px] border-warning/40 text-warning">
                  Flaky
                </Badge>
              )}
            </div>
            {scenario.module && (
              <p className="text-[11px] text-muted-foreground mt-0.5">📦 {scenario.module}</p>
            )}
          </div>
          <Badge variant="outline" className={cn('shrink-0 gap-1', meta.cls)}>
            <Icon className="h-3 w-3" />
            {meta.label}
          </Badge>
        </div>

        {scenario.failureReason && (
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Failure reason
            </p>
            <p className="text-xs text-foreground/90">{scenario.failureReason}</p>
          </div>
        )}

        {scenario.rootCause && (
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Root cause
            </p>
            <p className="text-xs text-foreground/90">{scenario.rootCause}</p>
          </div>
        )}

        {scenario.suggestedFix && (
          <div className="space-y-1 rounded-lg bg-primary/5 border border-primary/20 p-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
              Suggested fix
            </p>
            <p className="text-xs text-foreground/90">{scenario.suggestedFix}</p>
          </div>
        )}

        {scenario.errorSnippet && (
          <pre className="text-[11px] bg-muted/40 backdrop-blur-sm border border-border/40 rounded-lg p-2 overflow-x-auto font-mono whitespace-pre-wrap break-all">
            {scenario.errorSnippet}
          </pre>
        )}

        {scenario.tags && scenario.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {scenario.tags.map((t) => (
              <Badge key={t} variant="secondary" className="text-[10px]">
                {t}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DefectScenarioCard;
