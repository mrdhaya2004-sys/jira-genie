REVOKE SELECT ON public.qa_questions FROM authenticated;
REVOKE SELECT ON public.qa_questions FROM anon;

GRANT SELECT (id, category, difficulty, question, option_a, option_b, option_c, option_d, created_at)
  ON public.qa_questions TO authenticated;

GRANT ALL ON public.qa_questions TO service_role;