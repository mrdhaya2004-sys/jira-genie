import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { sessionHistoryService } from '@/lib/sessionHistory';
import { useToast } from '@/hooks/use-toast';

export interface HistoryLog {
  id: string;
  user_id: string;
  workspace_id: string | null;
  session_id: string;
  module_name: string;
  action_type: string;
  input_prompt: string | null;
  output_summary: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

type ViewMode = 'date' | 'module';

export const useHistoryLogs = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<HistoryLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('date');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModule, setFilterModule] = useState<string>('all');

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      let query = supabase
        .from('history_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200);

      if (filterModule !== 'all') {
        query = query.eq('module_name', filterModule);
      }

      const { data, error } = await query;
      if (error) throw error;

      let results = (data || []) as unknown as HistoryLog[];

      // Client-side search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        results = results.filter(log =>
          log.module_name.toLowerCase().includes(q) ||
          log.input_prompt?.toLowerCase().includes(q) ||
          log.output_summary?.toLowerCase().includes(q) ||
          log.action_type.toLowerCase().includes(q)
        );
      }

      setLogs(results);
    } catch (error) {
      console.error('Error fetching history logs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, filterModule, searchQuery]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const addLog = useCallback(async (entry: {
    module_name: string;
    action_type: string;
    input_prompt?: string;
    output_summary?: string;
    workspace_id?: string;
    metadata?: Record<string, any>;
  }) => {
    if (!user) return;

    const sessionId = sessionHistoryService.getSessionId();

    // Add to session history
    sessionHistoryService.addModuleUsage(
      entry.module_name,
      sessionHistoryService.getModuleLabel(entry.module_name)
    );

    // Add to persistent DB
    try {
      const { error } = await supabase.from('history_logs').insert({
        user_id: user.id,
        session_id: sessionId,
        module_name: entry.module_name,
        action_type: entry.action_type,
        input_prompt: entry.input_prompt || null,
        output_summary: entry.output_summary || null,
        workspace_id: entry.workspace_id || null,
        metadata: entry.metadata || {},
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error saving history log:', error);
    }
  }, [user]);

  const deleteLog = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('history_logs').delete().eq('id', id);
      if (error) throw error;
      setLogs(prev => prev.filter(l => l.id !== id));
    } catch (error) {
      console.error('Error deleting log:', error);
    }
  }, []);

  const clearAllLogs = useCallback(async () => {
    if (!user) return;
    try {
      let query = supabase.from('history_logs').delete().eq('user_id', user.id);
      if (filterModule !== 'all') {
        query = query.eq('module_name', filterModule);
      }
      const { error } = await query;
      if (error) throw error;
      setLogs(filterModule === 'all' ? [] : prev => prev.filter(l => l.module_name !== filterModule));
      toast({ title: 'History cleared' });
    } catch (error) {
      console.error('Error clearing logs:', error);
    }
  }, [user, filterModule, toast]);

  // Group by date
  const logsByDate = useCallback(() => {
    const groups: Record<string, HistoryLog[]> = {};
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    logs.forEach(log => {
      const logDate = new Date(log.created_at);
      let key: string;
      if (logDate.toDateString() === today.toDateString()) {
        key = 'Today';
      } else if (logDate.toDateString() === yesterday.toDateString()) {
        key = 'Yesterday';
      } else {
        key = logDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(log);
    });
    return groups;
  }, [logs]);

  // Group by module
  const logsByModule = useCallback(() => {
    const groups: Record<string, HistoryLog[]> = {};
    logs.forEach(log => {
      const key = sessionHistoryService.getModuleLabel(log.module_name);
      if (!groups[key]) groups[key] = [];
      groups[key].push(log);
    });
    return groups;
  }, [logs]);

  const exportAsCSV = useCallback(() => {
    if (logs.length === 0) return;
    const headers = ['Date', 'Time', 'Module', 'Action', 'Prompt', 'Summary'];
    const rows = logs.map(log => {
      const d = new Date(log.created_at);
      return [
        d.toLocaleDateString(),
        d.toLocaleTimeString(),
        sessionHistoryService.getModuleLabel(log.module_name),
        log.action_type,
        `"${(log.input_prompt || '').replace(/"/g, '""')}"`,
        `"${(log.output_summary || '').replace(/"/g, '""')}"`,
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `history_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: `${logs.length} entries exported as CSV` });
  }, [logs, toast]);

  return {
    logs,
    isLoading,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    filterModule,
    setFilterModule,
    fetchLogs,
    addLog,
    deleteLog,
    clearAllLogs,
    logsByDate,
    logsByModule,
    exportAsCSV,
  };
};
