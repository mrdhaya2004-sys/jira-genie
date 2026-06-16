// Lightweight client-side event tracker that persists every meaningful user action
// to public.user_events. Designed to never throw and never block the UI.
import { supabase } from '@/integrations/supabase/client';

export type TrackPayload = {
  module: string;
  action: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
};

let cachedUserId: string | null | undefined;

async function getUserId(): Promise<string | null> {
  if (cachedUserId !== undefined) return cachedUserId;
  const { data } = await supabase.auth.getUser();
  cachedUserId = data.user?.id ?? null;
  return cachedUserId;
}

// Reset cache on auth changes so a re-login picks up the new id.
supabase.auth.onAuthStateChange(() => {
  cachedUserId = undefined;
});

export async function trackEvent({ module, action, durationMs = 0, metadata }: TrackPayload): Promise<void> {
  try {
    const user_id = await getUserId();
    if (!user_id) return;
    await supabase.from('user_events').insert([{
      user_id,
      module,
      action,
      duration_ms: Math.max(0, Math.floor(durationMs)),
      metadata: (metadata ?? {}) as never,
    }]);
  } catch {
    // Swallow — analytics must never break the app.
  }
}

// Fire-and-forget helper for convenience.
export function track(module: string, action: string, metadata?: Record<string, unknown>): void {
  void trackEvent({ module, action, metadata });
}
