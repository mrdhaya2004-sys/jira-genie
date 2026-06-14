import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RotateCcw, Sparkles, ScanLine, Shield, Zap, Bug, Wand2 } from 'lucide-react';
import CodeInputPanel from './CodeInputPanel';
import AnalysisDashboard from './AnalysisDashboard';
import IssueCard from './IssueCard';
import RefactorPanel from './RefactorPanel';
import FindingsPanel from './FindingsPanel';
import ExportButtons from './ExportButtons';
import SegmentedControl from './SegmentedControl';
import AnalysisTimeline from './AnalysisTimeline';
import { useCodeAnalyzer } from '@/hooks/useCodeAnalyzer';
import { cn } from '@/lib/utils';

type TabKey = 'issues' | 'security' | 'performance' | 'automation' | 'refactor';

const HiveCodeAnalyzerModule: React.FC = () => {
  const { result, isAnalyzing, analyze, reset } = useCodeAnalyzer();
  const [tab, setTab] = React.useState<TabKey>('issues');

  const status = isAnalyzing ? 'analyzing' : result ? 'healthy' : 'idle';
  const statusLabel = isAnalyzing ? 'Analyzing' : result ? 'Healthy' : 'Idle';

  // Animated workflow progression:
  // 0 idle → 1 uploaded → 2 analyzing → 3 review → 4 refactor → 5 complete
  const [step, setStep] = React.useState(0);
  React.useEffect(() => {
    if (isAnalyzing) {
      setStep(1);
      const t1 = setTimeout(() => setStep(2), 350);
      const t2 = setTimeout(() => setStep((s) => (s < 3 ? 3 : s)), 1800);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    if (result) {
      setStep(3);
      const hasRefactor = Object.values(result.refactors || {}).some((v) => v?.code);
      const t1 = setTimeout(() => setStep(hasRefactor ? 4 : 5), 450);
      const t2 = setTimeout(() => setStep(5), 1200);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    setStep(0);
  }, [isAnalyzing, result]);

  return (
    <div className="hca h-full flex flex-col">
      {/* ===== Liquid-glass header ===== */}
      <header className="relative border-b border-border/40 backdrop-blur-2xl bg-card/60 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/8 via-transparent to-primary/8 pointer-events-none" />
        <div className="relative flex items-center gap-3 min-w-0 flex-1">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/40 to-primary/5 blur-md" />
            <div className="relative h-10 w-10 rounded-2xl hca-glass flex items-center justify-center">
              <ScanLine className="h-5 w-5 text-primary" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-sm sm:text-base truncate flex items-center gap-2">
              Hive Code Analyzer
              <span className="hca-chip hidden sm:inline-flex">
                <Sparkles className="h-3 w-3 text-primary" />
                AI Code Review Copilot
              </span>
            </h2>
            <p className="text-[12px] text-muted-foreground truncate">
              AI-Powered Code Quality & Stability Analysis
            </p>
          </div>
        </div>

        {/* Status + quick stats */}
        <div className="relative flex items-center gap-2 shrink-0">
          <div className="hca-chip">
            <span className={cn(
              'h-2 w-2 rounded-full',
              status === 'analyzing' ? 'bg-primary hca-pulse-soft' : status === 'healthy' ? 'bg-emerald-500' : 'bg-muted-foreground/50',
            )} />
            <span>{statusLabel}</span>
          </div>
          {result && (
            <>
              <span className="hca-chip hidden md:inline-flex">Quality {result.overallScore}</span>
              <span className="hca-chip hidden lg:inline-flex">Security {result.subScores.security}</span>
              <span className="hca-chip hidden lg:inline-flex">Automation {result.subScores.automationBestPractice}</span>
              <ExportButtons result={result} />
              <Button variant="outline" size="sm" onClick={reset} className="rounded-xl">
                <RotateCcw className="h-4 w-4 sm:mr-1.5" /><span className="hidden sm:inline">New</span>
              </Button>
            </>
          )}
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
          {/* Workflow timeline — visible during analysis and after completion */}
          {(isAnalyzing || result) && <AnalysisTimeline step={step} />}

          {!result && !isAnalyzing && <CodeInputPanel onAnalyze={analyze} isAnalyzing={isAnalyzing} />}

          {!result && isAnalyzing && (
            <div className="space-y-3 hca-rise">
              <div className="hca-skel h-40 w-full" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="hca-skel h-20" /><div className="hca-skel h-20" /><div className="hca-skel h-20" /><div className="hca-skel h-20" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="hca-skel h-24" /><div className="hca-skel h-24" /><div className="hca-skel h-24" />
              </div>
            </div>
          )}

          {result && (
            <>
              {result.degradedNotice && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 backdrop-blur px-4 py-3 text-sm flex gap-2 items-start text-amber-700 dark:text-amber-300 hca-rise">
                  <Sparkles className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{result.degradedNotice}</span>
                </div>
              )}
              {result.verificationNotice && (
                <div className="rounded-2xl border border-sky-500/30 bg-sky-500/5 backdrop-blur px-4 py-3 text-sm flex gap-2 items-start text-sky-700 dark:text-sky-300 hca-rise">
                  <Shield className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{result.verificationNotice}</span>
                </div>
              )}

              <AnalysisDashboard result={result} />

              <div className="space-y-4">
                <SegmentedControl
                  ariaLabel="Result sections"
                  value={tab}
                  onChange={(v) => setTab(v as TabKey)}
                  items={[
                    { value: 'issues',      label: <>Issues <span className="opacity-60">({result.issues.length})</span></>, icon: <Bug className="h-3.5 w-3.5" /> },
                    { value: 'security',    label: 'Security',    icon: <Shield className="h-3.5 w-3.5" /> },
                    { value: 'performance', label: 'Performance', icon: <Zap className="h-3.5 w-3.5" /> },
                    { value: 'automation',  label: 'Automation',  icon: <ScanLine className="h-3.5 w-3.5" /> },
                    { value: 'refactor',    label: 'Refactor',    icon: <Wand2 className="h-3.5 w-3.5" /> },
                  ]}
                />

                <div key={tab} className="hca-rise">
                  {tab === 'issues' && (
                    result.issues.length === 0
                      ? <div className="hca-glass p-10 text-center text-sm text-muted-foreground">No issues found — clean code ✨</div>
                      : <div className="space-y-3">{result.issues.map((issue, i) => <IssueCard key={i} issue={issue} />)}</div>
                  )}
                  {tab === 'security'    && <FindingsPanel title="Security Findings"    emptyText="No significant Security Issues Found"   findings={result.securityFindings}       icon={<Shield className="h-4 w-4 text-primary" />} />}
                  {tab === 'performance' && <FindingsPanel title="Performance Findings" emptyText="No significant Performance Issues Found" findings={result.performanceFindings}   icon={<Zap className="h-4 w-4 text-primary" />} />}
                  {tab === 'automation'  && <FindingsPanel title="Test Automation Review" emptyText="No significant Automation Risks Found" findings={result.testAutomationFindings} icon={<ScanLine className="h-4 w-4 text-primary" />} />}
                  {tab === 'refactor'    && <RefactorPanel result={result} />}
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default HiveCodeAnalyzerModule;
