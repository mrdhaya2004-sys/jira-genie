import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  XCircle,
  ListChecks,
  Activity,
  Sparkles,
  AlertOctagon,
  RefreshCcw,
  Lightbulb,
  Ban,
  SkipForward,
  ShieldAlert,
  ShieldCheck,
  Gauge,
  FileSearch,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import DefectScenarioCard from './DefectScenarioCard';
import XPathFixCard from './XPathFixCard';
import type { DefectAnalysisResult, XPathIssue } from '@/types/defectAnalyzer';

interface DefectAnalysisDashboardProps {
  analysis: DefectAnalysisResult;
  onRegenerateXPath?: (issue: XPathIssue) => void;
}

const StatTile: React.FC<{
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  tone?: 'primary' | 'success' | 'destructive' | 'warning' | 'muted' | 'orange';
  emphasize?: boolean;
}> = ({ label, value, icon: Icon, tone = 'primary', emphasize = false }) => {
  const toneCls = {
    primary: 'text-primary',
    success: 'text-success',
    destructive: 'text-destructive',
    warning: 'text-warning',
    muted: 'text-muted-foreground',
    orange: 'text-orange-500',
  }[tone];
  const ringCls = {
    primary: 'ring-primary/30',
    success: 'ring-success/30',
    destructive: 'ring-destructive/40',
    warning: 'ring-warning/30',
    muted: 'ring-border',
    orange: 'ring-orange-500/30',
  }[tone];
  return (
    <Card
      className={cn(
        'glass-card group hover:-translate-y-0.5 transition-transform',
        emphasize && `ring-2 ${ringCls}`,
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          <Icon className={`h-4 w-4 ${toneCls}`} />
        </div>
        <div className={`text-2xl font-bold ${toneCls}`}>{value}</div>
      </CardContent>
    </Card>
  );
};

const ReliabilityBar: React.FC<{ label: string; value: number; icon: React.ElementType; tone?: 'primary' | 'success' | 'warning' | 'destructive' }> = ({
  label,
  value,
  icon: Icon,
  tone = 'primary',
}) => {
  const toneCls = {
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    destructive: 'text-destructive',
  }[tone];
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="flex items-center gap-1.5 font-medium">
          <Icon className={cn('h-3 w-3', toneCls)} />
          {label}
        </span>
        <span className={cn('font-semibold', toneCls)}>{value}%</span>
      </div>
      <Progress value={value} className="h-1.5" />
    </div>
  );
};

const DefectAnalysisDashboard: React.FC<DefectAnalysisDashboardProps> = ({ analysis, onRegenerateXPath }) => {
  const failedScenarios = analysis.scenarios.filter((s) => s.status === 'failed');
  const blockedScenarios = analysis.scenarios.filter((s) => s.status === 'blocked');
  const flakyScenarios = analysis.scenarios.filter((s) => s.status === 'flaky' || s.isFlaky);
  const skippedScenarios = analysis.scenarios.filter((s) => s.status === 'skipped');
  const blocked = analysis.blocked ?? blockedScenarios.length;

  const reliability = analysis.reliability;
  const reliabilityTone =
    !reliability ? 'primary'
      : reliability.analysisReliability >= 80 ? 'success'
      : reliability.analysisReliability >= 60 ? 'primary'
      : reliability.analysisReliability >= 40 ? 'warning'
      : 'destructive';

  return (
    <div className="space-y-6 animate-slide-in-up">
      {/* Low-reliability honesty banner */}
      {reliability?.notes && (
        <div className="rounded-xl border border-warning/40 bg-warning/5 backdrop-blur-sm p-3 flex items-start gap-2">
          <ShieldAlert className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <div className="text-xs text-warning/90">
            <span className="font-semibold">Analysis confidence is low. </span>
            {reliability.notes}
          </div>
        </div>
      )}

      {/* Status tiles — color-coded */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatTile label="Total" value={analysis.totalScenarios} icon={ListChecks} tone="primary" />
        <StatTile label="Passed" value={analysis.passed} icon={CheckCircle2} tone="success" />
        <StatTile
          label="Failed"
          value={analysis.failed}
          icon={XCircle}
          tone="destructive"
          emphasize={analysis.failed > 0}
        />
        <StatTile label="Blocked" value={blocked} icon={Ban} tone="orange" emphasize={blocked > 0} />
        <StatTile label="Skipped" value={analysis.skipped} icon={SkipForward} tone="warning" />
        <StatTile label="Flaky" value={analysis.flakyCount} icon={RefreshCcw} tone="warning" />
      </div>

      {/* Reliability & Confidence panel */}
      <Card className="glass-card">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Report Reliability</h3>
            </div>
            <Badge
              variant="outline"
              className={cn(
                'text-[11px]',
                reliabilityTone === 'success' && 'border-success/40 text-success bg-success/5',
                reliabilityTone === 'primary' && 'border-primary/40 text-primary bg-primary/5',
                reliabilityTone === 'warning' && 'border-warning/40 text-warning bg-warning/5',
                reliabilityTone === 'destructive' && 'border-destructive/40 text-destructive bg-destructive/5',
              )}
            >
              {reliability?.analysisReliability ?? analysis.confidence}% reliable
            </Badge>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ReliabilityBar
              label="AI Confidence"
              value={analysis.confidence}
              icon={Sparkles}
              tone={analysis.confidence >= 70 ? 'success' : analysis.confidence >= 50 ? 'primary' : 'warning'}
            />
            <ReliabilityBar
              label="Analysis Reliability"
              value={reliability?.analysisReliability ?? analysis.confidence}
              icon={ShieldCheck}
              tone={reliabilityTone}
            />
            <ReliabilityBar
              label="Parsing Completion"
              value={reliability?.parsingCompletion ?? 100}
              icon={FileSearch}
              tone={(reliability?.parsingCompletion ?? 100) >= 80 ? 'success' : 'warning'}
            />
            <ReliabilityBar
              label="Log Coverage"
              value={reliability?.logCoverage ?? 100}
              icon={Activity}
              tone={(reliability?.logCoverage ?? 100) >= 70 ? 'success' : 'warning'}
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Badge variant="outline" className="text-[11px]">
              Stability {analysis.stabilityScore}%
            </Badge>
            {analysis.mostFailedModule && (
              <Badge variant="outline" className="text-[11px] border-destructive/30 text-destructive">
                <AlertOctagon className="h-3 w-3 mr-1" />
                Most failed: {analysis.mostFailedModule}
              </Badge>
            )}
            {analysis.impactedModules && analysis.impactedModules.length > 0 && (
              <Badge variant="outline" className="text-[11px]">
                {analysis.impactedModules.length} impacted module{analysis.impactedModules.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Failed scenarios — prominently highlighted */}
      {failedScenarios.length > 0 && (
        <Card className="glass-card border-destructive/40 ring-1 ring-destructive/20">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-destructive" />
                <h3 className="text-base font-semibold text-destructive">
                  Failed Scenarios ({failedScenarios.length})
                </h3>
              </div>
            </div>
            {/* Quick list of failure names for fast scanning */}
            <div className="flex flex-wrap gap-1.5">
              {failedScenarios.map((s, i) => (
                <Badge
                  key={`${s.name}-${i}`}
                  variant="outline"
                  className="text-[11px] border-destructive/40 text-destructive bg-destructive/5 max-w-full"
                >
                  <XCircle className="h-3 w-3 mr-1 shrink-0" />
                  <span className="truncate">{s.name || `Scenario ${i + 1}`}</span>
                </Badge>
              ))}
            </div>
            <div className="grid md:grid-cols-2 gap-3 pt-2">
              {failedScenarios.map((s, i) => (
                <DefectScenarioCard key={`fail-${s.name}-${i}`} scenario={s} screenshots={analysis.screenshots} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Blocked scenarios */}
      {blockedScenarios.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Ban className="h-4 w-4 text-orange-500" />
            <h3 className="text-sm font-semibold text-orange-500">
              Blocked Scenarios{' '}
              <Badge variant="outline" className="ml-1 border-orange-500/40 text-orange-500">
                {blockedScenarios.length}
              </Badge>
            </h3>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {blockedScenarios.map((s, i) => (
              <DefectScenarioCard key={`blk-${s.name}-${i}`} scenario={s} screenshots={analysis.screenshots} />
            ))}
          </div>
        </div>
      )}

      {/* Flaky scenarios */}
      {flakyScenarios.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <RefreshCcw className="h-4 w-4 text-warning" />
            <h3 className="text-sm font-semibold text-warning">
              Flaky Scenarios{' '}
              <Badge variant="outline" className="ml-1 border-warning/40 text-warning">
                {flakyScenarios.length}
              </Badge>
            </h3>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {flakyScenarios.map((s, i) => (
              <DefectScenarioCard key={`flk-${s.name}-${i}`} scenario={s} screenshots={analysis.screenshots} />
            ))}
          </div>
        </div>
      )}

      {/* Skipped — compact list */}
      {skippedScenarios.length > 0 && (
        <Card className="glass-card">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <SkipForward className="h-4 w-4 text-warning" />
              <h3 className="text-sm font-semibold">Skipped Scenarios ({skippedScenarios.length})</h3>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {skippedScenarios.map((s, i) => (
                <Badge key={`skp-${s.name}-${i}`} variant="outline" className="text-[11px] border-warning/30 text-warning bg-warning/5">
                  {s.name || `Scenario ${i + 1}`}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Root cause distribution */}
      {analysis.rootCauseDistribution?.length > 0 && (
        <Card className="glass-card">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Root Cause Distribution</h3>
            </div>
            <div className="space-y-2">
              {analysis.rootCauseDistribution.map((bucket) => (
                <div key={bucket.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{bucket.label}</span>
                    <span className="text-muted-foreground">
                      {bucket.count} ({bucket.percentage}%)
                    </span>
                  </div>
                  <Progress value={bucket.percentage} className="h-1.5" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* XPath Issues */}
      {analysis.xpathIssues?.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">
              XPath Recommendations{' '}
              <Badge variant="outline" className="ml-1 border-primary/40 text-primary">
                {analysis.xpathIssues.length}
              </Badge>
            </h3>
          </div>
          <div className="space-y-3">
            {analysis.xpathIssues.map((issue, i) => (
              <XPathFixCard key={i} issue={issue} onRegenerate={onRegenerateXPath} />
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {analysis.recommendations?.length > 0 && (
        <Card className="glass-card border-primary/30">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Stabilization Recommendations</h3>
            </div>
            <ul className="space-y-2">
              {analysis.recommendations.map((r, i) => (
                <li key={i} className="text-xs flex gap-2">
                  <span className="text-primary mt-0.5">▸</span>
                  <span className="text-foreground/90">{r}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DefectAnalysisDashboard;
