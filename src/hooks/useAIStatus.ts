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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setConfig(null); return; }
      const { data } = await (supabase as any)
        .from('ai_provider_configs')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
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
    return () => window.removeEventListener('ai-config-updated', onChange);
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
