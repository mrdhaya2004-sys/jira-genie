import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { AIProvider, AIProviderConfig } from '@/types/aiConfig';

export const useAIConfig = () => {
  const [config, setConfig] = useState<AIProviderConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const { toast } = useToast();

  const fetchConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('ai_provider_configs')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setConfig(data as AIProviderConfig | null);
    } catch (error) {
      console.error('Error fetching AI config:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const saveConfig = useCallback(async (values: {
    provider: AIProvider;
    apiKey: string;
    model: string;
    endpointUrl?: string;
    displayName?: string;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Deactivate existing configs
      await supabase
        .from('ai_provider_configs')
        .update({ is_active: false } as Record<string, unknown>)
        .eq('user_id', user.id);

      // Insert new config
      const { data, error } = await supabase
        .from('ai_provider_configs')
        .insert({
          user_id: user.id,
          provider: values.provider,
          api_key_encrypted: values.apiKey,
          model_name: values.model,
          endpoint_url: values.endpointUrl || null,
          display_name: values.displayName || null,
          is_active: true,
        } as Record<string, unknown>)
        .select()
        .single();

      if (error) throw error;
      setConfig(data as AIProviderConfig);
      toast({ title: 'Success', description: 'AI configuration saved successfully' });
      return true;
    } catch (error) {
      console.error('Error saving AI config:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save configuration',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  const testConnection = useCallback(async (values: {
    provider: AIProvider;
    apiKey: string;
    model: string;
    endpointUrl?: string;
  }) => {
    setIsTesting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-ai-connection`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            provider: values.provider,
            apiKey: values.apiKey,
            model: values.model,
            endpointUrl: values.endpointUrl,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        toast({ title: 'Connection Successful', description: 'AI provider is reachable and responding' });
        return true;
      } else {
        toast({
          title: 'Connection Failed',
          description: result.error || 'Could not connect to the AI provider',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      toast({
        title: 'Connection Error',
        description: error instanceof Error ? error.message : 'Test failed',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsTesting(false);
    }
  }, [toast]);

  const removeConfig = useCallback(async () => {
    if (!config) return;
    try {
      const { error } = await supabase
        .from('ai_provider_configs')
        .delete()
        .eq('id', config.id);

      if (error) throw error;
      setConfig(null);
      toast({ title: 'Removed', description: 'Custom AI configuration removed. Using default AI.' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove configuration',
        variant: 'destructive',
      });
    }
  }, [config, toast]);

  return {
    config,
    isLoading,
    isTesting,
    saveConfig,
    testConnection,
    removeConfig,
    refetch: fetchConfig,
  };
};
