import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Notification {
  id: string;
  user_id: string;
  type: 'chat' | 'jira' | 'system';
  title: string;
  message: string;
  reference_id: string | null;
  reference_type: string | null;
  is_read: boolean;
  created_at: string;
}

const PAGE_SIZE = 20;

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchNotifications = useCallback(async (offset = 0, append = false) => {
    if (!user) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) throw error;

      const typed = (data || []).map(n => ({
        ...n,
        type: n.type as 'chat' | 'jira' | 'system',
      }));

      if (append) {
        setNotifications(prev => [...prev, ...typed]);
      } else {
        setNotifications(typed);
      }
      setHasMore((data?.length || 0) === PAGE_SIZE);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      fetchNotifications(notifications.length, true);
    }
  }, [hasMore, isLoading, notifications.length, fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (!error) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds);

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast({ title: 'All notifications marked as read' });
    }
  }, [user, notifications, toast]);

  const deleteNotification = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (!error) {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }
  }, []);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = {
            ...payload.new,
            type: (payload.new as any).type as 'chat' | 'jira' | 'system',
          } as Notification;
          setNotifications(prev => [newNotif, ...prev]);

          // Show toast for new notification
          toast({
            title: newNotif.title,
            description: newNotif.message,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return {
    notifications,
    isLoading,
    unreadCount,
    hasMore,
    loadMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch: fetchNotifications,
  };
};
