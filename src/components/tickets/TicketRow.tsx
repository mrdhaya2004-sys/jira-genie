import React from 'react';
import { JiraTicketItem } from '@/types/myTickets';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ExternalLink,
  Bug,
  CheckSquare,
  BookOpen,
  Layers,
  Sparkles,
  Eye,
  MessageSquare,
  UserPlus,
  History,
  MoreHorizontal,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface TicketRowProps {
  ticket: JiraTicketItem;
}

const typeStyles: Record<string, { icon: React.ReactNode; bg: string; text: string }> = {
  Bug: { icon: <Bug className="h-3.5 w-3.5" />, bg: 'bg-red-100 text-red-600 ring-red-200/60', text: '#DC2626' },
  Task: { icon: <CheckSquare className="h-3.5 w-3.5" />, bg: 'bg-blue-100 text-blue-600 ring-blue-200/60', text: '#2563EB' },
  Story: { icon: <BookOpen className="h-3.5 w-3.5" />, bg: 'bg-emerald-100 text-emerald-600 ring-emerald-200/60', text: '#059669' },
  Epic: { icon: <Layers className="h-3.5 w-3.5" />, bg: 'bg-purple-100 text-purple-600 ring-purple-200/60', text: '#7C3AED' },
  Improvement: { icon: <Sparkles className="h-3.5 w-3.5" />, bg: 'bg-cyan-100 text-cyan-600 ring-cyan-200/60', text: '#0891B2' },
};

const statusGradient: Record<string, string> = {
  new: 'from-blue-500 to-sky-500',
  indeterminate: 'from-orange-500 to-amber-500',
  done: 'from-emerald-500 to-green-500',
  undefined: 'from-slate-400 to-slate-500',
};

const statusName = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes('test')) return 'from-purple-500 to-violet-500';
  if (n.includes('block')) return 'from-red-500 to-rose-500';
  return '';
};

const priorityDot: Record<string, string> = {
  Critical: 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.7)]',
  High: 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.6)]',
  Medium: 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]',
  Low: 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]',
};

const priorityText: Record<string, string> = {
  Critical: 'text-red-600',
  High: 'text-orange-600',
  Medium: 'text-yellow-600',
  Low: 'text-emerald-600',
};

const getInitials = (name: string) =>
  name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

const TicketRow: React.FC<TicketRowProps> = ({ ticket }) => {
  const handleOpen = () => window.open(ticket.url, '_blank', 'noopener,noreferrer');
  const t = typeStyles[ticket.issueType.name] ?? typeStyles.Task;
  const gradient = statusName(ticket.status.name) || statusGradient[ticket.status.category] || statusGradient.undefined;
  const updated = formatDistanceToNow(new Date(ticket.updated), { addSuffix: true });
  const priority = ticket.priority?.name || 'Medium';

  return (
    <div
      onClick={handleOpen}
      className={cn(
        'group relative flex items-center gap-4 min-h-[90px] px-5 rounded-[22px] cursor-pointer',
        'border border-white/60 bg-white/[0.55] backdrop-blur-[35px]',
        'shadow-[0_10px_30px_-15px_rgba(37,99,235,0.15)]',
        'transition-all duration-300 hover:-translate-y-0.5 hover:border-[#4F46E5]/40',
        'hover:shadow-[0_20px_60px_-20px_rgba(79,70,229,0.35)] hover:bg-white/[0.75]',
      )}
    >
      {/* Priority accent bar */}
      <div className={cn('absolute left-0 top-4 bottom-4 w-1 rounded-r-full', priorityDot[priority] || priorityDot.Medium)} />

      {/* Type icon */}
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1', t.bg)}>
        {t.icon}
      </div>

      {/* Left: key + summary */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-semibold text-[#4F46E5] bg-[#4F46E5]/10 px-2 py-0.5 rounded-md">
            {ticket.key}
          </span>
          {ticket.isAICreated && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded-full bg-gradient-to-r from-[#4F46E5]/15 to-[#8B5CF6]/15 ring-1 ring-[#4F46E5]/30">
                  <Sparkles className="h-3 w-3 text-[#4F46E5]" />
                  <span className="text-[10px] font-semibold text-[#4F46E5]">AI</span>
                </span>
              </TooltipTrigger>
              <TooltipContent>Created via AI Ticket Raiser</TooltipContent>
            </Tooltip>
          )}
          <span className={cn('text-[10px] font-bold uppercase tracking-wider', priorityText[priority])}>
            {priority}
          </span>
        </div>
        <p className="mt-1 text-[15px] font-semibold text-slate-900 truncate group-hover:text-[#4F46E5] transition-colors">
          {ticket.summary}
        </p>
      </div>

      {/* Middle: type name */}
      <div className="hidden lg:flex flex-col items-start w-[110px] shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Type</span>
        <span className="text-xs font-semibold text-slate-700">{ticket.issueType.name}</span>
      </div>

      {/* Status pill */}
      <div className="hidden md:block shrink-0">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[11px] font-bold text-white',
            'bg-gradient-to-r shadow-[0_4px_12px_-4px_rgba(0,0,0,0.2)]',
            gradient,
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
          {ticket.status.name}
        </span>
      </div>

      {/* Assignee */}
      <div className="hidden md:flex items-center gap-2 w-[140px] shrink-0">
        {ticket.assignee ? (
          <>
            <Avatar className="h-8 w-8 ring-2 ring-white shadow">
              <AvatarImage src={ticket.assignee.avatarUrl} />
              <AvatarFallback className="text-[10px] bg-gradient-to-br from-[#4F46E5] to-[#8B5CF6] text-white font-semibold">
                {getInitials(ticket.assignee.displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate">
                {ticket.assignee.displayName.split(' ')[0]}
              </p>
              <p className="text-[10px] text-slate-500">Assignee</p>
            </div>
          </>
        ) : (
          <span className="text-xs text-slate-400 italic">Unassigned</span>
        )}
      </div>

      {/* Updated + actions */}
      <div className="hidden md:flex items-center gap-1 w-[130px] justify-end shrink-0">
        <span className="text-[11px] font-medium text-slate-500 group-hover:opacity-0 transition-opacity">
          {updated}
        </span>
        <div className="absolute right-4 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {[
            { icon: Eye, label: 'View' },
            { icon: MessageSquare, label: 'Comment' },
            { icon: UserPlus, label: 'Assign' },
            { icon: History, label: 'History' },
            { icon: Sparkles, label: 'AI Analyze' },
            { icon: MoreHorizontal, label: 'More' },
          ].map(({ icon: Icon, label }) => (
            <Tooltip key={label}>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (label === 'View') handleOpen();
                  }}
                  className="h-7 w-7 rounded-lg text-slate-500 hover:text-[#4F46E5] hover:bg-[#4F46E5]/10 flex items-center justify-center transition-all"
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* External link indicator mobile */}
      <ExternalLink className="md:hidden h-4 w-4 text-slate-400" />
    </div>
  );
};

export default TicketRow;
