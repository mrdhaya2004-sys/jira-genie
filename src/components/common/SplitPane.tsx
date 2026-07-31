import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Premium iOS 26 Glass splitter — reusable across any dual-pane workspace
 * (Studio editor ↔ AI Insights, Results, Console, Terminal, Debug, Reports).
 *
 * Reports pointer deltas in px; the parent clamps and applies sizes so
 * min/max rules stay pane-specific. Drag runs on pointer events with
 * capture for 60 FPS, no flicker, and no text selection.
 */
export interface SplitterProps {
  /** 'vertical' = vertical bar resizing width; 'horizontal' = horizontal bar resizing height */
  orientation?: 'vertical' | 'horizontal';
  onDelta: (deltaPx: number) => void;
  onReset?: () => void;
  onDragStateChange?: (dragging: boolean) => void;
  dark?: boolean;
  label?: string;
  className?: string;
}

export const Splitter: React.FC<SplitterProps> = ({
  orientation = 'vertical',
  onDelta,
  onReset,
  onDragStateChange,
  dark = false,
  label = 'Resize panel',
  className,
}) => {
  const vertical = orientation === 'vertical';
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);
  const last = useRef(0);
  const pending = useRef(0);
  const frame = useRef(0);
  const onDeltaRef = useRef(onDelta);
  onDeltaRef.current = onDelta;

  useEffect(() => {
    onDragStateChange?.(dragging);
    if (!dragging) return;
    const prevCursor = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.cursor = vertical ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevSelect;
    };
  }, [dragging, vertical, onDragStateChange]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  // Coalesce every pointer delta into one commit per animation frame:
  // deltas accumulate (never dropped) and only one layout pass runs per frame.
  const flush = useCallback(() => {
    frame.current = 0;
    const d = pending.current;
    pending.current = 0;
    if (d) onDeltaRef.current(d);
  }, []);

  const schedule = useCallback((delta: number) => {
    pending.current += delta;
    if (frame.current) return;
    frame.current = requestAnimationFrame(flush);
  }, [flush]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    last.current = vertical ? e.clientX : e.clientY;
    pending.current = 0;
    draggingRef.current = true;
    setDragging(true);
  }, [vertical]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    // Use coalesced events when available so a burst of moves costs one commit.
    const events = typeof e.nativeEvent.getCoalescedEvents === 'function'
      ? e.nativeEvent.getCoalescedEvents()
      : [];
    const cur = events.length
      ? (vertical ? events[events.length - 1].clientX : events[events.length - 1].clientY)
      : (vertical ? e.clientX : e.clientY);
    const delta = cur - last.current;
    if (!delta) return;
    last.current = cur;
    schedule(delta);
  }, [vertical, schedule]);

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (frame.current) {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      flush();
    }
    draggingRef.current = false;
    setDragging(false);
  }, [flush]);


  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 32 : 12;
    if (vertical && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      onDelta(e.key === 'ArrowLeft' ? -step : step);
    }
    if (!vertical && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      onDelta(e.key === 'ArrowUp' ? -step : step);
    }
    if (e.key === 'Enter' || e.key === 'Home') { e.preventDefault(); onReset?.(); }
  }, [vertical, onDelta, onReset]);

  return (
    <div
      role="separator"
      aria-orientation={vertical ? 'vertical' : 'horizontal'}
      aria-label={label}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={onReset}
      onKeyDown={handleKeyDown}
      className={cn(
        'group relative shrink-0 z-20 touch-none outline-none',
        'transition-[width,height,background-color] duration-150 ease-out',
        vertical
          ? 'w-[6px] hover:w-[10px] cursor-col-resize focus-visible:w-[10px]'
          : 'h-[6px] hover:h-[10px] cursor-row-resize focus-visible:h-[10px]',
        dragging && (vertical ? 'w-[10px]' : 'h-[10px]'),
        dark ? 'bg-white/5' : 'bg-white/40',
        'backdrop-blur-xl',
        className,
      )}
      style={{ willChange: vertical ? 'width' : 'height' }}
    >
      {/* Glow layer */}
      <div
        className={cn(
          'absolute inset-0 rounded-full transition-opacity duration-200 pointer-events-none',
          vertical
            ? 'bg-gradient-to-b from-[#2563EB]/70 via-[#06B6D4]/70 to-[#8B5CF6]/60'
            : 'bg-gradient-to-r from-[#2563EB]/70 via-[#06B6D4]/70 to-[#8B5CF6]/60',
          dragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-90 group-focus-visible:opacity-90',
        )}
      />
      {/* Soft shadow / halo when active */}
      <div
        className={cn(
          'absolute inset-0 pointer-events-none transition-opacity duration-200',
          dragging ? 'opacity-100' : 'opacity-0',
          vertical
            ? 'shadow-[0_0_18px_2px_rgba(37,99,235,0.45)]'
            : 'shadow-[0_0_18px_2px_rgba(37,99,235,0.45)]',
        )}
      />
      {/* Grip pill */}
      <div
        className={cn(
          'absolute rounded-full transition-all duration-200 pointer-events-none',
          vertical
            ? 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[3px] h-10'
            : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[3px] w-10',
          dark ? 'bg-white/25' : 'bg-slate-400/45',
          'group-hover:bg-white/80',
          dragging && 'bg-white/95',
        )}
      />
    </div>
  );
};

/** Persisted pane size with clamping — restores automatically on next visit/login. */
export function usePersistedSize(key: string, initial: number, min: number, max: number) {
  const clamp = useCallback((v: number) => Math.min(max, Math.max(min, v)), [min, max]);
  const [size, setSize] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw != null) {
        const n = Number(raw);
        if (Number.isFinite(n)) return Math.min(max, Math.max(min, n));
      }
    } catch { /* ignore */ }
    return initial;
  });

  useEffect(() => {
    try { localStorage.setItem(key, String(size)); } catch { /* ignore */ }
  }, [key, size]);

  const nudge = useCallback((delta: number) => setSize(s => clamp(s + delta)), [clamp]);
  const set = useCallback((v: number) => setSize(clamp(v)), [clamp]);
  const reset = useCallback(() => setSize(clamp(initial)), [clamp, initial]);

  return { size, setSize: set, nudge, reset };
}

/** Persisted boolean (e.g. collapsed state). */
export function usePersistedFlag(key: string, initial: boolean) {
  const [value, setValue] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === '1') return true;
      if (raw === '0') return false;
    } catch { /* ignore */ }
    return initial;
  });
  useEffect(() => {
    try { localStorage.setItem(key, value ? '1' : '0'); } catch { /* ignore */ }
  }, [key, value]);
  return [value, setValue] as const;
}

export default Splitter;
