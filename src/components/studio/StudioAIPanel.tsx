import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Sparkles, Wrench, BookOpen, ShieldAlert, TrendingUp, Activity } from 'lucide-react';
import type { DetectedProject } from './sampleProjects';

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
}

const StudioAIPanel: React.FC<Props> = ({ project, installedCount, failure, onApplyPatch }) => {
  if (!project) {
    return (
      <div className="p-4 text-sm text-muted-foreground">Import a project to unlock AI failure analysis, dependency insights, and project health scoring.</div>
    );
  }

  const scoreColor =
    project.healthScore >= 85 ? 'text-emerald-400' :
    project.healthScore >= 70 ? 'text-amber-300' : 'text-rose-400';

  return (
    <div className="h-full overflow-y-auto p-3 space-y-3">
      {/* Health */}
      <Card className="p-3 border-white/10 bg-white/5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm font-medium"><Activity className="h-4 w-4 text-primary" /> Framework Health</div>
          <div className={`text-2xl font-bold ${scoreColor}`}>{project.healthScore}<span className="text-sm text-muted-foreground">/100</span></div>
        </div>
        <Progress value={project.healthScore} className="h-1.5" />
        <div className="grid grid-cols-3 gap-2 mt-3 text-[11px]">
          <div className="rounded-lg bg-white/5 p-2">
            <div className="text-muted-foreground">Outdated</div>
            <div className="font-semibold text-amber-300">{project.outdated.length}</div>
          </div>
          <div className="rounded-lg bg-white/5 p-2">
            <div className="text-muted-foreground">CVEs</div>
            <div className="font-semibold text-rose-400">{project.vulnerabilities}</div>
          </div>
          <div className="rounded-lg bg-white/5 p-2">
            <div className="text-muted-foreground">Installed</div>
            <div className="font-semibold text-emerald-400">{installedCount}/{project.missingComponents.length}</div>
          </div>
        </div>
      </Card>

      {/* AI Failure Analysis */}
      {failure && (
        <Card className="p-3 border-rose-500/30 bg-rose-500/5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-rose-400" />
            <div className="text-sm font-semibold">AI Failure Analysis</div>
            <Badge variant="outline" className="ml-auto text-[10px] border-rose-500/40 text-rose-300">
              {failure.confidence}% confidence
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground mb-1">Test</div>
          <div className="text-xs font-mono mb-2 break-all">{failure.testName}</div>

          <div className="text-xs text-muted-foreground mb-1">Root cause</div>
          <div className="text-sm mb-2">{failure.rootCause}</div>

          <div className="text-xs text-muted-foreground mb-1">Suggested fix</div>
          <div className="text-sm mb-2">{failure.suggestion}</div>

          <div className="text-xs text-muted-foreground mb-1">Patch</div>
          <pre className="text-[11px] font-mono bg-black/40 rounded-md p-2 overflow-x-auto whitespace-pre-wrap border border-white/5">{failure.patch}</pre>

          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={onApplyPatch}><Wrench className="h-3.5 w-3.5 mr-1" /> Apply patch</Button>
            <Button size="sm" variant="outline"><BookOpen className="h-3.5 w-3.5 mr-1" /> Docs</Button>
          </div>
        </Card>
      )}

      {/* Outdated */}
      <Card className="p-3 border-white/10 bg-white/5">
        <div className="flex items-center gap-2 mb-2 text-sm font-medium"><TrendingUp className="h-4 w-4 text-amber-300" /> Outdated dependencies</div>
        <div className="space-y-1.5">
          {project.outdated.map(d => (
            <div key={d.name} className="flex items-center justify-between text-xs">
              <span className="font-mono truncate">{d.name}</span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-muted-foreground">{d.current} → {d.latest}</span>
                <Badge variant="outline" className="text-[10px] capitalize">{d.severity}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Security */}
      <Card className="p-3 border-white/10 bg-white/5">
        <div className="flex items-center gap-2 mb-2 text-sm font-medium"><ShieldAlert className="h-4 w-4 text-rose-400" /> Security</div>
        {project.vulnerabilities === 0 ? (
          <div className="text-xs text-emerald-400">No known CVEs in current dependencies.</div>
        ) : (
          <div className="text-xs text-rose-300">{project.vulnerabilities} advisory finding(s) — run <span className="font-mono">Update deps</span> to review recommended pins.</div>
        )}
      </Card>

      {/* Suggestions */}
      <Card className="p-3 border-primary/30 bg-primary/5">
        <div className="flex items-center gap-2 mb-2 text-sm font-medium"><Sparkles className="h-4 w-4 text-primary" /> AI suggestions</div>
        <ul className="text-xs space-y-1.5 text-muted-foreground">
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
