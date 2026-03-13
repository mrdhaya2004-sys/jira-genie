import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Play, Trash2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sessionHistoryService } from '@/lib/sessionHistory';
import type { HistoryLog } from '@/hooks/useHistoryLogs';

const MODULE_COLORS: Record<string, string> = {
  'test-case-generator': 'bg-green-500/10 text-green-600 dark:text-green-400',
  'logic-scenario-creator': 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  'xpath-generator': 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  'jira-ticket-raiser': 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  'agentic-ai': 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
};

const MODULE_ICONS: Record<string, string> = {
  'test-case-generator': '📋',
  'logic-scenario-creator': '🧩',
  'xpath-generator': '🧬',
  'jira-ticket-raiser': '🎫',
  'agentic-ai': '🤖',
};

interface Props {
  log: HistoryLog;
  onDelete: (id: string) => void;
  onView?: (log: HistoryLog) => void;
  onResume?: (module: string, prompt: string, historyLogId: string) => void;
}

const HistoryLogEntry: React.FC<Props> = ({ log, onDelete, onView, onResume }) => {
  const d = new Date(log.created_at);
  const colorClass = MODULE_COLORS[log.module_name] || 'bg-muted text-muted-foreground';
  const icon = MODULE_ICONS[log.module_name] || '📄';

  return (
    <div className="group relative p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center text-sm flex-shrink-0', colorClass)}>
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Badge variant="outline" className="text-xs">
              {sessionHistoryService.getModuleLabel(log.module_name)}
            </Badge>
            <Badge variant="secondary" className="text-xs capitalize">
              {log.action_type}
            </Badge>
          </div>

          {log.input_prompt && (
            <p className="text-sm font-medium text-foreground mb-0.5 line-clamp-1">
              {log.input_prompt}
            </p>
          )}

          {log.output_summary && (
            <p className="text-xs text-muted-foreground mb-1.5 line-clamp-1">
              {log.output_summary}
            </p>
          )}

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              {d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <span className="text-muted-foreground/50">•</span>
            <span>{d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mt-2">
            {onView && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => onView(log)}
              >
                <Eye className="h-3 w-3" />
                View
              </Button>
            )}
            {log.input_prompt && onResume && (
              <Button
                variant="default"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => onResume(log.module_name, log.input_prompt!, log.id)}
              >
                <Play className="h-3 w-3" />
                Continue
              </Button>
            )}
          </div>
        </div>

        {/* Delete */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          onClick={() => onDelete(log.id)}
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
        </Button>
      </div>
    </div>
  );
};

export default HistoryLogEntry;
