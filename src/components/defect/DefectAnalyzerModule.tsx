import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, RotateCcw, Sparkles, ShieldAlert, Play } from 'lucide-react';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useDefectAnalyzer } from '@/hooks/useDefectAnalyzer';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import ScrollToBottomButton from '@/components/common/ScrollToBottomButton';
import DefectChatMessage from './DefectChatMessage';
import DefectReportUploader from './DefectReportUploader';
import { useToast } from '@/hooks/use-toast';

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
    dependencies: [messages, isAnalyzing],
  });

  const handleRegenerateXPath = () => {
    toast({
      title: 'XPath regeneration',
      description: 'Open the XPath Generator module with this workspace to regenerate stable selectors.',
    });
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-background via-background to-muted/20">
      {/* Header */}
      <div className="relative border-b border-border/60 backdrop-blur-xl bg-card/70 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 pointer-events-none" />
        <div className="relative flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary/40 to-primary/10 blur-md animate-glow-pulse" />
            <div className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-lg glass-effect flex items-center justify-center">
              <ShieldAlert className="h-5 w-5 text-primary" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold flex items-center gap-2 text-sm sm:text-base truncate">
              <span className="truncate">🛡️ AI Defect Analyzer</span>
              <Badge variant="secondary" className="text-[10px] sm:text-xs hidden sm:inline-flex shrink-0 glass-effect border-primary/20">
                <Sparkles className="h-2.5 w-2.5 mr-1 text-primary" />
                AI-Powered
              </Badge>
            </h2>
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
              Analyze automation reports — failures, root causes, XPath fixes & stability
            </p>
          </div>
        </div>

        <div className="relative flex items-center gap-1.5 sm:gap-2 shrink-0">
          {selectedWorkspace && (
            <Badge variant="outline" className="text-xs hidden lg:inline-flex max-w-[160px] truncate glass-effect">
              📁 {selectedWorkspace.name}
            </Badge>
          )}
          {selectedOs && (
            <Badge variant="outline" className="text-xs hidden md:inline-flex glass-effect">
              {selectedOs === 'android' ? '🤖 Android' : selectedOs === 'ios' ? '🍎 iOS' : '🌐 Web'}
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={resetFlow}
            className="px-2 sm:px-3 menu-item-shine bg-background/60 backdrop-blur-sm border-border/60 hover:border-primary/50 hover:text-primary"
          >
            <RotateCcw className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Start Over</span>
          </Button>
        </div>
      </div>

      {/* Chat */}
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
              <div className="flex items-center gap-3 text-muted-foreground glass-effect rounded-xl px-4 py-3 w-fit">
                <div className="relative">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <div className="absolute inset-0 h-4 w-4 rounded-full bg-primary/30 blur-md animate-pulse" />
                </div>
                <span className="text-sm font-medium">Scanning report & generating insights...</span>
              </div>
            )}
          </div>
        </ScrollArea>
        <ScrollToBottomButton visible={!isAtBottom} onClick={() => scrollToBottom('smooth')} />
      </div>

      {/* Footer / actions per phase */}
      <div className="border-t border-border/60 backdrop-blur-xl bg-card/70 p-4">
        {phase === 'report_upload' && (
          <div className="max-w-2xl mx-auto">
            <DefectReportUploader onAccepted={handleFilesAccepted} disabled={isAnalyzing} />
          </div>
        )}

        {(phase === 'ready' || phase === 'analyzing' || phase === 'results') && (
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-muted-foreground">
              {reportSummaries.length} file{reportSummaries.length === 1 ? '' : 's'} •{' '}
              {selectedOs === 'android' ? 'Android' : selectedOs === 'ios' ? 'iOS' : 'Web'} • {selectedWorkspace?.name}
            </div>
            <Button
              variant="glass-primary"
              size="lg"
              onClick={executeAnalysis}
              disabled={isAnalyzing || phase !== 'ready'}
              className="min-w-[200px]"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  {phase === 'results' ? 'Re-run Analysis' : 'Execute & Analyze'}
                </>
              )}
            </Button>
          </div>
        )}

        {phase === 'workspace_selection' && (
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm glass-effect rounded-full px-4 py-2 w-fit mx-auto">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            <span>Pick a workspace above to begin</span>
          </div>
        )}

        {phase === 'os_selection' && (
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm glass-effect rounded-full px-4 py-2 w-fit mx-auto">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            <span>Select your execution OS to continue</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DefectAnalyzerModule;
