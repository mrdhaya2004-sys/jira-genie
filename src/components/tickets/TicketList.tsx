import React from 'react';
import { JiraTicketItem } from '@/types/myTickets';
import TicketRow from './TicketRow';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { AlertCircle, Inbox, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface TicketListProps {
  tickets: JiraTicketItem[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}

const TicketList: React.FC<TicketListProps> = ({
  tickets,
  isLoading,
  error,
  onRefresh,
}) => {
  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card">
            <Skeleton className="h-6 w-20" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-medium mb-2">Failed to load tickets</h3>
        <p className="text-muted-foreground mb-4 max-w-md">{error}</p>
        <Button onClick={onRefresh} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Inbox className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">No tickets found</h3>
        <p className="text-muted-foreground max-w-md">
          No tickets match your current filters. Try adjusting your search or filters.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-2">
        {/* Table Header */}
        <div className="hidden md:grid grid-cols-[100px_1fr_120px_120px_140px_100px] gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <span>Ticket</span>
          <span>Summary</span>
          <span>Type</span>
          <span>Status</span>
          <span>Assignee</span>
          <span>Updated</span>
        </div>
        
        {/* Ticket Rows */}
        {tickets.map((ticket) => (
          <TicketRow key={ticket.key} ticket={ticket} />
        ))}
      </div>
    </ScrollArea>
  );
};

export default TicketList;
