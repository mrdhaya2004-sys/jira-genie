import React from 'react';
import { JiraTicketItem } from '@/types/myTickets';
import TicketRow from './TicketRow';
import { Button } from '@/components/ui/button';
import { AlertCircle, Inbox, RefreshCw, Plus, Link2, Github } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface TicketListProps {
  tickets: JiraTicketItem[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}

const TicketList: React.FC<TicketListProps> = ({ tickets, isLoading, error, onRefresh }) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 min-h-[90px] px-5 rounded-[22px] border border-white/60 bg-white/[0.4] backdrop-blur-xl"
          >
            <Skeleton className="h-11 w-11 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <Skeleton className="hidden md:block h-7 w-20 rounded-full" />
            <Skeleton className="hidden md:block h-8 w-32 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center rounded-[22px] border border-red-200/60 bg-red-50/40 backdrop-blur-xl">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center shadow-[0_10px_30px_-10px_rgba(239,68,68,0.6)] mb-4">
          <AlertCircle className="h-8 w-8 text-white" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">Failed to load tickets</h3>
        <p className="text-sm text-slate-600 mb-4 max-w-md">{error}</p>
        <Button onClick={onRefresh} className="gap-2 rounded-full bg-gradient-to-r from-[#4F46E5] to-[#2563EB]">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center rounded-[22px] border border-white/60 bg-white/[0.5] backdrop-blur-[35px]">
        <div className="relative mb-6">
          <div className="absolute -inset-4 rounded-full opacity-40 blur-2xl bg-gradient-to-br from-[#4F46E5] via-[#38BDF8] to-[#10B981]" />
          <div className="relative h-20 w-20 rounded-3xl bg-white flex items-center justify-center shadow-[0_20px_60px_-20px_rgba(79,70,229,0.6)]">
            <Inbox className="h-10 w-10 text-[#4F46E5]" />
          </div>
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-1">No tickets assigned</h3>
        <p className="text-sm text-slate-600 max-w-md mb-6">
          You're all caught up. Create a new ticket or connect a source to bring in existing work.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button className="gap-2 rounded-full bg-gradient-to-r from-[#4F46E5] to-[#2563EB] shadow-[0_10px_30px_-10px_rgba(79,70,229,0.6)]">
            <Plus className="h-4 w-4" />
            Quick Create Ticket
          </Button>
          <Button variant="outline" className="gap-2 rounded-full bg-white/70 backdrop-blur-xl">
            <Link2 className="h-4 w-4" />
            Import Jira
          </Button>
          <Button variant="outline" className="gap-2 rounded-full bg-white/70 backdrop-blur-xl">
            <Github className="h-4 w-4" />
            Connect GitHub
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {tickets.map((ticket) => (
        <TicketRow key={ticket.key} ticket={ticket} />
      ))}
    </div>
  );
};

export default TicketList;
