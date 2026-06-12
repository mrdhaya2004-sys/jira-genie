import React from 'react';
import { cn } from '@/lib/utils';

interface Props {
  value: number;
  label?: string;
  size?: number;
  stroke?: number;
  showValue?: boolean;
  className?: string;
}

const tone = (n: number) =>
  n >= 85 ? { ring: 'hsl(152 70% 42%)', text: 'text-emerald-500' }
  : n >= 70 ? { ring: 'hsl(38 92% 50%)',  text: 'text-amber-500' }
  : n >= 50 ? { ring: 'hsl(20 95% 55%)',  text: 'text-orange-500' }
  : { ring: 'hsl(0 84% 60%)', text: 'text-rose-500' };

const ScoreRing: React.FC<Props> = ({ value, label, size = 120, stroke = 8, showValue = true, className }) => {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  const offset = c - (v / 100) * c;
  const t = tone(v);
  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <defs>
            <linearGradient id={`hca-ring-g-${size}-${v}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={t.ring} stopOpacity="0.95" />
              <stop offset="100%" stopColor={t.ring} stopOpacity="0.7" />
            </linearGradient>
          </defs>
          <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke}
            className="fill-none stroke-muted/60" />
          <circle
            cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} strokeLinecap="round"
            stroke={`url(#hca-ring-g-${size}-${v})`} className="fill-none hca-ring-anim"
            strokeDasharray={c} strokeDashoffset={offset}
            style={{ ['--hca-ring-start' as never]: c, ['--hca-ring-end' as never]: offset }}
          />
        </svg>
        {showValue && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn('font-semibold tabular-nums', t.text)} style={{ fontSize: size * 0.26 }}>{v}</span>
            <span className="text-[10px] text-muted-foreground/70 -mt-0.5">/ 100</span>
          </div>
        )}
      </div>
      {label && <span className="text-[11px] uppercase tracking-wide text-muted-foreground text-center">{label}</span>}
    </div>
  );
};

export default ScoreRing;
