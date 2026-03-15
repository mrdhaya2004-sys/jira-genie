import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Organization {
  id: string;
  name: string;
  domain: string;
  created_at: string;
}

export interface OrgMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

export function useOrganization() {
  const { user, profile } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrganization = useCallback(async () => {
    if (!user) return;

    try {
      // Get user's organization membership
      const { data: memberData, error: memberError } = await supabase
        .from('organization_members')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (memberError || !memberData) {
        setIsLoading(false);
        return;
      }

      // Get organization details
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', (memberData as OrgMember).organization_id)
        .single();

      if (!orgError && orgData) {
        setOrganization(orgData as Organization);

        // Get all members
        const { data: allMembers } = await supabase
          .from('organization_members')
          .select('*')
          .eq('organization_id', (orgData as Organization).id);

        setMembers((allMembers as OrgMember[]) || []);
      }
    } catch (error) {
      console.error('Error fetching organization:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOrganization();
  }, [fetchOrganization]);

  return { organization, members, isLoading, refetch: fetchOrganization };
}
