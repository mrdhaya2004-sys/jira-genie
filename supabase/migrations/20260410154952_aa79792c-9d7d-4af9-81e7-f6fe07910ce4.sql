
-- Add new preference columns to user_settings
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'javascript',
  ADD COLUMN IF NOT EXISTS response_style text DEFAULT 'detailed',
  ADD COLUMN IF NOT EXISTS auto_code_playground boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS module_suggestions boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS hive_auto_open boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS hive_button_behavior text DEFAULT 'float',
  ADD COLUMN IF NOT EXISTS notify_mentions boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_jira boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_tests boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_inapp boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS default_device text DEFAULT 'chrome',
  ADD COLUMN IF NOT EXISTS default_test_mode text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS auto_run_tests boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS screenshot_on_failure boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS theme text DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS compact_ui boolean DEFAULT false;
