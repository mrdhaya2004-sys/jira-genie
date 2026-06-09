
CREATE TABLE public.code_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('snippet','files','github','gitlab')),
  source_label TEXT,
  language TEXT,
  framework TEXT,
  overall_score INTEGER NOT NULL DEFAULT 0,
  sub_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  automation_stability JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary TEXT,
  critical_count INTEGER NOT NULL DEFAULT 0,
  high_count INTEGER NOT NULL DEFAULT 0,
  medium_count INTEGER NOT NULL DEFAULT 0,
  low_count INTEGER NOT NULL DEFAULT 0,
  security_findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  performance_findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  test_automation_findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.code_analyses TO authenticated;
GRANT ALL ON public.code_analyses TO service_role;
ALTER TABLE public.code_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own analyses" ON public.code_analyses FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_code_analyses_updated_at BEFORE UPDATE ON public.code_analyses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_code_analyses_user ON public.code_analyses(user_id, created_at DESC);

CREATE TABLE public.code_analysis_issues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_id UUID NOT NULL REFERENCES public.code_analyses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  line_number INTEGER,
  end_line INTEGER,
  severity TEXT NOT NULL CHECK (severity IN ('critical','high','medium','low')),
  issue_type TEXT,
  title TEXT,
  problem TEXT,
  suggestion TEXT,
  code_before TEXT,
  code_after TEXT,
  explanation TEXT,
  best_practice TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.code_analysis_issues TO authenticated;
GRANT ALL ON public.code_analysis_issues TO service_role;
ALTER TABLE public.code_analysis_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own issues" ON public.code_analysis_issues FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_issues_analysis ON public.code_analysis_issues(analysis_id);

CREATE TABLE public.code_analysis_refactors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_id UUID NOT NULL REFERENCES public.code_analyses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  variant TEXT NOT NULL CHECK (variant IN ('refactored','optimized','enterprise')),
  code TEXT NOT NULL,
  changes JSONB NOT NULL DEFAULT '[]'::jsonb,
  benefits JSONB NOT NULL DEFAULT '[]'::jsonb,
  expected_improvements JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.code_analysis_refactors TO authenticated;
GRANT ALL ON public.code_analysis_refactors TO service_role;
ALTER TABLE public.code_analysis_refactors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own refactors" ON public.code_analysis_refactors FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_refactors_analysis ON public.code_analysis_refactors(analysis_id);
