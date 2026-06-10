import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Sparkles, ScanLine, Shield, Zap, Bug, Wand2 } from 'lucide-react';
import CodeInputPanel from './CodeInputPanel';
import AnalysisDashboard from './AnalysisDashboard';
import IssueCard from './IssueCard';
import RefactorPanel from './RefactorPanel';
import FindingsPanel from './FindingsPanel';
import ExportButtons from './ExportButtons';
import { useCodeAnalyzer } from '@/hooks/useCodeAnalyzer';

const HiveCodeAnalyzerModule: React.FC = () => {
  const { result, isAnalyzing, analyze, reset } = useCodeAnalyzer();

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-background via-background to-muted/20">
      {/* Header */}
      <div className="relative border-b border-border/60 backdrop-blur-xl bg-card/70 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 pointer-events-none" />
        <div className="relative flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary/40 to-primary/10 blur-md animate-glow-pulse" />
            <div className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-lg glass-effect flex items-center justify-center">
              <ScanLine className="h-5 w-5 text-primary" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold flex items-center gap-2 text-sm sm:text-base truncate">
              <span className="truncate">🧠 Hive Code Analyzer</span>
              <Badge variant="secondary" className="text-[10px] sm:text-xs hidden sm:inline-flex shrink-0 glass-effect border-primary/20">
                <Sparkles className="h-2.5 w-2.5 mr-1 text-primary" />AI Code Review Copilot
              </Badge>
            </h2>
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
              Enterprise code review · scoring · refactoring for QA Automation, API, Mobile & Web
            </p>
          </div>
        </div>
        {result && (
          <div className="relative flex items-center gap-1.5 sm:gap-2 shrink-0">
            <ExportButtons result={result} />
            <Button variant="outline" size="sm" onClick={reset} className="px-2 sm:px-3">
              <RotateCcw className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">New Analysis</span>
            </Button>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 max-w-6xl mx-auto space-y-5">
          {!result && <CodeInputPanel onAnalyze={analyze} isAnalyzing={isAnalyzing} />}

          {result && (
            <>
              {result.degradedNotice && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 px-4 py-3 text-sm flex gap-2 items-start">
                  <Sparkles className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{result.degradedNotice}</span>
                </div>
              )}
              <AnalysisDashboard result={result} />


              <Tabs defaultValue="issues" className="w-full">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
                  <TabsTrigger value="issues"><Bug className="h-3.5 w-3.5 mr-1.5" />Issues ({result.issues.length})</TabsTrigger>
                  <TabsTrigger value="security"><Shield className="h-3.5 w-3.5 mr-1.5" />Security</TabsTrigger>
                  <TabsTrigger value="performance"><Zap className="h-3.5 w-3.5 mr-1.5" />Performance</TabsTrigger>
                  <TabsTrigger value="automation"><ScanLine className="h-3.5 w-3.5 mr-1.5" />Automation</TabsTrigger>
                  <TabsTrigger value="refactor"><Wand2 className="h-3.5 w-3.5 mr-1.5" />Refactor</TabsTrigger>
                </TabsList>

                <TabsContent value="issues" className="mt-4 space-y-3">
                  {result.issues.length === 0
                    ? <div className="text-center text-sm text-muted-foreground py-8">No issues found — clean code! ✨</div>
                    : result.issues.map((issue, i) => <IssueCard key={i} issue={issue} />)}
                </TabsContent>
                <TabsContent value="security" className="mt-4">
                  <FindingsPanel title="Security Findings" emptyText="No significant Security Issues Found" findings={result.securityFindings} icon={<Shield className="h-4 w-4 text-primary inline" />} />
                </TabsContent>
                <TabsContent value="performance" className="mt-4">
                  <FindingsPanel title="Performance Findings" emptyText="No significant Performance Issues Found" findings={result.performanceFindings} icon={<Zap className="h-4 w-4 text-primary inline" />} />
                </TabsContent>
                <TabsContent value="automation" className="mt-4">
                  <FindingsPanel title="Test Automation Review" emptyText="No significant Automation Risks Found" findings={result.testAutomationFindings} icon={<ScanLine className="h-4 w-4 text-primary inline" />} />
                </TabsContent>
                <TabsContent value="refactor" className="mt-4">
                  <RefactorPanel result={result} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default HiveCodeAnalyzerModule;
