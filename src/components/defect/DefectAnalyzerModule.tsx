import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, RotateCcw, Sparkles, Play, ShieldAlert, Zap, Layers, Activity, History } from 'lucide-react';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useDefectAnalyzer } from '@/hooks/useDefectAnalyzer';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import ScrollToBottomButton from '@/components/common/ScrollToBottomButton';
import DefectChatMessage from './DefectChatMessage';
import DefectReportUploader from './DefectReportUploader';
import { useToast } from '@/hooks/use-toast';
import defectAnalyzerLogo from '@/assets/defect-analyzer-logo.png.asset.json';
import DefectWorkflowTimeline from './DefectWorkflowTimeline';

// AI Risk Intelligence palette
// Royal Blue #2563EB · Emerald #10B981 · Crimson #DC2626 · Amber #F59E0B · Violet #7C3AED · Slate #334155

const GlassChip: React.FC<{
  icon: React.ReactNode;
  label: string;
  color: string;
  glow: string;
  pulse?: boolean;
}> = ({ icon, label, color, glow, pulse }) => (
  <div
    className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/[0.06] border border-white/15 backdrop-blur-2xl backdrop-saturate-150 transition-all duration-250 hover:-translate-y-[1px]"
    style={{ boxShadow: `0 8px 24px -12px ${glow}` }}
  >
    <div className="relative flex items-center justify-center">
      <span style={{ color }} className="flex">{icon}</span>
      {pulse && (
        <span
          className="absolute inset-0 rounded-full animate-ping opacity-50"
          style={{ background: color }}
        />
      )}
    </div>
    <span className="text-[10px] font-semibold tracking-wide uppercase" style={{ color }}>
      {label}
    </span>
  </div>
);

