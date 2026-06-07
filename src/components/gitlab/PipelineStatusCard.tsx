import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';
import type { GitLabPipelineRun } from '@/types/gitlab';

interface Props {
  run: GitLabPipelineRun;
  onRerun?: (run: GitLabPipelineRun) => void;
}

const statusMeta = (s: GitLabPipelineRun['status']) => {
  switch (s) {
    case 'success': return { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Completed Successfully', emoji: '✅' };
    case 'failed': return { icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-500/10', label: 'Failed', emoji: '❌' };
    case 'running': return { icon: Loader2, color: 'text-amber-500 animate-spin', bg: 'bg-amber-500/10', label: 'In Progress', emoji: '🟡' };
    case 'canceled': return { icon: XCircle, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Canceled', emoji: '⚪' };
    case 'skipped': return { icon: XCircle, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Skipped', emoji: '⚪' };
    default: return { icon: Clock, color: 'text-sky-500', bg: 'bg-sky-500/10', label: 'Pending', emoji: '🕒' };
  }
};

const PipelineStatusCard: React.FC<Props> = ({ run, onRerun }) => {
  const meta = statusMeta(run.status);
  const Icon = meta.icon;
  const duration = run.duration_seconds ? `${Math.round(run.duration_seconds / 60)} min` : '—';

  return (
    <Card className="p-4 bg-card/70 backdrop-blur-sm border border-border/60">
      <div className="flex items-start gap-3">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${meta.bg}`}>
          <Icon className={`h-4 w-4 ${meta.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-semibold">{meta.emoji} {run.branch}</span>
            <span className="text-xs text-muted-foreground">Pipeline #{run.pipeline_id}</span>
          </div>
          <div className="mt-1 text-sm text-muted-foreground">{meta.label}</div>

          {run.status === 'success' && (
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              <Stat label="Duration" value={duration} />
              <Stat label="Passed" value={String(run.stats?.passed ?? '—')} />
              <Stat label="Failed" value={String(run.stats?.failed ?? '—')} />
            </div>
          )}
          {run.status === 'failed' && (
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              <Stat label="Duration" value={duration} />
              <Stat label="Failed" value={String(run.stats?.failed ?? '?')} />
              <Stat label="Passed" value={String(run.stats?.passed ?? '?')} />
            </div>
          )}

          <div className="mt-3 flex gap-2 flex-wrap">
            {run.web_url && (
              <Button asChild size="sm" variant="outline" className="h-8 gap-1.5">
                <a href={run.web_url} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" /> View in GitLab
                </a>
              </Button>
            )}
            {onRerun && (run.status === 'success' || run.status === 'failed') && (
              <Button size="sm" variant="ghost" className="h-8" onClick={() => onRerun(run)}>
                Re-run
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-md bg-muted/40 px-2 py-1.5">
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="font-semibold">{value}</div>
  </div>
);

export default PipelineStatusCard;
