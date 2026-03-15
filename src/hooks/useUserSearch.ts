import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SearchResult {
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  profile_id: string | null;
  employee_id: string;
}

export function useUserSearch() {
  const { user } = useAuth();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchUsers = useCallback(async (query: string) => {
    if (!user || !query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Search by profile_id or name
      const searchTerm = query.startsWith('@') ? query : `%${query}%`;
      
      let queryBuilder = supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url, profile_id, employee_id')
        .neq('user_id', user.id)
        .limit(20);

      if (query.startsWith('@')) {
        queryBuilder = queryBuilder.ilike('profile_id', `${searchTerm}%`);
      } else {
        queryBuilder = queryBuilder.or(`full_name.ilike.${searchTerm},email.ilike.${searchTerm},profile_id.ilike.%${query}%`);
      }

      const { data, error } = await queryBuilder;

      if (error) throw error;
      setResults((data as SearchResult[]) || []);
    } catch (error) {
      console.error('Error searching users:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [user]);

  const clearResults = useCallback(() => {
    setResults([]);
  }, []);

  return { results, isSearching, searchUsers, clearResults };
}
