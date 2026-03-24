import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Check, CheckCheck, MessageSquare, Ticket, Cpu, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Notification } from '@/hooks/useNotifications';

interface NotificationPanelProps {
  notifications: Notification[];
  isLoading: boolean;
  hasMore: boolean;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: string) => void;
  onLoadMore: () => void;
  onNotificationClick: (notification: Notification) => void;
}

const typeIconMap: Record<string, React.ReactNode> = {
  chat: <MessageSquare className="h-4 w-4 text-primary" />,
  jira: <Ticket className="h-4 w-4 text-accent-foreground" />,
  system: <Cpu className="h-4 w-4 text-muted-foreground" />,
};

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  notifications,
  isLoading,
  hasMore,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onLoadMore,
  onNotificationClick,
}) => {
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="w-80 sm:w-96">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Notifications</span>
          {unreadCount > 0 && (
            <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={onMarkAllAsRead}>
            <CheckCheck className="h-3 w-3 mr-1" />
            Mark all read
          </Button>
        )}
      </div>
      <Separator />

      {/* List */}
      <ScrollArea className="max-h-[400px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <Bell className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <div>
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={cn(
                  'flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-accent/50 group',
                  !notif.is_read && 'bg-accent/30'
                )}
                onClick={() => onNotificationClick(notif)}
              >
                {/* Icon */}
                <div className="mt-0.5 shrink-0">
                  {typeIconMap[notif.type] || typeIconMap.system}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm truncate', !notif.is_read && 'font-semibold')}>
                    {notif.title}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {notif.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">
                    {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  {!notif.is_read && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkAsRead(notif.id);
                      }}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive/70 hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(notif.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                {/* Unread dot */}
                {!notif.is_read && (
                  <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                )}
              </div>
            ))}

            {hasMore && (
              <div className="flex justify-center py-3">
                <Button variant="ghost" size="sm" className="text-xs" onClick={onLoadMore}>
                  Load more
                </Button>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default NotificationPanel;
