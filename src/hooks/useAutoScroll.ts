import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Smart, ChatGPT-style scroll manager for AI/chat modules.
 *
 * Goals:
 * - When a new message appears, scroll the START of that message into view
 *   (not the bottom). The user can read the answer from the top as it streams.
 * - During streaming (content growing inside the same message), DO NOT keep
 *   forcing the viewport to the bottom. Maintain a stable reading position.
 * - If the user has scrolled up to read older messages, never force-scroll.
 * - Expose `scrollToBottom` and `isAtBottom` so a "Jump to latest" button
 *   can let the user opt back into following the stream.
 *
 * Works with a regular scrollable div OR a Radix ScrollArea (the inner
 * `[data-radix-scroll-area-viewport]` is resolved automatically).
 */
export interface UseAutoScrollOptions {
  /** Values to watch — used to trigger re-evaluation (e.g. streaming chunks). */
  dependencies?: ReadonlyArray<unknown>;
  /**
   * Total message count. When this increases, the hook anchors the newest
   * message to the top of the viewport (ChatGPT behaviour). When omitted,
   * the hook falls back to legacy bottom-pinning behaviour.
   */
  messageCount?: number;
  /** Pixels from bottom still considered "at bottom". Default 80. */
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
    threshold = 80,
    smooth = true,
    enabled = true,
  } = options;

  const containerRef = useRef<T | null>(null);
  const stickRef = useRef(true);
  const prevCountRef = useRef<number | undefined>(messageCount);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const getViewport = useCallback((): HTMLElement | null => {
    const el = containerRef.current;
    if (!el) return null;
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

  // Track manual user scrolls — decides whether the hook may auto-scroll.
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

  // ChatGPT-style anchor: when a new message is added, align its TOP with the
  // viewport top — but only if the user wasn't reading older messages.
  useEffect(() => {
    if (!enabled || messageCount === undefined) return;
    const prev = prevCountRef.current;
    prevCountRef.current = messageCount;
    if (prev === undefined || messageCount <= prev) return;
    if (!stickRef.current) return; // user is reading older content — don't interrupt

    const v = getViewport();
    if (!v) return;

    const id = requestAnimationFrame(() => {
      const last = v.lastElementChild as HTMLElement | null;
      if (!last) return;
      // Position the start of the new message at (or near) the top of the viewport.
      const targetTop = Math.max(0, last.offsetTop - 8);
      v.scrollTo({ top: targetTop, behavior: smooth ? 'smooth' : 'auto' });
    });
    return () => cancelAnimationFrame(id);
  }, [enabled, smooth, messageCount, getViewport]);

  // Legacy fallback: when `messageCount` is NOT provided, keep the previous
  // bottom-pinning behaviour for any consumers that haven't migrated yet.
  useEffect(() => {
    if (!enabled || messageCount !== undefined) return;
    if (!stickRef.current) return;
    const v = getViewport();
    if (!v) return;
    const id = requestAnimationFrame(() => {
      v.scrollTo({ top: v.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, smooth, messageCount, getViewport, ...dependencies]);

  // NOTE: We intentionally do NOT observe content resizes to pin to bottom.
  // That was causing the "jumps to bottom while streaming" behaviour the
  // user complained about. Streaming chunks now grow naturally below the
  // anchored response; the "Jump to latest" button (using scrollToBottom)
  // lets the user opt back in.

  return { containerRef, scrollToBottom, isAtBottom };
}
