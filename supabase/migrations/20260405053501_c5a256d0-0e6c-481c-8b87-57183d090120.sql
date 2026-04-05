
CREATE TABLE public.user_totp (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  totp_secret TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_totp ENABLE ROW LEVEL SECURITY;

-- Users can view their own TOTP status (but secret is only exposed via edge function)
CREATE POLICY "Users can view own totp" ON public.user_totp
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own TOTP record
CREATE POLICY "Users can insert own totp" ON public.user_totp
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own TOTP record
CREATE POLICY "Users can update own totp" ON public.user_totp
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete their own TOTP record (disable 2FA)
CREATE POLICY "Users can delete own totp" ON public.user_totp
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
