import React from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';
import { TicketFilters } from '@/types/myTickets';

interface TicketFiltersBarProps {
  filters: TicketFilters;
  onFiltersChange: (filters: Partial<TicketFilters>) => void;
  statuses: string[];
  issueTypes: string[];
}

const TicketFiltersBar: React.FC<TicketFiltersBarProps> = ({
  filters,
  onFiltersChange,
  statuses,
  issueTypes,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border bg-muted/30">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by ticket ID or title..."
          value={filters.searchQuery}
          onChange={(e) => onFiltersChange({ searchQuery: e.target.value })}
          className="pl-9"
        />
      </div>

      {/* Issue Type Filter */}
      <Select
        value={filters.issueType}
        onValueChange={(value) => onFiltersChange({ issueType: value })}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Issue Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {issueTypes.map((type) => (
            <SelectItem key={type} value={type}>
              {type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status Filter */}
      <Select
        value={filters.status}
        onValueChange={(value) => onFiltersChange({ status: value })}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {statuses.map((status) => (
            <SelectItem key={status} value={status}>
              {status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default TicketFiltersBar;
