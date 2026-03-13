import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, User, Bot } from 'lucide-react';
import { sessionHistoryService } from '@/lib/sessionHistory';
import type { HistoryLog } from '@/hooks/useHistoryLogs';

interface HistoryViewDialogProps {
  log: HistoryLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const HistoryViewDialog: React.FC<HistoryViewDialogProps> = ({ log, open, onOpenChange }) => {
  if (!log) return null;

  const d = new Date(log.created_at);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            📜 History Entry
            <Badge variant="outline" className="text-xs">
              {sessionHistoryService.getModuleLabel(log.module_name)}
            </Badge>
          </DialogTitle>
          <DialogDescription className="flex items-center gap-1.5 text-xs">
            <Clock className="h-3 w-3" />
            {d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
            {' • '}
            {d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-2">
          <div className="space-y-4">
            {/* User Prompt */}
            {log.input_prompt && (
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 rounded-lg border bg-muted/50 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Your Prompt</p>
                  <p className="text-sm whitespace-pre-wrap">{log.input_prompt}</p>
                </div>
              </div>
            )}

            {/* AI Response */}
            {log.output_summary && (
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-accent-foreground" />
                </div>
                <div className="flex-1 rounded-lg border bg-card p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">AI Response</p>
                  <p className="text-sm whitespace-pre-wrap">{log.output_summary}</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default HistoryViewDialog;