const DefectAnalyzerModule: React.FC = () => {
  const { workspaces, isLoading: workspacesLoading } = useWorkspaces();
  const {
    messages,
    phase,
    selectedWorkspace,
    selectedOs,
    reportSummaries,
    isAnalyzing,
    isParsing,
    handleWorkspaceSelect,
    handleFilesAccepted,
    handleOsSelect,
    executeAnalysis,
    resetFlow,
  } = useDefectAnalyzer({ workspaces, isLoadingWorkspaces: workspacesLoading });

  const { toast } = useToast();
  const { containerRef: scrollRef, scrollToBottom, isAtBottom } = useAutoScroll<HTMLDivElement>({
    dependencies: [isAnalyzing],
    messageCount: messages.length,
  });

  const handleRegenerateXPath = () => {
    toast({
      title: 'XPath regeneration',
      description: 'Open the XPath Generator module with this workspace to regenerate stable selectors.',
    });
  };

  // Rough analysis score: results present => 92, ready => 75, else idle
  const analysisScore = phase === 'results' ? 92 : phase === 'ready' ? 75 : phase === 'analyzing' ? 60 : 0;

  return (
    <div className="relative h-full flex flex-col overflow-hidden bg-[#F8FAFC] dark:bg-[#0B0D14]">
      {/* Ambient aurora — Royal Blue / Emerald / Violet / Amber */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-32 h-[420px] w-[420px] rounded-full blur-[80px] opacity-[0.22]"
             style={{ background: 'radial-gradient(circle, #2563EB 0%, transparent 70%)' }} />
        <div className="absolute -top-32 -right-24 h-[440px] w-[440px] rounded-full blur-[80px] opacity-[0.20]"
             style={{ background: 'radial-gradient(circle, #10B981 0%, transparent 70%)' }} />
        <div className="absolute -bottom-40 -left-20 h-[400px] w-[400px] rounded-full blur-[80px] opacity-[0.18]"
             style={{ background: 'radial-gradient(circle, #7C3AED 0%, transparent 70%)' }} />
        <div className="absolute -bottom-32 -right-32 h-[440px] w-[440px] rounded-full blur-[80px] opacity-[0.20]"
             style={{ background: 'radial-gradient(circle, #F59E0B 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 left-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.08] blur-[50px]" />
      </div>

      {/* Compact floating glass header */}
      <div className="relative z-10 mx-2 sm:mx-4 mt-2 sm:mt-3 rounded-2xl border border-white/15 bg-white/[0.08] backdrop-blur-[35px] backdrop-saturate-150 shadow-[0_20px_60px_-20px_rgba(37,99,235,0.25)]">
        <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#10B981]/50 to-transparent" />

        <div className="flex items-center justify-between gap-2 px-3 sm:px-5 py-3">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
            <div className="relative shrink-0">
              <div className="absolute -inset-1 rounded-2xl opacity-70 blur-lg"
                   style={{ background: 'conic-gradient(from 0deg, #2563EB, #10B981, #F59E0B, #DC2626, #7C3AED, #2563EB)' }} />
              <div className="relative h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-white/95 backdrop-blur-xl flex items-center justify-center p-1.5 ring-1 ring-inset ring-white/40 shadow-[0_8px_24px_-8px_rgba(37,99,235,0.6)]">
                <img src={defectAnalyzerLogo.url} alt="AI Defect Analyzer" className="h-full w-full rounded-lg object-contain" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-[18px] sm:text-[20px] font-bold tracking-tight truncate bg-gradient-to-r from-[#2563EB] via-[#10B981] to-[#7C3AED] bg-clip-text text-transparent">
                  🐞 AI Defect Analyzer
                </h1>
              </div>
              <p className="flex items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground/80 truncate">
                <ShieldAlert className="h-3 w-3 text-[#DC2626]" />
                AI-powered root cause analysis and defect intelligence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <GlassChip
              icon={<Zap className="h-3 w-3" />}
              label="AI Ready"
              color="#10B981"
              glow="rgba(16,185,129,0.6)"
              pulse
            />
            {analysisScore > 0 && (
              <GlassChip
                icon={<Activity className="h-3 w-3" />}
                label={`Score ${analysisScore}`}
                color="#2563EB"
                glow="rgba(37,99,235,0.6)"
              />
            )}
            {selectedWorkspace && (
              <GlassChip
                icon={<Layers className="h-3 w-3" />}
                label={selectedWorkspace.name}
                color="#7C3AED"
                glow="rgba(124,58,237,0.5)"
              />
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full bg-white/[0.06] border border-white/15 backdrop-blur-xl hover:bg-white/[0.12] hover:border-[#2563EB]/40 hover:-translate-y-[1px] hover:shadow-[0_8px_24px_-8px_rgba(37,99,235,0.6)] active:scale-95 transition-all duration-250"
                >
                  <History className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>History</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={resetFlow}
                  className="h-9 w-9 rounded-full bg-white/[0.06] border border-white/15 backdrop-blur-xl hover:bg-white/[0.12] hover:border-[#DC2626]/40 hover:-translate-y-[1px] hover:shadow-[0_8px_24px_-8px_rgba(220,38,38,0.55)] active:scale-95 transition-all duration-250"
                >
                  <RotateCcw className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* AI Workflow Timeline */}
      <div className="relative z-10 mx-2 sm:mx-4 mt-2">
        <DefectWorkflowTimeline
          phase={phase}
          isAnalyzing={isAnalyzing}
          hasResults={phase === 'results'}
        />
      </div>

      {/* Framed glass chat surface */}
      <div className="relative z-10 flex-1 overflow-hidden px-2 sm:px-4 pb-2 pt-2 min-h-0">
        <div className="h-full flex flex-col rounded-2xl border border-white/15 bg-white/[0.06] backdrop-blur-[35px] backdrop-saturate-150 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.15)] overflow-hidden">
          <div className="relative flex-1 min-h-0">
            <ScrollArea className="h-full" ref={scrollRef}>
              <div className="p-4 space-y-4 max-w-5xl mx-auto pb-8">
                {messages.map((m) => (
                  <DefectChatMessage
                    key={m.id}
                    message={m}
                    onWorkspaceSelect={phase === 'workspace_selection' ? handleWorkspaceSelect : undefined}
                    onOsSelect={phase === 'os_selection' ? handleOsSelect : undefined}
                    onRegenerateXPath={handleRegenerateXPath}
                  />
                ))}

                {isAnalyzing && (
                  <div data-skip-anchor="true" className="flex items-center gap-3 rounded-2xl px-4 py-3 w-fit border border-white/15 bg-white/[0.08] backdrop-blur-[35px] shadow-[0_12px_40px_-16px_rgba(37,99,235,0.4)]">
                    <div className="relative">
                      <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#2563EB' }} />
                      <div className="absolute inset-0 h-4 w-4 rounded-full blur-md animate-pulse" style={{ background: 'rgba(37,99,235,0.4)' }} />
                    </div>
                    <span className="text-sm font-medium bg-gradient-to-r from-[#2563EB] via-[#10B981] to-[#7C3AED] bg-clip-text text-transparent">
                      Analyzing defect · detecting root cause · predicting severity...
                    </span>
                  </div>
                )}
              </div>
            </ScrollArea>
            <ScrollToBottomButton visible={!isAtBottom} onClick={() => scrollToBottom('smooth')} />
          </div>

          {/* Footer / actions per phase */}
          <div className="border-t border-white/10 bg-white/[0.04] backdrop-blur-xl p-4">
            {phase === 'report_upload' && (
              <div className="max-w-2xl mx-auto space-y-2">
                <DefectReportUploader
                  onAccepted={handleFilesAccepted}
                  disabled={isAnalyzing}
                  externalState={isAnalyzing ? 'analyzing' : isParsing ? 'processing' : 'idle'}
                />
              </div>
            )}

            {(phase === 'ready' || phase === 'analyzing' || phase === 'results') && (
              <div className="max-w-2xl mx-auto flex items-center justify-between gap-3 flex-wrap">
                <div className="text-xs text-muted-foreground">
                  {reportSummaries.length} file{reportSummaries.length === 1 ? '' : 's'} •{' '}
                  {selectedOs === 'android' ? 'Android' : selectedOs === 'ios' ? 'iOS' : 'Web'} • {selectedWorkspace?.name}
                </div>
                <Button
                  onClick={executeAnalysis}
                  disabled={isAnalyzing || phase !== 'ready'}
                  className="min-w-[220px] h-11 gap-2 rounded-full text-white font-semibold border border-white/20 shadow-[0_12px_32px_-8px_rgba(37,99,235,0.6)] hover:-translate-y-[1px] hover:shadow-[0_16px_40px_-8px_rgba(16,185,129,0.6)] active:scale-[0.98] transition-all duration-250"
                  style={{ background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 55%, #10B981 100%)' }}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      {phase === 'results' ? 'Re-run Analysis' : 'Analyze Defect'}
                    </>
                  )}
                </Button>
              </div>
            )}

            {phase === 'workspace_selection' && (
              <div className="flex items-center justify-center gap-2 text-sm rounded-full px-4 py-2 w-fit mx-auto border border-white/15 bg-white/[0.08] backdrop-blur-[35px]">
                <Sparkles className="h-4 w-4 animate-pulse" style={{ color: '#10B981' }} />
                <span className="bg-gradient-to-r from-[#2563EB] to-[#10B981] bg-clip-text text-transparent font-medium">
                  Pick a workspace above to begin
                </span>
              </div>
            )}

            {phase === 'os_selection' && (
              <div className="flex items-center justify-center gap-2 text-sm rounded-full px-4 py-2 w-fit mx-auto border border-white/15 bg-white/[0.08] backdrop-blur-[35px]">
                <Sparkles className="h-4 w-4 animate-pulse" style={{ color: '#7C3AED' }} />
                <span className="bg-gradient-to-r from-[#7C3AED] to-[#F59E0B] bg-clip-text text-transparent font-medium">
                  Select your execution OS to continue
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DefectAnalyzerModule;
