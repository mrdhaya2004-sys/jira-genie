import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, RotateCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { GitLabPipelineRun } from '@/types/gitlab';

interface Props {
  runs: GitLabPipelineRun[];
  onRerun: (run: GitLabPipelineRun) => void;
}

const statusDot = (s: GitLabPipelineRun['status']) => {
  switch (s) {
    case 'success': return 'bg-emerald-500';
    case 'failed': return 'bg-rose-500';
    case 'running': return 'bg-amber-500 animate-pulse';
    case 'canceled':
    case 'skipped': return 'bg-muted-foreground';
    default: return 'bg-sky-500';
  }
};

const ExecutionHistoryPanel: React.FC<Props> = ({ runs, onRerun }) => {
  if (runs.length === 0) {
    return <div className="p-6 text-sm text-muted-foreground">No executions yet. Start one from the chat.</div>;
  }
  return (
    <div className="p-3 space-y-2">
      {runs.map((r) => (
        <Card key={r.id} className="p-3 flex items-center gap-3 bg-card/70">
          <span className={`h-2.5 w-2.5 rounded-full ${statusDot(r.status)}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="font-medium truncate">{r.branch}</span>
              <span className="text-xs text-muted-foreground">#{r.pipeline_id}</span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              {r.status} · {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
              {r.duration_seconds ? ` · ${Math.round(r.duration_seconds / 60)}m` : ''}
              {r.triggered_via === 'schedule' ? ' · scheduled' : ''}
            </div>
          </div>
          {r.web_url && (
            <Button asChild size="icon" variant="ghost" className="h-8 w-8">
              <a href={r.web_url} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
            </Button>
          )}
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onRerun(r)} title="Re-run">
            <RotateCw className="h-3.5 w-3.5" />
          </Button>
        </Card>
      ))}
    </div>
  );
};

export default ExecutionHistoryPanel;
