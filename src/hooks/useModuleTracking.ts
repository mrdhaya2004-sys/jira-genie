import { useEffect, useRef } from 'react';
import { trackEvent } from '@/lib/eventTracker';

/**
 * Tracks how long a user spends inside a module.
 * Emits `module_opened` on mount and `module_closed` (with duration) on unmount/change.
 */
export function useModuleTracking(module: string | null | undefined) {
  const openedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!module) return;
    openedAtRef.current = Date.now();
    void trackEvent({ module, action: 'module_opened' });

    return () => {
      const opened = openedAtRef.current;
      if (opened) {
        const durationMs = Date.now() - opened;
        void trackEvent({ module, action: 'module_closed', durationMs });
      }
    };
  }, [module]);
}
