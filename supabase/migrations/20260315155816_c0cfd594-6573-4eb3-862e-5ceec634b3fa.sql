
-- Fix overly permissive INSERT policy on organizations
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;

CREATE POLICY "Authenticated users can create organizations" ON public.organizations
FOR INSERT TO authenticated WITH CHECK (
  NOT EXISTS (SELECT 1 FROM public.organizations WHERE domain = organizations.domain)
);
