import React from 'react';
import { JiraTicketItem } from '@/types/myTickets';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ExternalLink, Bug, CheckSquare, BookOpen, Layers, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TicketRowProps {
  ticket: JiraTicketItem;
}

const issueTypeIcons: Record<string, React.ReactNode> = {
  Bug: <Bug className="h-4 w-4 text-red-500" />,
  Task: <CheckSquare className="h-4 w-4 text-blue-500" />,
  Story: <BookOpen className="h-4 w-4 text-green-500" />,
  Epic: <Layers className="h-4 w-4 text-purple-500" />,
};

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  indeterminate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  done: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  undefined: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

const priorityColors: Record<string, string> = {
  Critical: 'text-red-600',
  High: 'text-orange-500',
  Medium: 'text-yellow-500',
  Low: 'text-green-500',
};

const TicketRow: React.FC<TicketRowProps> = ({ ticket }) => {
  const handleClick = () => {
    window.open(ticket.url, '_blank', 'noopener,noreferrer');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const updatedTime = formatDistanceToNow(new Date(ticket.updated), { addSuffix: true });

  return (
    <div
      onClick={handleClick}
      className={cn(
        "group cursor-pointer rounded-lg border border-border bg-card p-4",
        "hover:border-primary/50 hover:shadow-md transition-all duration-200",
        "grid grid-cols-1 md:grid-cols-[100px_1fr_120px_120px_140px_100px] gap-3 md:gap-4 items-center"
      )}
    >
      {/* Ticket Key */}
      <div className="flex items-center gap-2">
        <span className={cn("font-mono text-sm font-medium text-primary", priorityColors[ticket.priority.name])}>
          {ticket.key}
        </span>
        {ticket.isAICreated && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary/10">
                <Sparkles className="h-3 w-3 text-primary" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Created via AI Ticket Raiser</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Summary */}
      <div className="min-w-0">
        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
          {ticket.summary}
        </p>
        <p className="text-xs text-muted-foreground md:hidden mt-1">
          {ticket.issueType.name} • {ticket.status.name}
        </p>
      </div>

      {/* Issue Type */}
      <div className="hidden md:flex items-center gap-2">
        {issueTypeIcons[ticket.issueType.name] || <CheckSquare className="h-4 w-4 text-muted-foreground" />}
        <span className="text-sm">{ticket.issueType.name}</span>
      </div>

      {/* Status */}
      <div className="hidden md:block">
        <Badge 
          variant="secondary" 
          className={cn("font-normal", statusColors[ticket.status.category])}
        >
          {ticket.status.name}
        </Badge>
      </div>

      {/* Assignee */}
      <div className="hidden md:flex items-center gap-2">
        {ticket.assignee ? (
          <>
            <Avatar className="h-6 w-6">
              <AvatarImage src={ticket.assignee.avatarUrl} />
              <AvatarFallback className="text-xs">
                {getInitials(ticket.assignee.displayName)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm truncate max-w-[100px]">
              {ticket.assignee.displayName.split(' ')[0]}
            </span>
          </>
        ) : (
          <span className="text-sm text-muted-foreground">Unassigned</span>
        )}
      </div>

      {/* Updated */}
      <div className="hidden md:flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{updatedTime}</span>
        <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
};

export default TicketRow;
