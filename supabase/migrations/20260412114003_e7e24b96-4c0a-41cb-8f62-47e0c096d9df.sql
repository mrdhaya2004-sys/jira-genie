
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_invoker = on)
AS SELECT user_id, full_name, avatar_url, profile_id
FROM public.profiles;
