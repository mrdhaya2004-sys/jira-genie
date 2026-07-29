import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Sparkles, Wrench, BookOpen, ShieldAlert, TrendingUp, Activity } from 'lucide-react';
import type { DetectedProject } from './sampleProjects';
import { cn } from '@/lib/utils';

export interface FailureAnalysis {
  testName: string;
  rootCause: string;
  confidence: number;
  suggestion: string;
  patch: string;
  doc: string;
}

interface Props {
  project: DetectedProject | null;
  installedCount: number;
  failure: FailureAnalysis | null;
  onApplyPatch: () => void;
  dark?: boolean;
}

const StudioAIPanel: React.FC<Props> = ({ project, installedCount, failure, onApplyPatch, dark = false }) => {
  const card = dark
    ? 'border-white/10 bg-white/5'
    : 'border-slate-200/70 bg-white/80 backdrop-blur-xl shadow-[0_10px_40px_-20px_rgba(15,23,42,0.15)]';
  const chip = dark ? 'bg-white/5' : 'bg-slate-50 border border-slate-200/70';
  const muted = dark ? 'text-muted-foreground' : 'text-slate-500';

  if (!project) {
    return (
      <div className={cn('p-4 text-sm', muted)}>
        Import a project to unlock AI failure analysis, dependency insights, and project health scoring.
      </div>
    );
  }

  const scoreColor = dark
    ? (project.healthScore >= 85 ? 'text-emerald-400' : project.healthScore >= 70 ? 'text-amber-300' : 'text-rose-400')
    : (project.healthScore >= 85 ? 'text-emerald-600' : project.healthScore >= 70 ? 'text-amber-600' : 'text-rose-600');

  return (
    <div className="h-full overflow-y-auto p-3 space-y-3">
      {/* Health */}
      <Card className={cn('p-3', card)}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-[#2563EB] to-[#06B6D4] flex items-center justify-center">
              <Activity className="h-3.5 w-3.5 text-white" />
            </div>
            Framework Health
          </div>
          <div className={cn('text-2xl font-bold', scoreColor)}>{project.healthScore}<span className={cn('text-sm', muted)}>/100</span></div>
        </div>
        <Progress value={project.healthScore} className="h-1.5" />
        <div className="grid grid-cols-3 gap-2 mt-3 text-[11px]">
          <div className={cn('rounded-lg p-2', chip)}>
            <div className={muted}>Outdated</div>
            <div className={cn('font-semibold', dark ? 'text-amber-300' : 'text-amber-600')}>{project.outdated.length}</div>
          </div>
          <div className={cn('rounded-lg p-2', chip)}>
            <div className={muted}>CVEs</div>
            <div className={cn('font-semibold', dark ? 'text-rose-400' : 'text-rose-600')}>{project.vulnerabilities}</div>
          </div>
          <div className={cn('rounded-lg p-2', chip)}>
            <div className={muted}>Installed</div>
            <div className={cn('font-semibold', dark ? 'text-emerald-400' : 'text-emerald-600')}>{installedCount}/{project.missingComponents.length}</div>
          </div>
        </div>
      </Card>

      {/* AI Failure Analysis */}
      {failure && (
        <Card className={cn('p-3 border', dark ? 'border-rose-500/30 bg-rose-500/5' : 'border-rose-200 bg-gradient-to-br from-rose-50/80 to-white/80 backdrop-blur-xl')}>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center">
              <AlertTriangle className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="text-sm font-semibold">AI Failure Analysis</div>
            <Badge variant="outline" className={cn('ml-auto text-[10px]', dark ? 'border-rose-500/40 text-rose-300' : 'border-rose-300 text-rose-700 bg-rose-50')}>
              {failure.confidence}% confidence
            </Badge>
          </div>
          <div className={cn('text-xs mb-1', muted)}>Test</div>
          <div className="text-xs font-mono mb-2 break-all">{failure.testName}</div>

          <div className={cn('text-xs mb-1', muted)}>Root cause</div>
          <div className="text-sm mb-2">{failure.rootCause}</div>

          <div className={cn('text-xs mb-1', muted)}>Suggested fix</div>
          <div className="text-sm mb-2">{failure.suggestion}</div>

          <div className={cn('text-xs mb-1', muted)}>Patch</div>
          <pre className={cn(
            'text-[11px] font-mono rounded-md p-2 overflow-x-auto whitespace-pre-wrap border',
            dark ? 'bg-black/40 border-white/5 text-slate-200' : 'bg-white border-slate-200 text-slate-700'
          )}>{failure.patch}</pre>

          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={onApplyPatch} className="bg-gradient-to-r from-[#2563EB] to-[#06B6D4] text-white">
              <Wrench className="h-3.5 w-3.5 mr-1" /> Apply patch
            </Button>
            <Button size="sm" variant="outline"><BookOpen className="h-3.5 w-3.5 mr-1" /> Docs</Button>
          </div>
        </Card>
      )}

      {/* Outdated */}
      <Card className={cn('p-3', card)}>
        <div className="flex items-center gap-2 mb-2 text-sm font-medium">
          <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center">
            <TrendingUp className="h-3.5 w-3.5 text-white" />
          </div>
          Outdated dependencies
        </div>
        <div className="space-y-1.5">
          {project.outdated.map(d => (
            <div key={d.name} className="flex items-center justify-between text-xs">
              <span className="font-mono truncate">{d.name}</span>
              <div className="flex items-center gap-2 shrink-0">
                <span className={muted}>{d.current} → {d.latest}</span>
                <Badge variant="outline" className="text-[10px] capitalize">{d.severity}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Security */}
      <Card className={cn('p-3', card)}>
        <div className="flex items-center gap-2 mb-2 text-sm font-medium">
          <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center">
            <ShieldAlert className="h-3.5 w-3.5 text-white" />
          </div>
          Security
        </div>
        {project.vulnerabilities === 0 ? (
          <div className={cn('text-xs', dark ? 'text-emerald-400' : 'text-emerald-600')}>No known CVEs in current dependencies.</div>
        ) : (
          <div className={cn('text-xs', dark ? 'text-rose-300' : 'text-rose-600')}>
            {project.vulnerabilities} advisory finding(s) — run <span className="font-mono">Update deps</span> to review recommended pins.
          </div>
        )}
      </Card>

      {/* Suggestions */}
      <Card className={cn(
        'p-3 border',
        dark ? 'border-primary/30 bg-primary/5' : 'border-blue-200 bg-gradient-to-br from-blue-50/70 via-white/80 to-purple-50/60 backdrop-blur-xl'
      )}>
        <div className="flex items-center gap-2 mb-2 text-sm font-medium">
          <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-[#2563EB] via-[#06B6D4] to-[#8B5CF6] flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          AI suggestions
        </div>
        <ul className={cn('text-xs space-y-1.5', muted)}>
          <li>• Enable parallel execution in <span className="font-mono text-foreground">{project.buildTool.startsWith('Maven') ? 'surefire' : 'gradle'}</span> to cut regression time ~38%.</li>
          <li>• Introduce explicit waits — 3 sleeps detected across suite.</li>
          <li>• Add screenshot-on-failure listener for faster triage.</li>
          <li>• Move test data to <span className="font-mono text-foreground">testdata.csv</span> — 2 hard-coded values found.</li>
        </ul>
      </Card>
    </div>
  );
};

export default StudioAIPanel;
