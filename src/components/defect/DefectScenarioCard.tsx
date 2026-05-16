import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCcw,
  Layers,
  Activity,
  Lightbulb,
  ShieldCheck,
  Wrench,
  Brain,
  Workflow,
  Ban,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DefectScenario, FailureType } from '@/types/defectAnalyzer';

const STATUS_META: Record<DefectScenario['status'], { label: string; icon: React.ElementType; cls: string }> = {
  passed: { label: 'Passed', icon: CheckCircle2, cls: 'bg-success/15 text-success border-success/40' },
  failed: { label: 'Failed', icon: XCircle, cls: 'bg-destructive/15 text-destructive border-destructive/50' },
  blocked: { label: 'Blocked', icon: Ban, cls: 'bg-orange-500/15 text-orange-500 border-orange-500/40' },
  flaky: { label: 'Flaky', icon: RefreshCcw, cls: 'bg-warning/15 text-warning border-warning/40' },
  skipped: { label: 'Skipped', icon: AlertCircle, cls: 'bg-warning/10 text-warning border-warning/30' },
  unknown: { label: 'Unknown', icon: AlertCircle, cls: 'bg-muted/30 text-muted-foreground border-border' },
};

const FAILURE_TYPE_LABELS: Record<FailureType, string> = {
  xpath_locator: 'XPath / Locator',
  assertion: 'Assertion',
  timeout: 'Timeout',
  element_not_interactable: 'Element Not Interactable',
  element_not_found: 'Element Not Found',
  api_failure: 'API Failure',
  network: 'Network Issue',
  data_mismatch: 'Data Mismatch',
  environment: 'Environment Issue',
  app_crash: 'App Crash',
  unexpected_popup: 'Unexpected Popup',
  session_expired: 'Session Expired',
  dependency: 'Dependency Failure',
  slow_loading: 'Slow Loading',
  validation: 'Validation Failure',
  permission: 'Permission Issue',
  flaky: 'Flaky Behavior',
  build_mismatch: 'Build Mismatch',
  configuration: 'Configuration Issue',
  authentication: 'Authentication Failure',
  ui_change: 'UI Change',
  unknown: 'Unknown',
};

const Section: React.FC<{
  icon: React.ElementType;
  label: string;
  tone?: 'primary' | 'destructive' | 'warning' | 'success' | 'muted';
  children: React.ReactNode;
}> = ({ icon: Icon, label, tone = 'muted', children }) => {
  const toneCls = {
    primary: 'text-primary border-primary/20 bg-primary/5',
    destructive: 'text-destructive border-destructive/20 bg-destructive/5',
    warning: 'text-warning border-warning/20 bg-warning/5',
    success: 'text-success border-success/20 bg-success/5',
    muted: 'text-muted-foreground border-border/40 bg-muted/20',
  }[tone];
  return (
    <div className={cn('rounded-lg border p-2.5 space-y-1', toneCls)}>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="text-xs text-foreground/90 leading-relaxed">{children}</div>
    </div>
  );
};

const DefectScenarioCard: React.FC<{ scenario: DefectScenario }> = ({ scenario }) => {
  const meta = STATUS_META[scenario.status] || STATUS_META.unknown;
  const Icon = meta.icon;
  const failureLabel =
    scenario.failureTypeLabel ||
    (scenario.failureType ? FAILURE_TYPE_LABELS[scenario.failureType] : null);

  return (
    <Card className="glass-card overflow-hidden">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
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
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {scenario.module && (
                <span className="text-[11px] text-muted-foreground">📦 {scenario.module}</span>
              )}
              {scenario.layer && (
                <Badge variant="outline" className="text-[10px] gap-1 glass-effect">
                  <Layers className="h-2.5 w-2.5" />
                  {scenario.layer.toUpperCase()}
                </Badge>
              )}
              {failureLabel && (
                <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive bg-destructive/5">
                  {failureLabel}
                </Badge>
              )}
              {typeof scenario.confidence === 'number' && (
                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/5">
                  {scenario.confidence}% confidence
                </Badge>
              )}
            </div>
          </div>
          <Badge variant="outline" className={cn('shrink-0 gap-1', meta.cls)}>
            <Icon className="h-3 w-3" />
            {meta.label}
          </Badge>
        </div>

        {/* Failure summary */}
        {scenario.failureReason && (
          <Section icon={XCircle} label="Failure Summary" tone="destructive">
            {scenario.failureReason}
          </Section>
        )}

        {/* Root cause */}
        {scenario.rootCause && (
          <Section icon={Activity} label="Root Cause" tone="warning">
            {scenario.rootCause}
          </Section>
        )}

        {/* Detailed explanation */}
        {scenario.detailedExplanation && (
          <Section icon={Brain} label="Detailed Explanation" tone="muted">
            {scenario.detailedExplanation}
          </Section>
        )}

        {/* Technical insight */}
        {scenario.technicalInsight && (
          <Section icon={Wrench} label="Technical Insight" tone="muted">
            {scenario.technicalInsight}
          </Section>
        )}

        {/* Impacted flow */}
        {scenario.impactedFlow && (
          <Section icon={Workflow} label="Impacted Flow" tone="muted">
            {scenario.impactedFlow}
          </Section>
        )}

        {/* Suggested fix */}
        {scenario.suggestedFix && (
          <Section icon={Lightbulb} label="Suggested Fix" tone="primary">
            {scenario.suggestedFix}
          </Section>
        )}

        {/* Prevention */}
        {scenario.preventionRecommendation && (
          <Section icon={ShieldCheck} label="Prevention Strategy" tone="success">
            {scenario.preventionRecommendation}
          </Section>
        )}

        {/* Error snippet */}
        {scenario.errorSnippet && (
          <pre className="text-[11px] bg-muted/40 backdrop-blur-sm border border-border/40 rounded-lg p-2 overflow-x-auto font-mono whitespace-pre-wrap break-all">
            {scenario.errorSnippet}
          </pre>
        )}

        {/* Stack trace */}
        {scenario.stackTrace && (
          <details className="text-[11px]">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
              View stack trace
            </summary>
            <pre className="mt-2 bg-muted/40 backdrop-blur-sm border border-border/40 rounded-lg p-2 overflow-x-auto font-mono whitespace-pre-wrap break-all">
              {scenario.stackTrace}
            </pre>
          </details>
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
