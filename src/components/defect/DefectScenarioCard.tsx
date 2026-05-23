import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  Camera,
  Eye,
  ZoomIn,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DefectScenario, FailureType, DefectAnalysisResult } from '@/types/defectAnalyzer';

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

const DefectScenarioCard: React.FC<{
  scenario: DefectScenario;
  screenshots?: DefectAnalysisResult['screenshots'];
}> = ({ scenario, screenshots }) => {
  const meta = STATUS_META[scenario.status] || STATUS_META.unknown;
  const Icon = meta.icon;
  const failureLabel =
    scenario.failureTypeLabel ||
    (scenario.failureType ? FAILURE_TYPE_LABELS[scenario.failureType] : null);
  const accent =
    scenario.status === 'failed' ? 'border-l-4 border-l-destructive' :
    scenario.status === 'blocked' ? 'border-l-4 border-l-orange-500' :
    scenario.status === 'flaky' ? 'border-l-4 border-l-warning' :
    scenario.status === 'skipped' ? 'border-l-4 border-l-warning/60' :
    scenario.status === 'passed' ? 'border-l-4 border-l-success' : '';
  const isLowConfidence = typeof scenario.confidence === 'number' && scenario.confidence < 60;

  return (
    <Card className={cn('glass-card overflow-hidden', accent)}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-semibold break-words">{scenario.name || 'Unnamed scenario'}</h4>
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
              {failureLabel && (scenario.status === 'failed' || scenario.status === 'flaky' || scenario.status === 'blocked') && (
                <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive bg-destructive/5">
                  {failureLabel}
                </Badge>
              )}
              {typeof scenario.confidence === 'number' && (
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px]',
                    isLowConfidence
                      ? 'border-warning/40 text-warning bg-warning/5'
                      : 'border-primary/30 text-primary bg-primary/5',
                  )}
                >
                  {scenario.confidence}% confidence
                </Badge>
              )}
              {scenario.verifiedInLogs === false && (
                <Badge variant="outline" className="text-[10px] border-warning/40 text-warning bg-warning/5">
                  Unverified in logs
                </Badge>
              )}
              {scenario.verifiedInLogs === true && (
                <Badge variant="outline" className="text-[10px] border-success/40 text-success bg-success/5">
                  ✓ Verified
                </Badge>
              )}
            </div>
          </div>
          <Badge variant="outline" className={cn('shrink-0 gap-1', meta.cls)}>
            <Icon className="h-3 w-3" />
            {meta.label}
          </Badge>
        </div>

        {/* Low-confidence honesty banner */}
        {isLowConfidence && scenario.lowConfidenceReason && (
          <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/5 p-2.5 text-[11px] text-warning">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{scenario.lowConfidenceReason}</span>
          </div>
        )}

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

        {/* Execution sequence */}
        {scenario.executionSequence && scenario.executionSequence.length > 0 && (
          <Section icon={Workflow} label="Execution Sequence (last steps)" tone="muted">
            <ol className="list-decimal list-inside space-y-0.5 marker:text-muted-foreground">
              {scenario.executionSequence.map((step, i) => (
                <li key={i} className={i === scenario.executionSequence!.length - 1 ? 'text-destructive font-medium' : ''}>
                  {step}
                </li>
              ))}
            </ol>
          </Section>
        )}

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

        {/* Screenshot intelligence — AI visual analysis */}
        {scenario.screenshotAnalysis && scenario.screenshotAnalysis.length > 0 && screenshots && (
          <div className="rounded-lg border border-primary/30 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 p-3 space-y-3">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <Camera className="h-3 w-3" />
              AI Screenshot Analysis ({scenario.screenshotAnalysis.length})
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {scenario.screenshotAnalysis.map((sa, i) => {
                const shot = screenshots[sa.screenshotIndex];
                if (!shot) return null;
                return (
                  <div key={i} className="rounded-lg border border-border/40 bg-background/60 backdrop-blur-sm overflow-hidden">
                    <Dialog>
                      <DialogTrigger asChild>
                        <button
                          type="button"
                          className="group relative block w-full aspect-video bg-muted/40 overflow-hidden"
                          aria-label={`Zoom screenshot ${shot.name}`}
                        >
                          <img
                            src={shot.dataUrl}
                            alt={shot.name}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                            <span className="text-[10px] text-white flex items-center gap-1">
                              <ZoomIn className="h-3 w-3" /> Click to zoom
                            </span>
                          </div>
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-5xl p-2">
                        <DialogTitle className="sr-only">Screenshot preview</DialogTitle>
                        <DialogDescription className="sr-only">
                          Enlarged screenshot with filename and dimensions.
                        </DialogDescription>
                        <img
                          src={shot.dataUrl}
                          alt={shot.name}
                          className="w-full h-auto rounded-md"
                        />
                        <div className="text-[11px] text-muted-foreground px-1 pb-1 truncate">
                          {shot.name} • {shot.width}×{shot.height} • {shot.sourceFile}
                        </div>
                      </DialogContent>
                    </Dialog>
                    <div className="p-2.5 space-y-1.5">
                      <div className="flex items-start gap-1.5 text-[11px]">
                        <Eye className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                        <span className="text-foreground/90 leading-relaxed">{sa.visualObservation}</span>
                      </div>
                      {sa.detectedIssue && (
                        <div className="text-[11px] rounded border border-destructive/30 bg-destructive/5 px-2 py-1 text-destructive">
                          <span className="font-semibold">Detected: </span>{sa.detectedIssue}
                        </div>
                      )}
                      {sa.visibleText && (
                        <div className="text-[10px] text-muted-foreground italic break-words">
                          “{sa.visibleText}”
                        </div>
                      )}
                      {sa.blockingOverlay && (
                        <div className="text-[10px] rounded border border-warning/40 bg-warning/5 px-2 py-1 text-warning">
                          <span className="font-semibold">Blocking overlay: </span>{sa.blockingOverlay}
                        </div>
                      )}
                      {typeof sa.confidence === 'number' && (
                        <div className="text-[10px] text-muted-foreground">
                          Vision confidence: <span className={cn(sa.confidence < 60 ? 'text-warning' : 'text-primary', 'font-semibold')}>{sa.confidence}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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
