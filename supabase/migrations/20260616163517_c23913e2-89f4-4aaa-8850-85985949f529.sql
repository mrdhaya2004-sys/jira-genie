
CREATE TABLE IF NOT EXISTS public.user_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module text NOT NULL,
  action text NOT NULL,
  duration_ms integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_events_user_created_idx ON public.user_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_events_user_module_idx ON public.user_events(user_id, module);
CREATE INDEX IF NOT EXISTS user_events_user_action_idx ON public.user_events(user_id, action);

GRANT SELECT, INSERT, UPDATE ON public.user_events TO authenticated;
GRANT ALL ON public.user_events TO service_role;

ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own events"
  ON public.user_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events"
  ON public.user_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events"
  ON public.user_events FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Summary aggregator used by the Intelligence Hub
CREATE OR REPLACE FUNCTION public.get_intelligence_summary(_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH e AS (
    SELECT module, action, duration_ms, created_at
    FROM public.user_events
    WHERE user_id = _user_id
  )
  SELECT jsonb_build_object(
    'lifetime',  jsonb_build_object(
      'events',   (SELECT COUNT(*) FROM e),
      'duration', COALESCE((SELECT SUM(duration_ms) FROM e), 0)
    ),
    'today',     jsonb_build_object(
      'events',   (SELECT COUNT(*) FROM e WHERE created_at >= date_trunc('day', now())),
      'duration', COALESCE((SELECT SUM(duration_ms) FROM e WHERE created_at >= date_trunc('day', now())), 0)
    ),
    'week',      jsonb_build_object(
      'events',   (SELECT COUNT(*) FROM e WHERE created_at >= date_trunc('week', now())),
      'duration', COALESCE((SELECT SUM(duration_ms) FROM e WHERE created_at >= date_trunc('week', now())), 0)
    ),
    'month',     jsonb_build_object(
      'events',   (SELECT COUNT(*) FROM e WHERE created_at >= date_trunc('month', now())),
      'duration', COALESCE((SELECT SUM(duration_ms) FROM e WHERE created_at >= date_trunc('month', now())), 0)
    ),
    'year',      jsonb_build_object(
      'events',   (SELECT COUNT(*) FROM e WHERE created_at >= date_trunc('year', now())),
      'duration', COALESCE((SELECT SUM(duration_ms) FROM e WHERE created_at >= date_trunc('year', now())), 0)
    ),
    'prev_month', jsonb_build_object(
      'events',   (SELECT COUNT(*) FROM e WHERE created_at >= date_trunc('month', now()) - interval '1 month' AND created_at < date_trunc('month', now())),
      'duration', COALESCE((SELECT SUM(duration_ms) FROM e WHERE created_at >= date_trunc('month', now()) - interval '1 month' AND created_at < date_trunc('month', now())), 0)
    ),
    'by_module', COALESCE((
      SELECT jsonb_object_agg(module, c)
      FROM (SELECT module, COUNT(*) AS c FROM e GROUP BY module) m
    ), '{}'::jsonb),
    'by_action', COALESCE((
      SELECT jsonb_object_agg(action, c)
      FROM (SELECT action, COUNT(*) AS c FROM e GROUP BY action) a
    ), '{}'::jsonb),
    'active_days_lifetime', (SELECT COUNT(DISTINCT date_trunc('day', created_at)) FROM e),
    'active_days_month',    (SELECT COUNT(DISTINCT date_trunc('day', created_at)) FROM e WHERE created_at >= date_trunc('month', now())),
    'by_day_30', COALESCE((
      SELECT jsonb_object_agg(d, c)
      FROM (
        SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS d, COUNT(*) AS c
        FROM e
        WHERE created_at >= now() - interval '30 days'
        GROUP BY 1
      ) g
    ), '{}'::jsonb),
    'by_hour', COALESCE((
      SELECT jsonb_object_agg(h::text, c)
      FROM (
        SELECT EXTRACT(HOUR FROM created_at)::int AS h, COUNT(*) AS c
        FROM e
        GROUP BY 1
      ) g
    ), '{}'::jsonb),
    'by_dow', COALESCE((
      SELECT jsonb_object_agg(d::text, c)
      FROM (
        SELECT EXTRACT(DOW FROM created_at)::int AS d, COUNT(*) AS c
        FROM e
        GROUP BY 1
      ) g
    ), '{}'::jsonb)
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_intelligence_summary(uuid) TO authenticated;
