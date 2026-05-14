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
} from 'lucide-react';
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
  tone?: 'primary' | 'success' | 'destructive' | 'warning' | 'muted';
}> = ({ label, value, icon: Icon, tone = 'primary' }) => {
  const toneCls = {
    primary: 'text-primary',
    success: 'text-success',
    destructive: 'text-destructive',
    warning: 'text-warning',
    muted: 'text-muted-foreground',
  }[tone];
  return (
    <Card className="glass-card group hover:-translate-y-0.5 transition-transform">
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

const DefectAnalysisDashboard: React.FC<DefectAnalysisDashboardProps> = ({ analysis, onRegenerateXPath }) => {
  const failedScenarios = analysis.scenarios.filter((s) => s.status === 'failed' || s.status === 'flaky');

  return (
    <div className="space-y-6 animate-slide-in-up">
      {/* Stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatTile label="Total" value={analysis.totalScenarios} icon={ListChecks} tone="primary" />
        <StatTile label="Passed" value={analysis.passed} icon={CheckCircle2} tone="success" />
        <StatTile label="Failed" value={analysis.failed} icon={XCircle} tone="destructive" />
        <StatTile
          label="Stability"
          value={`${analysis.stabilityScore}%`}
          icon={Activity}
          tone={analysis.stabilityScore >= 80 ? 'success' : analysis.stabilityScore >= 50 ? 'warning' : 'destructive'}
        />
        <StatTile
          label="AI Confidence"
          value={`${analysis.confidence}%`}
          icon={Sparkles}
          tone="primary"
        />
      </div>

      {/* Most failed module + flaky */}
      <div className="grid md:grid-cols-2 gap-3">
        {analysis.mostFailedModule && (
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl glass-effect flex items-center justify-center">
                <AlertOctagon className="h-5 w-5 text-destructive" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Most Failed Module
                </p>
                <p className="text-base font-semibold truncate">{analysis.mostFailedModule}</p>
              </div>
            </CardContent>
          </Card>
        )}
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl glass-effect flex items-center justify-center">
              <RefreshCcw className="h-5 w-5 text-warning" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Flaky Tests
              </p>
              <p className="text-base font-semibold">{analysis.flakyCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

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

      {/* Scenarios */}
      {failedScenarios.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-destructive" />
            <h3 className="text-sm font-semibold">
              Failed & Flaky Scenarios{' '}
              <Badge variant="outline" className="ml-1">
                {failedScenarios.length}
              </Badge>
            </h3>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {failedScenarios.map((s, i) => (
              <DefectScenarioCard key={`${s.name}-${i}`} scenario={s} />
            ))}
          </div>
        </div>
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
