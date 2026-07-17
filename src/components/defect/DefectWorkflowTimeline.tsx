import React from 'react';
import { Upload, Brain, Search, AlertTriangle, ShieldAlert, Wrench, CheckCircle2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DefectFlowPhase } from '@/types/defectAnalyzer';

interface Props {
  phase: DefectFlowPhase;
  isAnalyzing: boolean;
  hasResults: boolean;
  className?: string;
}

interface Stage {
  key: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
  glow: string;
}

const STAGES: Stage[] = [
  { key: 'upload',    label: 'Upload Bug',    icon: Upload,        color: '#2563EB', glow: 'rgba(37,99,235,0.35)' },
  { key: 'analysis',  label: 'AI Analysis',   icon: Brain,         color: '#10B981', glow: 'rgba(16,185,129,0.35)' },
  { key: 'rootcause', label: 'Root Cause',    icon: Search,        color: '#7C3AED', glow: 'rgba(124,58,237,0.35)' },
  { key: 'severity',  label: 'Severity',      icon: AlertTriangle, color: '#DC2626', glow: 'rgba(220,38,38,0.35)' },
  { key: 'risk',      label: 'Risk',          icon: ShieldAlert,   color: '#F59E0B', glow: 'rgba(245,158,11,0.35)' },
  { key: 'fix',       label: 'Suggested Fix', icon: Wrench,        color: '#0EA5E9', glow: 'rgba(14,165,233,0.35)' },
  { key: 'completed', label: 'Completed',     icon: CheckCircle2,  color: '#22C55E', glow: 'rgba(34,197,94,0.35)' },
];

const phaseToStep = (phase: DefectFlowPhase, isAnalyzing: boolean, hasResults: boolean): number => {
  if (hasResults && !isAnalyzing) return STAGES.length;
  if (isAnalyzing) return 3;
  switch (phase) {
    case 'workspace_selection':
    case 'os_selection':
    case 'report_upload':
      return 1;
    case 'ready':
      return 2;
    case 'analyzing':
      return 3;
    case 'results':
      return STAGES.length;
    default:
      return 1;
  }
};

const DefectWorkflowTimeline: React.FC<Props> = ({ phase, isAnalyzing, hasResults, className }) => {
  const current = phaseToStep(phase, isAnalyzing, hasResults);

  return (
    <div
      className={cn(
        'relative rounded-3xl border border-white/15 bg-white/[0.06] shadow-[0_20px_60px_-24px_rgba(37,99,235,0.25)]',
        className,
      )}
      style={{ backdropFilter: 'blur(35px) saturate(150%)', WebkitBackdropFilter: 'blur(35px) saturate(150%)', padding: '24px 32px' }}
    >
      <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#10B981]/50 to-transparent" />

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-[0.16em] font-semibold bg-gradient-to-r from-[#2563EB] via-[#10B981] to-[#7C3AED] bg-clip-text text-transparent">
            AI Workflow
          </span>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1 text-[11px] font-semibold text-foreground/80 backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB] shadow-[0_0_8px_rgba(37,99,235,0.8)]" />
          Step <span className="tabular-nums text-foreground">{Math.min(current, STAGES.length)}</span>
          <span className="opacity-50">of</span>
          <span className="tabular-nums">{STAGES.length}</span>
        </div>
      </div>

      {/* Steps */}
      <div
        className="overflow-x-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style>{`.tz-hide-scroll::-webkit-scrollbar{display:none}`}</style>
        <ol className="tz-hide-scroll grid grid-flow-col auto-cols-fr items-start gap-2 min-w-[720px]">
          {STAGES.map((s, i) => {
            const idx = i + 1;
            const done = idx < current;
            const active = idx === current && !hasResults;
            const reached = idx <= current;
            const Icon = s.icon;
            const nextReached = idx < current;

            return (
              <li key={s.key} className="group flex flex-col items-center text-center">
                {/* Node row with connectors */}
                <div className="relative w-full flex items-center justify-center" style={{ height: 64 }}>
                  {i > 0 && (
                    <div
                      className="absolute left-0 right-1/2 top-1/2 -translate-y-1/2 transition-all duration-500"
                      style={{
                        height: 3,
                        borderRadius: 999,
                        marginRight: 4,
                        background: reached
                          ? `linear-gradient(to right, ${STAGES[i - 1].color}, ${s.color})`
                          : '#E5E7EB',
                        opacity: reached ? 1 : 0.35,
                      }}
                    />
                  )}
                  {i < STAGES.length - 1 && (
                    <div
                      className="absolute right-0 left-1/2 top-1/2 -translate-y-1/2 transition-all duration-500"
                      style={{
                        height: 3,
                        borderRadius: 999,
                        marginLeft: 4,
                        background: nextReached
                          ? `linear-gradient(to right, ${s.color}, ${STAGES[i + 1].color})`
                          : '#E5E7EB',
                        opacity: nextReached ? 1 : 0.35,
                      }}
                    />
                  )}

                  {/* Icon */}
                  <div
                    className={cn(
                      'relative z-10 flex items-center justify-center rounded-full transition-all duration-[220ms] ease-out',
                      'group-hover:-translate-y-0.5 group-hover:scale-[1.03]',
                    )}
                    style={
                      active
                        ? {
                            width: 56,
                            height: 56,
                            background: 'linear-gradient(135deg, #2563EB 0%, #10B981 100%)',
                            boxShadow: '0 12px 35px rgba(37,99,235,0.25)',
                            border: '1px solid rgba(255,255,255,0.25)',
                            color: '#fff',
                          }
                        : reached
                        ? {
                            width: 44,
                            height: 44,
                            background: `linear-gradient(135deg, ${s.color} 0%, ${s.color}CC 100%)`,
                            boxShadow: `0 8px 20px -8px ${s.glow}`,
                            border: '1px solid rgba(255,255,255,0.25)',
                            color: '#fff',
                          }
                        : {
                            width: 44,
                            height: 44,
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            color: 'hsl(var(--muted-foreground))',
                          }
                    }
                  >
                    {active && (
                      <span
                        className="absolute inset-0 rounded-full animate-ping"
                        style={{ background: '#2563EB', opacity: 0.2 }}
                      />
                    )}
                    <Icon style={{ width: 20, height: 20 }} className="relative" />

                    {done && (
                      <span
                        className="absolute -top-1 -right-1 flex items-center justify-center rounded-full border border-white/70 animate-scale-in"
                        style={{ width: 16, height: 16, background: '#22C55E', boxShadow: '0 0 8px rgba(34,197,94,0.5)' }}
                      >
                        <Check style={{ width: 10, height: 10 }} className="text-white" strokeWidth={3} />
                      </span>
                    )}
                  </div>
                </div>

                {/* Label */}
                <div
                  className="mt-2 px-1 text-center break-words"
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    lineHeight: 1.4,
                    color: active ? '#2563EB' : reached ? 'hsl(var(--foreground))' : '#64748B',
                  }}
                >
                  {s.label}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
};

export default DefectWorkflowTimeline;
