
-- Table to store company AI provider configurations
CREATE TABLE public.ai_provider_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL,
  api_key_encrypted text NOT NULL,
  model_name text NOT NULL,
  endpoint_url text,
  is_active boolean NOT NULL DEFAULT true,
  display_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_provider_configs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own AI configs"
  ON public.ai_provider_configs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own AI configs"
  ON public.ai_provider_configs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own AI configs"
  ON public.ai_provider_configs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own AI configs"
  ON public.ai_provider_configs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_ai_provider_configs_updated_at
  BEFORE UPDATE ON public.ai_provider_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
