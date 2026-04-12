import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const USER_PREFERENCES_UPDATED_EVENT = 'user-preferences-updated';

export interface UserPreferences {
  preferred_language: string;
  response_style: string;
  auto_code_playground: boolean;
  module_suggestions: boolean;
  hive_chat_enabled: boolean;
  hive_auto_open: boolean;
  hive_button_behavior: string;
  notify_mentions: boolean;
  notify_jira: boolean;
  notify_tests: boolean;
  notify_email: boolean;
  notify_inapp: boolean;
  default_device: string;
  default_test_mode: string;
  auto_run_tests: boolean;
  screenshot_on_failure: boolean;
  theme: string;
  compact_ui: boolean;
}

const DEFAULT_PREFS: UserPreferences = {
  preferred_language: 'javascript',
  response_style: 'detailed',
  auto_code_playground: true,
  module_suggestions: true,
  hive_chat_enabled: true,
  hive_auto_open: false,
  hive_button_behavior: 'float',
  notify_mentions: true,
  notify_jira: true,
  notify_tests: true,
  notify_email: false,
  notify_inapp: true,
  default_device: 'chrome',
  default_test_mode: 'manual',
  auto_run_tests: false,
  screenshot_on_failure: true,
  theme: 'system',
  compact_ui: false,
};

const mapPreferences = (data: Partial<Record<keyof UserPreferences, unknown>> | null | undefined): UserPreferences => ({
  preferred_language: (data?.preferred_language as string) ?? DEFAULT_PREFS.preferred_language,
  response_style: (data?.response_style as string) ?? DEFAULT_PREFS.response_style,
  auto_code_playground: (data?.auto_code_playground as boolean) ?? DEFAULT_PREFS.auto_code_playground,
  module_suggestions: (data?.module_suggestions as boolean) ?? DEFAULT_PREFS.module_suggestions,
  hive_chat_enabled: (data?.hive_chat_enabled as boolean) ?? DEFAULT_PREFS.hive_chat_enabled,
  hive_auto_open: (data?.hive_auto_open as boolean) ?? DEFAULT_PREFS.hive_auto_open,
  hive_button_behavior: (data?.hive_button_behavior as string) ?? DEFAULT_PREFS.hive_button_behavior,
  notify_mentions: (data?.notify_mentions as boolean) ?? DEFAULT_PREFS.notify_mentions,
  notify_jira: (data?.notify_jira as boolean) ?? DEFAULT_PREFS.notify_jira,
  notify_tests: (data?.notify_tests as boolean) ?? DEFAULT_PREFS.notify_tests,
  notify_email: (data?.notify_email as boolean) ?? DEFAULT_PREFS.notify_email,
  notify_inapp: (data?.notify_inapp as boolean) ?? DEFAULT_PREFS.notify_inapp,
  default_device: (data?.default_device as string) ?? DEFAULT_PREFS.default_device,
  default_test_mode: (data?.default_test_mode as string) ?? DEFAULT_PREFS.default_test_mode,
  auto_run_tests: (data?.auto_run_tests as boolean) ?? DEFAULT_PREFS.auto_run_tests,
  screenshot_on_failure: (data?.screenshot_on_failure as boolean) ?? DEFAULT_PREFS.screenshot_on_failure,
  theme: (data?.theme as string) ?? DEFAULT_PREFS.theme,
  compact_ui: (data?.compact_ui as boolean) ?? DEFAULT_PREFS.compact_ui,
});

export function useUserPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const handlePreferencesUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<UserPreferences>;
      if (customEvent.detail) {
        setPreferences(customEvent.detail);
      }
    };

    window.addEventListener(USER_PREFERENCES_UPDATED_EVENT, handlePreferencesUpdated);
    return () => window.removeEventListener(USER_PREFERENCES_UPDATED_EVENT, handlePreferencesUpdated);
  }, []);

  useEffect(() => {
    if (!user) {
      setPreferences(DEFAULT_PREFS);
      setIsLoading(false);
      return;
    }

    const fetchPrefs = async () => {
      setIsLoading(true);
      const { data } = await (supabase as any)
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setPreferences(mapPreferences(data));
      setIsLoading(false);
    };

    fetchPrefs();
  }, [user]);

  const savePreferences = useCallback(async (updates: Partial<UserPreferences>) => {
    if (!user) return;

    setIsSaving(true);
    const merged = { ...preferences, ...updates };
    setPreferences(merged);
    window.dispatchEvent(new CustomEvent<UserPreferences>(USER_PREFERENCES_UPDATED_EVENT, { detail: merged }));

    await (supabase as any)
      .from('user_settings')
      .upsert(
        { user_id: user.id, ...merged },
        { onConflict: 'user_id' }
      );

    setIsSaving(false);
  }, [user, preferences]);

  return { preferences, isLoading, isSaving, savePreferences };
}
