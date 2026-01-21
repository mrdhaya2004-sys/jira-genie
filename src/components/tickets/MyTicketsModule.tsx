import React from 'react';
import { useMyTickets } from '@/hooks/useMyTickets';
import TicketFiltersBar from './TicketFiltersBar';
import TicketList from './TicketList';
import { Button } from '@/components/ui/button';
import { RefreshCw, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';

const MyTicketsModule: React.FC = () => {
  const {
    tickets,
    isLoading,
    error,
    total,
    statuses,
    issueTypes,
    filters,
    updateFilters,
    refreshTickets,
  } = useMyTickets();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-background">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Ticket className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">My Tickets</h1>
            <p className="text-sm text-muted-foreground">
              {isLoading ? 'Loading...' : `${total} ticket${total !== 1 ? 's' : ''} found`}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshTickets}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <TicketFiltersBar
        filters={filters}
        onFiltersChange={updateFilters}
        statuses={statuses}
        issueTypes={issueTypes}
      />

      {/* Ticket List */}
      <div className="flex-1 overflow-hidden">
        <TicketList
          tickets={tickets}
          isLoading={isLoading}
          error={error}
          onRefresh={refreshTickets}
        />
      </div>
    </div>
  );
};

export default MyTicketsModule;
