import React from 'react';
import { Upload, Brain, Search, AlertTriangle, ShieldAlert, Wrench, CheckCircle2 } from 'lucide-react';
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
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  glow: string;
}

const STAGES: Stage[] = [
  { key: 'upload',      label: 'Upload Bug',      icon: Upload,        color: '#2563EB', glow: 'rgba(37,99,235,0.55)' },
  { key: 'analysis',    label: 'AI Analysis',     icon: Brain,         color: '#10B981', glow: 'rgba(16,185,129,0.55)' },
  { key: 'rootcause',   label: 'Root Cause',      icon: Search,        color: '#7C3AED', glow: 'rgba(124,58,237,0.55)' },
  { key: 'severity',    label: 'Severity',        icon: AlertTriangle, color: '#DC2626', glow: 'rgba(220,38,38,0.55)' },
  { key: 'risk',        label: 'Risk',            icon: ShieldAlert,   color: '#F59E0B', glow: 'rgba(245,158,11,0.55)' },
  { key: 'fix',         label: 'Suggested Fix',   icon: Wrench,        color: '#0EA5E9', glow: 'rgba(14,165,233,0.55)' },
  { key: 'completed',   label: 'Completed',       icon: CheckCircle2,  color: '#22C55E', glow: 'rgba(34,197,94,0.55)' },
];

// Map high-level flow phase → current stage index (1-based).
const phaseToStep = (phase: DefectFlowPhase, isAnalyzing: boolean, hasResults: boolean): number => {
  if (hasResults && !isAnalyzing) return STAGES.length; // completed
  if (isAnalyzing) return 3; // running through analysis/root cause
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
        'relative rounded-2xl border border-white/15 bg-white/[0.06] backdrop-blur-[35px] backdrop-saturate-150 shadow-[0_20px_60px_-24px_rgba(37,99,235,0.25)] px-3 sm:px-5 py-3',
        className,
      )}
    >
      <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#10B981]/50 to-transparent" />

      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] uppercase tracking-[0.14em] font-semibold bg-gradient-to-r from-[#2563EB] via-[#10B981] to-[#7C3AED] bg-clip-text text-transparent">
          AI Workflow
        </span>
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {Math.min(current, STAGES.length)}/{STAGES.length}
        </span>
      </div>

      <ol className="flex items-stretch justify-between gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
        {STAGES.map((s, i) => {
          const idx = i + 1;
          const done = idx < current;
          const active = idx === current && !hasResults;
          const complete = idx <= current && (hasResults || done);
          const reached = idx <= current;
          const Icon = s.icon;
          const nextReached = idx < current;

          return (
            <li key={s.key} className="flex-1 min-w-[78px] flex flex-col items-center text-center">
              <div className="relative w-full flex items-center justify-center mb-1.5">
                {/* Connector – left */}
                {i > 0 && (
                  <div
                    className="absolute left-0 right-1/2 h-[2px] rounded-full top-1/2 -translate-y-1/2 transition-all duration-500"
                    style={{
                      background: reached
                        ? `linear-gradient(to right, ${STAGES[i - 1].color}80, ${s.color})`
                        : 'rgba(255,255,255,0.10)',
                    }}
                  />
                )}
                {/* Connector – right */}
                {i < STAGES.length - 1 && (
                  <div
                    className="absolute right-0 left-1/2 h-[2px] rounded-full top-1/2 -translate-y-1/2 transition-all duration-500"
                    style={{
                      background: nextReached
                        ? `linear-gradient(to right, ${s.color}, ${STAGES[i + 1].color}80)`
                        : 'rgba(255,255,255,0.10)',
                    }}
                  />
                )}

                {/* Node */}
                <div
                  className={cn(
                    'relative z-10 h-9 w-9 rounded-full flex items-center justify-center border transition-all duration-300',
                    reached
                      ? 'border-white/30 text-white'
                      : 'border-white/15 bg-white/[0.06] text-muted-foreground backdrop-blur',
                    active && 'scale-110',
                  )}
                  style={
                    reached
                      ? {
                          background: `linear-gradient(135deg, ${s.color} 0%, ${s.color}CC 100%)`,
                          boxShadow: `0 8px 24px -8px ${s.glow}`,
                        }
                      : undefined
                  }
                >
                  {active && (
                    <span
                      className="absolute inset-0 rounded-full animate-ping"
                      style={{ background: s.color, opacity: 0.35 }}
                    />
                  )}
                  {active && (
                    <span
                      className="absolute -inset-1 rounded-full blur-md opacity-70 animate-pulse"
                      style={{ background: s.color }}
                    />
                  )}
                  <Icon className="relative h-4 w-4" />

                  {complete && idx === STAGES.length && (
                    <span
                      className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border border-white/60"
                      style={{ background: s.color, boxShadow: `0 0 8px ${s.glow}` }}
                    />
                  )}
                </div>
              </div>

              <span
                className={cn(
                  'text-[10.5px] font-semibold leading-tight tracking-tight transition-colors duration-300 truncate max-w-full px-0.5',
                  reached ? 'text-foreground' : 'text-muted-foreground/70',
                )}
                style={active ? { color: s.color } : undefined}
              >
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default DefectWorkflowTimeline;
