import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetDescription 
} from '@/components/ui/sheet';
import { 
  History, 
  Clock, 
  Trash2, 
  ChevronRight,
  FileCode,
  FileCode2,
  ClipboardList,
  X,
  Play
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  automationHistoryService, 
  HistoryEntry, 
  AutomationToolType 
} from '@/lib/automationHistory';
import { useHistoryLogs, HistoryLog } from '@/hooks/useHistoryLogs';
import { sessionHistoryService } from '@/lib/sessionHistory';

interface HistoryPanelProps {
  toolType?: AutomationToolType;
  moduleName?: string;
  onSelectEntry?: (entry: HistoryEntry) => void;
  onResumePrompt?: (prompt: string) => void;
  className?: string;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ 
  toolType, 
  moduleName,
  onSelectEntry,
  onResumePrompt,
  className 
}) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { logs, fetchLogs } = useHistoryLogs();

  // Filter persistent logs by module name
  const filteredLogs = moduleName 
    ? logs.filter(l => l.module_name === moduleName)
    : logs;

  const loadHistory = useCallback(() => {
    try {
      const entries = toolType 
        ? automationHistoryService.getHistoryByTool(toolType)
        : automationHistoryService.getHistory();
      setHistory(entries);
    } catch (error) {
      console.error('Error loading history:', error);
      setHistory([]);
    }
  }, [toolType]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
      fetchLogs();
    }
  }, [isOpen, loadHistory, fetchLogs]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    automationHistoryService.deleteEntry(id);
    loadHistory();
  };

  const handleClearAll = () => {
    automationHistoryService.clearHistory(toolType);
    loadHistory();
  };

  const handleResume = (log: HistoryLog) => {
    if (log.input_prompt && onResumePrompt) {
      onResumePrompt(log.input_prompt);
      setIsOpen(false);
    }
  };

  const getToolIcon = (type: AutomationToolType) => {
    switch (type) {
      case 'scenario': return <FileCode className="h-4 w-4" />;
      case 'xpath': return <FileCode2 className="h-4 w-4" />;
      case 'testcase': return <ClipboardList className="h-4 w-4" />;
    }
  };

  const getToolColor = (type: AutomationToolType) => {
    switch (type) {
      case 'scenario': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case 'xpath': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
      case 'testcase': return 'bg-green-500/10 text-green-600 dark:text-green-400';
    }
  };

  const totalCount = filteredLogs.length || history.length;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className={cn("gap-2", className)}>
          <History className="h-4 w-4" />
          History
          {totalCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {totalCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Recent Activity
          </SheetTitle>
          <SheetDescription>
            {toolType 
              ? `Your recent ${automationHistoryService.getToolLabel(toolType)} sessions`
              : 'Your recent automation tool sessions'}
            {onResumePrompt && ' — Click ▶ to resume'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4">
          {filteredLogs.length > 0 && (
            <div className="flex justify-end mb-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClearAll}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            </div>
          )}

          <ScrollArea className="h-[calc(100vh-200px)]">
            {/* Persistent DB logs */}
            {filteredLogs.length > 0 ? (
              <div className="space-y-2">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="group relative p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {sessionHistoryService.getModuleLabel(log.module_name)}
                          </Badge>
                          <Badge variant="secondary" className="text-xs capitalize">
                            {log.action_type}
                          </Badge>
                        </div>
                        
                        {log.input_prompt && (
                          <p className="text-sm font-medium truncate mb-0.5">
                            {log.input_prompt.slice(0, 80)}{log.input_prompt.length > 80 ? '...' : ''}
                          </p>
                        )}
                        
                        {log.output_summary && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                            {log.output_summary}
                          </p>
                        )}

                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>
                            {new Date(log.created_at).toLocaleDateString('en-US', {
                              day: 'numeric', month: 'short',
                            })}
                          </span>
                          <span className="text-muted-foreground/50">•</span>
                          <span>
                            {new Date(log.created_at).toLocaleTimeString('en-US', {
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Resume + Delete */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {log.input_prompt && onResumePrompt && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Resume this prompt"
                            onClick={() => handleResume(log)}
                          >
                            <Play className="h-3.5 w-3.5 text-primary" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <History className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">No recent activity</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Your automation sessions will appear here
                </p>
              </div>
            ) : (
              // Fallback to local storage entries
              <div className="space-y-2">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className={cn(
                      "group relative p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors",
                      onSelectEntry && "cursor-pointer"
                    )}
                    onClick={() => onSelectEntry?.(entry)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "h-8 w-8 rounded-md flex items-center justify-center flex-shrink-0",
                        getToolColor(entry.toolType)
                      )}>
                        {getToolIcon(entry.toolType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm truncate block">{entry.title}</span>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{entry.summary}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{automationHistoryService.formatTimestamp(entry.timestamp)}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => handleDelete(entry.id, e)}
                      >
                        <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default HistoryPanel;
