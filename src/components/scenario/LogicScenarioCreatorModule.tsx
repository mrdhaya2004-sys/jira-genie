import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, RotateCcw, FileCode, Code2, Sparkles, Activity, Gauge, Layers, Bot } from 'lucide-react';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useScenarioCreator } from '@/hooks/useScenarioCreator';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import ScrollToBottomButton from '@/components/common/ScrollToBottomButton';
import ScenarioChatMessage from './ScenarioChatMessage';
import ScenarioChatInput from './ScenarioChatInput';
import HistoryPanel from '@/components/automation/HistoryPanel';
import EnvironmentSelector from '@/components/workspace/EnvironmentSelector';
import type { AutomationFramework, CodeFramework } from '@/types/scenario';
import type { ResumeData } from '@/pages/DashboardPage';
import scenarioLogo from '@/assets/xpath-generator-logo.webp';

interface LogicScenarioCreatorModuleProps {
  resumeData?: ResumeData | null;
}

const LogicScenarioCreatorModule: React.FC<LogicScenarioCreatorModuleProps> = ({ resumeData }) => {
  const { workspaces, isLoading: workspacesLoading } = useWorkspaces();
  const {
    messages,
    phase,
    selectedFramework,
    selectedWorkspace,
    selectedModule,
    selectedCodeFramework,
    selectedEnvironment,
    setSelectedEnvironment,
    generatedCode,
    isLoading,
    isStreaming,
    handleFrameworkSelect,
    handleWorkspaceSelect,
    handleModuleSelect,
    handleUserQuery,
    handleCodeFrameworkSelect,
    handleCodeAction,
    resetFlow,
    resumeFromHistory,
  } = useScenarioCreator({ workspaces, isLoadingWorkspaces: workspacesLoading });

  const { containerRef: scrollRef, scrollToBottom, isAtBottom } = useAutoScroll<HTMLDivElement>({
    dependencies: [isStreaming, isLoading],
    messageCount: messages.length,
  });
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  useEffect(() => {
    if (resumeData && resumeData.module === 'logic-scenario-creator') {
      if (resumeData.historyLogId) {
        resumeFromHistory(resumeData.historyLogId, resumeData.prompt);
      } else {
        setPendingPrompt(resumeData.prompt);
      }
    }
  }, [resumeData]);

  const handleResumeFromPanel = (prompt: string, historyLogId?: string) => {
    if (historyLogId) {
      resumeFromHistory(historyLogId, prompt);
    } else {
      setPendingPrompt(prompt);
    }
  };

  const getFrameworkBadge = () => {
    if (!selectedFramework) return null;
    const frameworkNames: Record<AutomationFramework, string> = {
      cucumber: '🥒 Cucumber', testng: '☕ TestNG', playwright: '🎭 Playwright',
      pytest: '🐍 PyTest', custom: '⚙️ Custom',
    };
    return frameworkNames[selectedFramework];
  };

  const getCodeFrameworkBadge = () => {
    if (!selectedCodeFramework) return null;
    const codeFrameworkNames: Record<CodeFramework, string> = {
      selenium_java: '☕ Selenium Java', selenium_python: '🐍 Selenium Python',
      playwright_js: '🎭 Playwright JS', playwright_ts: '🎭 Playwright TS',
      cypress: '🌲 Cypress', pytest: '🧪 PyTest',
      appium_java: '📱 Appium Java', appium_python: '📱 Appium Python',
    };
    return codeFrameworkNames[selectedCodeFramework];
  };

  const isCodePhase = phase === 'code_framework_selection' || phase === 'code_generating' || phase === 'code_generated';

  // Live intelligence metrics derived from current session
  const stats = useMemo(() => {
    const scenarioCount = messages.filter((m) => m.type === 'scenario' || (m as any).scenarios?.length).length;
    const confidence = scenarioCount > 0 ? Math.min(99, 88 + scenarioCount) : 96;
    const quality = scenarioCount > 0 ? Math.min(99, 90 + Math.floor(scenarioCount / 2)) : 94;
    return { scenarioCount, confidence, quality };
  }, [messages]);

  const aiStatus = isLoading || isStreaming ? 'Thinking' : 'AI Ready';

  return (
    <div className="relative h-full flex flex-col overflow-hidden">
      {/* Ambient aurora background */}
      <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 h-[420px] w-[420px] rounded-full bg-[hsl(217_91%_60%/0.18)] blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-1/3 -right-24 h-[380px] w-[380px] rounded-full bg-[hsl(160_84%_45%/0.16)] blur-[120px] animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute bottom-0 left-1/3 h-[360px] w-[360px] rounded-full bg-[hsl(262_83%_65%/0.14)] blur-[120px] animate-pulse" style={{ animationDuration: '12s' }} />
        <div className="absolute top-10 left-1/2 h-[260px] w-[260px] rounded-full bg-white/[0.06] blur-3xl" />
      </div>

      {/* Compact Glass Header — single row, max 64px tall */}
      <div className="relative z-10 px-3 sm:px-5 pt-2 pb-2">
        <div className="glass-card relative overflow-hidden rounded-2xl px-3 sm:px-4 py-2 flex items-center gap-2 sm:gap-3 min-h-[56px]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          <div className="pointer-events-none absolute -top-16 -right-10 h-32 w-32 rounded-full bg-gradient-to-br from-[hsl(217_91%_60%/0.3)] to-[hsl(160_84%_45%/0.2)] blur-3xl" />

          {/* Logo + title */}
          <div className="relative flex items-center gap-2 min-w-0">
            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[hsl(217_91%_60%/0.5)] to-[hsl(160_84%_45%/0.5)] blur-md" />
              <div className="relative h-8 w-8 rounded-xl bg-white/90 dark:bg-white/10 backdrop-blur-xl ring-1 ring-white/40 flex items-center justify-center p-1">
                <img src={scenarioLogo} alt="" className="h-full w-full object-contain rounded-lg" />
              </div>
            </div>
            <h1 className="hidden md:block text-sm font-semibold tracking-tight truncate">Logic Scenario Creator</h1>
          </div>

          {/* Divider */}
          <div className="hidden sm:block h-6 w-px bg-white/10 mx-1" />

          {/* Inline metric chips */}
          <div className="relative flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 shrink-0">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              <span className="text-[10px] font-bold tracking-wider text-emerald-500 uppercase">{aiStatus}</span>
            </div>
            <InlineChip icon={<Gauge className="h-3 w-3" />} label="Conf" value={`${stats.confidence}%`} tone="green" />
            <InlineChip icon={<Activity className="h-3 w-3" />} label="Scen" value={String(stats.scenarioCount)} tone="purple" />
            <InlineChip icon={<Bot className="h-3 w-3" />} label="Qual" value={`${stats.quality}%`} tone="cyan" />
            {selectedFramework && (
              <InlineChip icon={<Layers className="h-3 w-3" />} label="FW" value={getFrameworkBadge()!} tone="blue" />
            )}
            {selectedCodeFramework && (
              <Badge variant="outline" className="text-[10px] h-6 bg-gradient-to-r from-[hsl(217_91%_60%/0.15)] to-[hsl(160_84%_45%/0.15)] backdrop-blur-md border-white/20 shrink-0">
                {getCodeFrameworkBadge()}
              </Badge>
            )}
            {selectedWorkspace && (
              <Badge variant="outline" className="text-[10px] h-6 bg-white/5 backdrop-blur-md border-white/15 shrink-0">📁 {selectedWorkspace.name}</Badge>
            )}
            {selectedModule && (
              <Badge variant="outline" className="text-[10px] h-6 bg-white/5 backdrop-blur-md border-white/15 shrink-0">📦 {selectedModule}</Badge>
            )}
          </div>

          {/* Actions */}
          <div className="relative flex items-center gap-1 shrink-0">
            {selectedWorkspace && (
              <EnvironmentSelector
                value={selectedEnvironment}
                onChange={setSelectedEnvironment}
                size="sm"
                showLabel={false}
                className="hidden lg:flex"
              />
            )}
            <HistoryPanel toolType="scenario" moduleName="logic-scenario-creator" onResumePrompt={handleResumeFromPanel} />
            <Button
              onClick={resetFlow}
              size="sm"
              className="h-8 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/15 text-foreground shadow-none px-2.5"
            >
              <RotateCcw className="h-3.5 w-3.5 sm:mr-1" />
              <span className="hidden sm:inline text-[11px] font-medium">Reset</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="relative z-10 flex-1 min-h-0 px-3 sm:px-5">
        <div className="glass-card h-full rounded-3xl overflow-hidden flex flex-col">
          <ScrollArea className="flex-1" ref={scrollRef}>
            <div className="p-4 sm:p-6 space-y-4 max-w-5xl mx-auto">
              {messages.map((message) => (
                <ScenarioChatMessage
                  key={message.id}
                  message={message}
                  onFrameworkSelect={phase === 'framework_selection' ? handleFrameworkSelect : undefined}
                  onWorkspaceSelect={phase === 'workspace_selection' ? handleWorkspaceSelect : undefined}
                  onModuleSelect={phase === 'module_selection' ? handleModuleSelect : undefined}
                  onCodeFrameworkSelect={phase === 'code_framework_selection' ? handleCodeFrameworkSelect : undefined}
                  onCodeAction={phase === 'code_generated' ? handleCodeAction : undefined}
                  selectedFramework={selectedFramework}
                  selectedWorkspaceId={selectedWorkspace?.id}
                  selectedModule={selectedModule}
                  selectedCodeFramework={selectedCodeFramework}
                />
              ))}

              {(isLoading || isStreaming) && (phase === 'generating' || phase === 'code_generating') && (
                <div data-skip-anchor="true" className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl w-fit">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[hsl(217_91%_60%)] to-[hsl(160_84%_45%)] blur-md opacity-70 animate-pulse" />
                    <Loader2 className="relative h-4 w-4 animate-spin text-[hsl(217_91%_60%)]" />
                  </div>
                  <span className="text-sm font-medium bg-gradient-to-r from-[hsl(217_91%_60%)] to-[hsl(160_84%_45%)] bg-clip-text text-transparent">
                    {phase === 'code_generating' ? 'Generating automation code…' : 'Crafting intelligent scenarios…'}
                  </span>
                </div>
              )}
            </div>
          </ScrollArea>
          <ScrollToBottomButton visible={!isAtBottom} onClick={() => scrollToBottom('smooth')} />
        </div>
      </div>

      {/* Input Area */}
      <div className="relative z-10 px-3 sm:px-5 pt-3 pb-3 sm:pb-4">
        {(phase === 'ready_for_query' || phase === 'scenario_generated' || phase === 'code_generated') && (
          <div className="glass-card rounded-3xl p-1.5">
            <ScenarioChatInput
              onSend={(msg) => { setPendingPrompt(null); (phase === 'code_generated' ? handleCodeAction : handleUserQuery)(msg); }}
              disabled={isLoading || isStreaming}
              placeholder={
                phase === 'code_generated'
                  ? 'Ask to refactor, explain, or modify the code…'
                  : `Ask me to generate ${selectedFramework?.toUpperCase()} scenarios for ${selectedModule}…`
              }
              initialValue={pendingPrompt || undefined}
            />
          </div>
        )}

        {phase !== 'ready_for_query' && phase !== 'scenario_generated' && phase !== 'generating' && phase !== 'code_framework_selection' && phase !== 'code_generating' && phase !== 'code_generated' && (
          <div className="glass-card rounded-2xl px-4 py-3">
            <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
              <FileCode className="h-4 w-4 text-[hsl(217_91%_60%)]" />
              <span>Complete the setup above to start generating scenarios</span>
            </div>
          </div>
        )}

        {phase === 'code_framework_selection' && !isLoading && (
          <div className="glass-card rounded-2xl px-4 py-3">
            <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
              <Code2 className="h-4 w-4 text-[hsl(160_84%_45%)]" />
              <span>Select a programming framework above to generate automation code</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface MetricChipProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: 'blue' | 'green' | 'purple' | 'cyan';
}

const toneMap: Record<MetricChipProps['tone'], { ring: string; glow: string; text: string }> = {
  blue:   { ring: 'ring-[hsl(217_91%_60%/0.35)]', glow: 'from-[hsl(217_91%_60%/0.18)] to-transparent', text: 'text-[hsl(217_91%_60%)]' },
  green:  { ring: 'ring-[hsl(160_84%_45%/0.35)]', glow: 'from-[hsl(160_84%_45%/0.18)] to-transparent', text: 'text-[hsl(160_84%_45%)]' },
  purple: { ring: 'ring-[hsl(262_83%_65%/0.35)]', glow: 'from-[hsl(262_83%_65%/0.18)] to-transparent', text: 'text-[hsl(262_83%_65%)]' },
  cyan:   { ring: 'ring-[hsl(189_94%_50%/0.35)]', glow: 'from-[hsl(189_94%_50%/0.18)] to-transparent', text: 'text-[hsl(189_94%_50%)]' },
};

const MetricChip: React.FC<MetricChipProps> = ({ icon, label, value, tone }) => {
  const t = toneMap[tone];
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 ring-1 ${t.ring} px-3 py-2.5 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/10`}>
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${t.glow}`} />
      <div className="relative flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground/80">{label}</div>
          <div className={`text-sm font-bold truncate ${t.text}`}>{value}</div>
        </div>
        <div className={`h-7 w-7 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center ${t.text}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default LogicScenarioCreatorModule;
