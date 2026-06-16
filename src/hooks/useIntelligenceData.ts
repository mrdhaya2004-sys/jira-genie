import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type IntelligenceBucket = { events: number; duration: number };

export interface IntelligenceSummary {
  lifetime: IntelligenceBucket;
  today: IntelligenceBucket;
  week: IntelligenceBucket;
  month: IntelligenceBucket;
  year: IntelligenceBucket;
  prev_month: IntelligenceBucket;
  by_module: Record<string, number>;
  by_action: Record<string, number>;
  by_day_30: Record<string, number>;
  by_hour: Record<string, number>;
  by_dow: Record<string, number>;
  active_days_lifetime: number;
  active_days_month: number;
}

export interface RecentEvent {
  id: string;
  module: string;
  action: string;
  duration_ms: number;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

const EMPTY_SUMMARY: IntelligenceSummary = {
  lifetime: { events: 0, duration: 0 },
  today: { events: 0, duration: 0 },
  week: { events: 0, duration: 0 },
  month: { events: 0, duration: 0 },
  year: { events: 0, duration: 0 },
  prev_month: { events: 0, duration: 0 },
  by_module: {},
  by_action: {},
  by_day_30: {},
  by_hour: {},
  by_dow: {},
  active_days_lifetime: 0,
  active_days_month: 0,
};

export function useIntelligenceData() {
  const [summary, setSummary] = useState<IntelligenceSummary>(EMPTY_SUMMARY);
  const [recent, setRecent] = useState<RecentEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
        setSummary(EMPTY_SUMMARY);
        setRecent([]);
        return;
      }

      const [summaryRes, recentRes] = await Promise.all([
        supabase.rpc('get_intelligence_summary', { _user_id: uid }),
        supabase
          .from('user_events')
          .select('id, module, action, duration_ms, created_at, metadata')
          .order('created_at', { ascending: false })
          .limit(40),
      ]);

      if (!summaryRes.error && summaryRes.data) {
        setSummary({ ...EMPTY_SUMMARY, ...(summaryRes.data as IntelligenceSummary) });
      }
      if (!recentRes.error && recentRes.data) {
        setRecent(recentRes.data as RecentEvent[]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { summary, recent, loading, refresh };
}
