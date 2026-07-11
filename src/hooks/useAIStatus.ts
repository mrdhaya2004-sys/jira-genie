import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AIConfigStatus, AIProviderConfig } from '@/types/aiConfig';

export interface AIStatusInfo {
  isActivated: boolean;
  status: AIConfigStatus;
  config: AIProviderConfig | null;
  lastVerifiedAt: string | null;
  lastError: string | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

/**
 * Per-user AI activation status. Used by every AI module to decide whether
 * to allow execution and to render the warning banner.
 */
export const useAIStatus = (): AIStatusInfo => {
  const [config, setConfig] = useState<AIProviderConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      // Prefer the hydrated session to avoid a race where getUser() returns null
      // on first mount before Supabase has read the token from storage.
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) { setConfig(null); return; }
      const { data } = await (supabase as any)
        .from('ai_provider_configs')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setConfig((data as AIProviderConfig | null) ?? null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const onChange = () => load();
    window.addEventListener('ai-config-updated', onChange);
    // Re-fetch when auth hydrates / user signs in-out so the banner reflects
    // the correct AI status instead of staying stuck on "not connected".
    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) load();
      else setConfig(null);
    });
    return () => {
      window.removeEventListener('ai-config-updated', onChange);
      authSub.subscription.unsubscribe();
    };
  }, [load]);

  const status: AIConfigStatus = (config?.status as AIConfigStatus) ?? (config ? 'not_verified' : 'not_verified');

  return {
    isActivated: !!config && status === 'connected',
    status: config ? status : 'not_verified',
    config,
    lastVerifiedAt: config?.last_verified_at ?? null,
    lastError: config?.last_error ?? null,
    isLoading,
    refresh: load,
  };
};
