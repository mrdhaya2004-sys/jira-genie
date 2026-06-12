import React, { useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface SegmentedItem {
  value: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
}

interface Props {
  items: SegmentedItem[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
  ariaLabel?: string;
}

const SegmentedControl: React.FC<Props> = ({ items, value, onChange, className, ariaLabel }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [thumb, setThumb] = useState<{ x: number; w: number }>({ x: 4, w: 0 });

  useLayoutEffect(() => {
    const el = refs.current[value];
    const wrap = wrapRef.current;
    if (!el || !wrap) return;
    const elRect = el.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();
    setThumb({ x: elRect.left - wrapRect.left, w: elRect.width });
  }, [value, items.length]);

  return (
    <div ref={wrapRef} role="tablist" aria-label={ariaLabel} className={cn('hca-segmented', className)}>
      <span
        className="hca-segmented-thumb"
        style={{ transform: `translateX(${thumb.x - 4}px)`, width: thumb.w }}
        aria-hidden
      />
      {items.map((it) => (
        <button
          key={it.value}
          ref={(r) => { refs.current[it.value] = r; }}
          type="button"
          role="tab"
          aria-selected={value === it.value}
          data-active={value === it.value}
          className="hca-segmented-item"
          onClick={() => onChange(it.value)}
        >
          {it.icon}
          {it.label}
        </button>
      ))}
    </div>
  );
};

export default SegmentedControl;
