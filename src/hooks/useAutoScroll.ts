import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Reusable smart auto-scroll for AI/chat modules.
 *
 * - Smoothly keeps view pinned to the bottom while content streams in
 * - If the user scrolls up, auto-scroll pauses until they return near bottom
 * - Exposes `scrollToBottom` and `isAtBottom` for a "Scroll to bottom" UI
 *
 * Works with either a regular scrollable div OR a Radix ScrollArea.
 * Pass the ref to the scrollable element (or to the ScrollArea Root and we'll
 * resolve the inner viewport via `[data-radix-scroll-area-viewport]`).
 */
export interface UseAutoScrollOptions {
  /** Values to watch — scrolling is reconsidered whenever any change. */
  dependencies?: ReadonlyArray<unknown>;
  /** Pixels from the bottom still considered "at bottom". Default 80. */
  threshold?: number;
  /** Whether to smooth-scroll. Default true. */
  smooth?: boolean;
  /** Whether the hook is actively driving scroll (e.g. streaming). Default true. */
  enabled?: boolean;
}

export function useAutoScroll<T extends HTMLElement = HTMLDivElement>(
  options: UseAutoScrollOptions = {}
) {
  const { dependencies = [], threshold = 80, smooth = true, enabled = true } = options;

  const containerRef = useRef<T | null>(null);
  const stickRef = useRef(true);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const getViewport = useCallback((): HTMLElement | null => {
    const el = containerRef.current;
    if (!el) return null;
    // Radix ScrollArea exposes a viewport child
    const viewport = el.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]');
    return viewport ?? (el as unknown as HTMLElement);
  }, []);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = smooth ? 'smooth' : 'auto') => {
      const v = getViewport();
      if (!v) return;
      stickRef.current = true;
      v.scrollTo({ top: v.scrollHeight, behavior });
      setIsAtBottom(true);
    },
    [getViewport, smooth]
  );

  // Track manual user scrolls to decide whether to keep sticking to bottom
  useEffect(() => {
    const v = getViewport();
    if (!v) return;
    const onScroll = () => {
      const distance = v.scrollHeight - v.scrollTop - v.clientHeight;
      const atBottom = distance <= threshold;
      stickRef.current = atBottom;
      setIsAtBottom(atBottom);
    };
    v.addEventListener('scroll', onScroll, { passive: true });
    return () => v.removeEventListener('scroll', onScroll);
  }, [getViewport, threshold]);

  // Scroll on dependency changes (new message, streaming chunk, typing flag…)
  useEffect(() => {
    if (!enabled) return;
    if (!stickRef.current) return;
    const v = getViewport();
    if (!v) return;
    // rAF lets new DOM size settle before scrolling
    const id = requestAnimationFrame(() => {
      v.scrollTo({ top: v.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, smooth, getViewport, ...dependencies]);

  // Observe inner content size changes for streaming responses
  useEffect(() => {
    if (!enabled) return;
    const v = getViewport();
    if (!v) return;
    const target = v.firstElementChild ?? v;
    const ro = new ResizeObserver(() => {
      if (!stickRef.current) return;
      v.scrollTo({ top: v.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    });
    ro.observe(target);
    return () => ro.disconnect();
  }, [enabled, smooth, getViewport]);

  return { containerRef, scrollToBottom, isAtBottom };
}
