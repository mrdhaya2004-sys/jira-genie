import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { JiraTicketItem, TicketFilters, MyTicketsResponse } from '@/types/myTickets';
import { getAICreatedTickets, addAICreatedTicket as addAITicket } from '@/lib/aiTicketStorage';
import { useToast } from '@/hooks/use-toast';

export const useMyTickets = () => {
  const [tickets, setTickets] = useState<JiraTicketItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [issueTypes] = useState<string[]>(['Bug', 'Task', 'Story', 'Epic']);
  const [filters, setFilters] = useState<TicketFilters>({
    issueType: 'all',
    status: 'all',
    searchQuery: '',
  });
  const { toast } = useToast();

  // Add AI-created ticket to local storage (re-export for convenience)
  const addAICreatedTicket = useCallback((ticketKey: string) => {
    addAITicket(ticketKey);
  }, []);

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke<MyTicketsResponse>('jira-get-my-tickets', {
        body: {
          issueType: filters.issueType !== 'all' ? filters.issueType : undefined,
          status: filters.status !== 'all' ? filters.status : undefined,
          searchQuery: filters.searchQuery || undefined,
          maxResults: 100,
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      // Get AI-created tickets and mark them
      const aiTickets = getAICreatedTickets();
      const aiTicketKeys = new Set(aiTickets.map(t => t.key));

      const ticketsWithAIFlag = (data?.tickets || []).map(ticket => ({
        ...ticket,
        isAICreated: aiTicketKeys.has(ticket.key),
      }));

      setTickets(ticketsWithAIFlag);
      setTotal(data?.total || 0);
      setStatuses(data?.statuses || []);

    } catch (err) {
      console.error('Error fetching tickets:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tickets';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [filters, toast]);

  // Fetch tickets on mount and when filters change
  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const updateFilters = useCallback((newFilters: Partial<TicketFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const refreshTickets = useCallback(() => {
    fetchTickets();
  }, [fetchTickets]);

  return {
    tickets,
    isLoading,
    error,
    total,
    statuses,
    issueTypes,
    filters,
    updateFilters,
    refreshTickets,
    addAICreatedTicket,
  };
};
