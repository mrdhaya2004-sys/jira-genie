import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useProfileId() {
  const { user, profile, refreshProfile } = useAuth();
  const [isChecking, setIsChecking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const checkAvailability = useCallback(async (profileId: string): Promise<boolean> => {
    if (!profileId.match(/^@[a-z0-9_]{3,20}$/)) return false;
    
    setIsChecking(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('profile_id', profileId)
        .maybeSingle();

      if (error) throw error;
      return !data;
    } catch (error) {
      console.error('Error checking profile ID:', error);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  const saveProfileId = useCallback(async (profileId: string): Promise<boolean> => {
    if (!user) return false;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ profile_id: profileId })
        .eq('user_id', user.id)
        .select();

      if (error) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          toast.error('This profile ID already exists. Please choose another.');
        } else {
          toast.error('Failed to save profile ID');
        }
        return false;
      }

      toast.success('Username saved successfully.');
      if (refreshProfile) await refreshProfile();
      return true;
    } catch (error) {
      console.error('Error saving profile ID:', error);
      toast.error('Failed to save profile ID');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [user, refreshProfile]);

  return {
    profileId: profile?.profile_id ?? null,
    checkAvailability,
    saveProfileId,
    isChecking,
    isSaving,
  };
}
