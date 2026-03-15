
-- Add profile_id to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_id text UNIQUE;

-- Create validation trigger for profile_id format
CREATE OR REPLACE FUNCTION public.validate_profile_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.profile_id IS NOT NULL AND NEW.profile_id !~ '^@[a-z0-9_]{3,20}$' THEN
    RAISE EXCEPTION 'Profile ID must start with @ and contain 3-20 lowercase alphanumeric characters or underscores';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_profile_id_trigger
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.validate_profile_id();

-- Create organizations table
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  domain text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Create organization_members table
CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Create message_reactions table
CREATE TABLE public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Create user_presence table
CREATE TABLE public.user_presence (
  user_id uuid PRIMARY KEY,
  status text NOT NULL DEFAULT 'offline',
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- Add organization_id to conversations
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;

-- RLS: Organizations
CREATE POLICY "Members can view their organization" ON public.organizations
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = organizations.id AND user_id = auth.uid())
);

CREATE POLICY "Authenticated users can create organizations" ON public.organizations
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins can update organizations" ON public.organizations
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = organizations.id AND user_id = auth.uid() AND role = 'admin')
);

-- RLS: Organization Members (use security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id
  )
$$;

CREATE POLICY "Members can view org members" ON public.organization_members
FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can join organizations" ON public.organization_members
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave or admins can remove" ON public.organization_members
FOR DELETE USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = organization_members.organization_id AND om.user_id = auth.uid() AND om.role = 'admin')
);

-- RLS: Message Reactions
CREATE POLICY "Users can view reactions in their conversations" ON public.message_reactions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.chat_messages cm
    JOIN public.conversation_participants cp ON cp.conversation_id = cm.conversation_id
    WHERE cm.id = message_reactions.message_id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can add reactions" ON public.message_reactions
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own reactions" ON public.message_reactions
FOR DELETE USING (auth.uid() = user_id);

-- RLS: User Presence
CREATE POLICY "Authenticated users can view presence" ON public.user_presence
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can upsert own presence" ON public.user_presence
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own presence" ON public.user_presence
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Allow org members to search each other's profiles
CREATE POLICY "Org members can view each other profiles" ON public.profiles
FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.organization_members om1
    JOIN public.organization_members om2 ON om1.organization_id = om2.organization_id
    WHERE om1.user_id = auth.uid() AND om2.user_id = profiles.user_id
  )
);

-- Function to auto-join organization based on email domain
CREATE OR REPLACE FUNCTION public.auto_join_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  email_domain text;
  org_id uuid;
BEGIN
  -- Extract domain from email
  email_domain := split_part(NEW.email, '@', 2);
  
  -- Skip common free email domains
  IF email_domain IN ('gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com', 'aol.com') THEN
    RETURN NEW;
  END IF;
  
  -- Find or create organization
  SELECT id INTO org_id FROM public.organizations WHERE domain = email_domain;
  
  IF org_id IS NULL THEN
    INSERT INTO public.organizations (name, domain)
    VALUES (initcap(split_part(email_domain, '.', 1)) || ' Organization', email_domain)
    RETURNING id INTO org_id;
    
    -- First member becomes admin
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (org_id, NEW.user_id, 'admin');
  ELSE
    -- Join existing org as member
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (org_id, NEW.user_id, 'member')
    ON CONFLICT (organization_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_join_org_on_profile_create
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.auto_join_organization();
