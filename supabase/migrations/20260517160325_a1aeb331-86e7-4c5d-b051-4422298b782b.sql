REVOKE SELECT (correct_option, explanation) ON public.qa_questions FROM authenticated;
REVOKE SELECT (correct_option, explanation) ON public.qa_questions FROM anon;
REVOKE SELECT (correct_option, explanation) ON public.qa_questions FROM PUBLIC;