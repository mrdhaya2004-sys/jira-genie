import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Bottom-following auto-scroll for AI/chat modules.
 *
 * Behaviour (ChatGPT/Claude/Gemini style):
 * - When new content arrives (new message OR streaming chunk), keep the
 *   viewport pinned to the BOTTOM so the latest AI response stays visible.
 * - If the user scrolls up to read older content, auto-scrolling pauses.
 * - When the user scrolls back near the bottom, auto-scrolling resumes.
 * - Smooth scrolling with rAF batching for 120Hz smoothness.
 *
 * Works with a regular scrollable div OR a Radix ScrollArea (the inner
 * `[data-radix-scroll-area-viewport]` is resolved automatically).
 */
export interface UseAutoScrollOptions {
  /** Values to watch — used to trigger re-evaluation (e.g. streaming chunks). */
  dependencies?: ReadonlyArray<unknown>;
  /** Total message count. When this increases, force-follow to bottom. */
  messageCount?: number;
  /** Pixels from bottom still considered "at bottom". Default 120. */
  threshold?: number;
  /** Smooth-scroll for programmatic scrolls. Default true. */
  smooth?: boolean;
  /** Whether the hook is active. Default true. */
  enabled?: boolean;
}

export function useAutoScroll<T extends HTMLElement = HTMLDivElement>(
  options: UseAutoScrollOptions = {}
) {
  const {
    dependencies = [],
    messageCount,
    threshold = 120,
    smooth = true,
    enabled = true,
  } = options;

  const containerRef = useRef<T | null>(null);
  const stickRef = useRef(true);
  const prevCountRef = useRef<number | undefined>(messageCount);
  const rafRef = useRef<number | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const getViewport = useCallback((): HTMLElement | null => {
    const el = containerRef.current;
    if (!el) return null;
    const viewport = el.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]');
    return viewport ?? (el as unknown as HTMLElement);
  }, []);

  const pinToBottom = useCallback(
    (behavior: ScrollBehavior) => {
      const v = getViewport();
      if (!v) return;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        v.scrollTo({ top: v.scrollHeight, behavior });
      });
    },
    [getViewport]
  );

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = smooth ? 'smooth' : 'auto') => {
      stickRef.current = true;
      setIsAtBottom(true);
      pinToBottom(behavior);
    },
    [pinToBottom, smooth]
  );

  // Track manual scrolls — pause/resume sticky based on user position.
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

  // Force-follow when a new message is added (regardless of dependencies).
  useEffect(() => {
    if (!enabled || messageCount === undefined) return;
    const prev = prevCountRef.current;
    prevCountRef.current = messageCount;
    if (prev === undefined || messageCount <= prev) return;
    // New message — re-engage stick and pin to bottom.
    stickRef.current = true;
    setIsAtBottom(true);
    pinToBottom(smooth ? 'smooth' : 'auto');
  }, [enabled, messageCount, pinToBottom, smooth]);

  // Follow streaming content: when watched dependencies change, if the user
  // is still "stuck" at the bottom, keep them there.
  useEffect(() => {
    if (!enabled) return;
    if (!stickRef.current) return;
    pinToBottom(smooth ? 'smooth' : 'auto');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, smooth, pinToBottom, messageCount, ...dependencies]);

  // Observe content size changes (streaming chunks expanding the last
  // message). Keep pinned to bottom if user hasn't scrolled away.
  useEffect(() => {
    if (!enabled) return;
    const v = getViewport();
    if (!v) return;
    const target = v.firstElementChild ?? v;
    const ro = new ResizeObserver(() => {
      if (!stickRef.current) return;
      pinToBottom(smooth ? 'smooth' : 'auto');
    });
    ro.observe(target as Element);
    return () => ro.disconnect();
  }, [enabled, getViewport, pinToBottom, smooth]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return { containerRef, scrollToBottom, isAtBottom };
}
