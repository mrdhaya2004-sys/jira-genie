
-- Question bank (shared)
CREATE TABLE public.qa_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  difficulty text NOT NULL DEFAULT 'medium',
  question text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  correct_option text NOT NULL CHECK (correct_option IN ('A','B','C','D')),
  explanation text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_qa_questions_category ON public.qa_questions(category);

ALTER TABLE public.qa_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read questions"
  ON public.qa_questions FOR SELECT TO authenticated USING (true);

-- Daily assignment per user
CREATE TABLE public.qa_daily_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  challenge_date date NOT NULL,
  question_ids uuid[] NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, challenge_date)
);
ALTER TABLE public.qa_daily_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own assignments"
  ON public.qa_daily_assignments FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Attempts
CREATE TABLE public.qa_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  challenge_date date NOT NULL,
  score integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 10,
  time_seconds integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_qa_attempts_user_date ON public.qa_attempts(user_id, challenge_date DESC);
ALTER TABLE public.qa_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own attempts"
  ON public.qa_attempts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Per-answer log
CREATE TABLE public.qa_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.qa_attempts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  question_id uuid NOT NULL REFERENCES public.qa_questions(id),
  category text NOT NULL,
  selected_option text,
  is_correct boolean NOT NULL DEFAULT false,
  answered_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_qa_answers_user ON public.qa_answers(user_id);
CREATE INDEX idx_qa_answers_user_cat ON public.qa_answers(user_id, category);
ALTER TABLE public.qa_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own answers"
  ON public.qa_answers FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
