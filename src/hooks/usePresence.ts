import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserPresence {
  user_id: string;
  status: 'online' | 'offline';
  last_seen_at: string;
}

export function usePresence() {
  const { user } = useAuth();
  const [presenceMap, setPresenceMap] = useState<Map<string, UserPresence>>(new Map());
  const heartbeatRef = useRef<ReturnType<typeof setInterval>>();

  const updatePresence = useCallback(async (status: 'online' | 'offline') => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('user_presence')
        .upsert([{
          user_id: user.id,
          status,
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }] as any, { onConflict: 'user_id' });

      if (error) console.error('Error updating presence:', error);
    } catch (err) {
      console.error('Presence update failed:', err);
    }
  }, [user]);

  const fetchPresence = useCallback(async (userIds: string[]) => {
    if (userIds.length === 0) return;

    const { data, error } = await supabase
      .from('user_presence')
      .select('*')
      .in('user_id', userIds);

    if (!error && data) {
      setPresenceMap(prev => {
        const newMap = new Map(prev);
        (data as UserPresence[]).forEach(p => newMap.set(p.user_id, p));
        return newMap;
      });
    }
  }, []);

  const getStatus = useCallback((userId: string): 'online' | 'offline' => {
    const presence = presenceMap.get(userId);
    if (!presence) return 'offline';
    
    // Consider offline if last seen > 2 minutes ago
    const lastSeen = new Date(presence.last_seen_at).getTime();
    const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
    
    return presence.status === 'online' && lastSeen > twoMinutesAgo ? 'online' : 'offline';
  }, [presenceMap]);

  // Set online on mount, offline on unmount
  useEffect(() => {
    if (!user) return;

    updatePresence('online');
    
    // Heartbeat every 60 seconds
    heartbeatRef.current = setInterval(() => {
      updatePresence('online');
    }, 60000);

    // Handle visibility change
    const handleVisibility = () => {
      if (document.hidden) {
        updatePresence('offline');
      } else {
        updatePresence('online');
      }
    };

    // Handle page unload
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliability
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_presence?user_id=eq.${user.id}`;
      navigator.sendBeacon(url); // Best effort
      updatePresence('offline');
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(heartbeatRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      updatePresence('offline');
    };
  }, [user, updatePresence]);

  // Subscribe to presence changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('presence-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_presence' },
        (payload) => {
          const updated = payload.new as UserPresence;
          if (updated?.user_id) {
            setPresenceMap(prev => {
              const newMap = new Map(prev);
              newMap.set(updated.user_id, updated);
              return newMap;
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return { presenceMap, fetchPresence, getStatus, updatePresence };
}
