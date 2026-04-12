import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useHiveAISettings() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Listen for cross-component preference updates
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail.hive_chat_enabled === 'boolean') {
        setEnabled(detail.hive_chat_enabled);
      }
    };
    window.addEventListener('user-preferences-updated', handler);
    return () => window.removeEventListener('user-preferences-updated', handler);
  }, []);

  // Fetch on mount
  useEffect(() => {
    if (!user) { setIsLoading(false); return; }

    const fetch = async () => {
      setIsLoading(true);
      const { data } = await (supabase as any)
        .from('user_settings')
        .select('hive_chat_enabled')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data !== null && data !== undefined) {
        setEnabled(data.hive_chat_enabled);
      }
      setIsLoading(false);
    };
    fetch();
  }, [user]);

  const setHiveEnabled = useCallback(async (newVal: boolean) => {
    if (!user) return;

    setEnabled(newVal);
    window.dispatchEvent(new CustomEvent('user-preferences-updated', { detail: { hive_chat_enabled: newVal } }));

    await (supabase as any)
      .from('user_settings')
      .upsert(
        { user_id: user.id, hive_chat_enabled: newVal },
        { onConflict: 'user_id' }
      );
  }, [user]);

  return { hiveEnabled: enabled, isLoading, setHiveEnabled };
}
