import React from 'react';
import { Upload, ScanLine, FileSearch, Wand2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  /** 0 = idle, 1 = uploaded, 2 = analyzing, 3 = review, 4 = refactor, 5 = complete */
  step: number;
  className?: string;
}

const STEPS = [
  { key: 'upload',   label: 'Code Uploaded',     icon: Upload },
  { key: 'analyze',  label: 'Analysis Started',  icon: ScanLine },
  { key: 'review',   label: 'Review Generated',  icon: FileSearch },
  { key: 'refactor', label: 'Refactor Generated',icon: Wand2 },
  { key: 'done',     label: 'Completed',         icon: CheckCircle2 },
];

const AnalysisTimeline: React.FC<Props> = ({ step, className }) => {
  return (
    <div className={cn('hca-glass p-4 sm:p-5 hca-rise', className)}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Workflow</span>
        <div className="flex-1 h-px bg-border/60" />
      </div>
      <ol className="flex items-stretch justify-between gap-2 overflow-x-auto">
        {STEPS.map((s, i) => {
          const active = i + 1 <= step;
          const current = i + 1 === step;
          const Icon = s.icon;
          return (
            <li key={s.key} className="flex-1 min-w-[88px] flex flex-col items-center text-center">
              <div className="relative w-full flex items-center justify-center mb-2">
                {i > 0 && (
                  <div className={cn('absolute left-0 right-1/2 h-[2px] rounded-full top-1/2 -translate-y-1/2',
                    active ? 'bg-gradient-to-r from-primary/60 to-primary' : 'bg-border/60')} />
                )}
                {i < STEPS.length - 1 && (
                  <div className={cn('absolute right-0 left-1/2 h-[2px] rounded-full top-1/2 -translate-y-1/2',
                    i + 1 < step ? 'bg-gradient-to-r from-primary to-primary/60' : 'bg-border/60')} />
                )}
                <div
                  className={cn(
                    'relative z-10 h-9 w-9 rounded-full flex items-center justify-center border transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground border-primary shadow-[0_8px_24px_-10px_hsl(var(--glow-primary))]'
                      : 'bg-card/70 text-muted-foreground border-border/60 backdrop-blur',
                    current && 'hca-pulse-soft hca-step-pop',
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <span className={cn('text-[11px] font-medium leading-tight',
                active ? 'text-foreground' : 'text-muted-foreground')}>{s.label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default AnalysisTimeline;
