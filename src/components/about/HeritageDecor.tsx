import React from 'react';

/** Animated kolam (rangoli-style) mandala — concentric petals & dots. */
export const KolamMandala: React.FC<{ className?: string; stroke?: string }> = ({
  className,
  stroke = 'currentColor',
}) => (
  <svg
    viewBox="0 0 200 200"
    className={`heritage-kolam ${className ?? ''}`}
    fill="none"
    stroke={stroke}
    strokeWidth="0.8"
    aria-hidden="true"
  >
    <g opacity="0.9">
      <circle cx="100" cy="100" r="6" />
      <circle cx="100" cy="100" r="22" />
      <circle cx="100" cy="100" r="44" />
      <circle cx="100" cy="100" r="68" />
      <circle cx="100" cy="100" r="92" strokeDasharray="2 3" />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i * Math.PI * 2) / 12;
        const x1 = 100 + Math.cos(a) * 22;
        const y1 = 100 + Math.sin(a) * 22;
        const x2 = 100 + Math.cos(a) * 92;
        const y2 = 100 + Math.sin(a) * 92;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
      })}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i * Math.PI * 2) / 8 + Math.PI / 8;
        const cx = 100 + Math.cos(a) * 56;
        const cy = 100 + Math.sin(a) * 56;
        return (
          <path
            key={`p-${i}`}
            d={`M ${cx} ${cy} q -8 -10 0 -20 q 8 10 0 20 z`}
            transform={`rotate(${(a * 180) / Math.PI + 90} ${cx} ${cy})`}
          />
        );
      })}
      {Array.from({ length: 16 }).map((_, i) => {
        const a = (i * Math.PI * 2) / 16;
        const cx = 100 + Math.cos(a) * 92;
        const cy = 100 + Math.sin(a) * 92;
        return <circle key={`d-${i}`} cx={cx} cy={cy} r="1.5" fill={stroke} stroke="none" />;
      })}
    </g>
  </svg>
);

/** Stylised gopuram (temple tower) silhouette. */
export const TempleSilhouette: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg
    viewBox="0 0 200 240"
    className={className}
    style={style}
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M100 4 L112 22 L100 28 L88 22 Z" opacity="0.9" />
    <rect x="96" y="28" width="8" height="10" />
    {[0, 1, 2, 3, 4].map((i) => {
      const y = 40 + i * 28;
      const w = 60 + i * 16;
      const x = 100 - w / 2;
      return (
        <g key={i}>
          <path
            d={`M ${x} ${y + 24} L ${x + w} ${y + 24} L ${x + w - 6} ${y} L ${x + 6} ${y} Z`}
            opacity={0.85 - i * 0.08}
          />
          <rect x={x + 4} y={y + 4} width={w - 8} height="3" opacity="0.4" />
          <rect x={x + 4} y={y + 14} width={w - 8} height="3" opacity="0.4" />
        </g>
      );
    })}
    <rect x="80" y="200" width="40" height="36" opacity="0.95" />
    <path d="M88 236 L88 210 Q100 200 112 210 L112 236 Z" fill="hsl(0 0% 0% / 0.4)" />
  </svg>
);

/** Animated diya (oil lamp) flame. */
export const DiyaFlame: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 60 90" className={className} aria-hidden="true">
    <defs>
      <radialGradient id="flameGrad" cx="50%" cy="60%" r="55%">
        <stop offset="0%" stopColor="hsl(50 100% 75%)" />
        <stop offset="55%" stopColor="hsl(30 100% 55%)" />
        <stop offset="100%" stopColor="hsl(15 100% 45% / 0)" />
      </radialGradient>
      <radialGradient id="lampGrad" cx="50%" cy="50%" r="60%">
        <stop offset="0%" stopColor="hsl(40 70% 55%)" />
        <stop offset="100%" stopColor="hsl(30 60% 30%)" />
      </radialGradient>
    </defs>
    <g className="heritage-flame">
      <path
        d="M30 12 C 22 28, 22 38, 30 46 C 38 38, 38 28, 30 12 Z"
        fill="url(#flameGrad)"
      />
      <ellipse cx="30" cy="38" rx="3" ry="6" fill="hsl(45 100% 90% / 0.9)" />
    </g>
    <rect x="28" y="46" width="4" height="6" fill="hsl(30 30% 25%)" />
    <path d="M10 56 Q30 48 50 56 L46 64 Q30 60 14 64 Z" fill="url(#lampGrad)" />
    <rect x="26" y="64" width="8" height="14" fill="url(#lampGrad)" />
    <ellipse cx="30" cy="80" rx="14" ry="3" fill="hsl(30 60% 30%)" />
  </svg>
);

/** Floating embers for ambient warmth. */
export const Embers: React.FC<{ count?: number; className?: string }> = ({
  count = 14,
  className,
}) => (
  <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ''}`} aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => {
      const left = (i * 53) % 100;
      const delay = (i * 0.7) % 5;
      const dur = 4 + ((i * 1.3) % 4);
      const size = 3 + (i % 4);
      return (
        <span
          key={i}
          className="heritage-ember"
          style={{
            left: `${left}%`,
            width: `${size}px`,
            height: `${size}px`,
            animationDelay: `${delay}s`,
            animationDuration: `${dur}s`,
          }}
        />
      );
    })}
  </div>
);
