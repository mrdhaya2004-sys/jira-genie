import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

let globalListeners: Array<(enabled: boolean) => void> = [];

function notifyAll(enabled: boolean) {
  globalListeners.forEach(fn => fn(enabled));
}

export function useHiveAISettings() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Subscribe to cross-component sync
  useEffect(() => {
    const handler = (val: boolean) => setEnabled(val);
    globalListeners.push(handler);
    return () => {
      globalListeners = globalListeners.filter(fn => fn !== handler);
    };
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

  const toggle = useCallback(async () => {
    if (!user) return;
    const newVal = !enabled;

    // Optimistic update + sync all hooks
    setEnabled(newVal);
    notifyAll(newVal);

    await (supabase as any)
      .from('user_settings')
      .upsert(
        { user_id: user.id, hive_chat_enabled: newVal },
        { onConflict: 'user_id' }
      );
  }, [user, enabled]);

  return { hiveEnabled: enabled, isLoading, toggleHive: toggle };
}
