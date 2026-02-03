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
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  automationHistoryService, 
  HistoryEntry, 
  AutomationToolType 
} from '@/lib/automationHistory';

interface HistoryPanelProps {
  toolType?: AutomationToolType;
  onSelectEntry?: (entry: HistoryEntry) => void;
  className?: string;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ 
  toolType, 
  onSelectEntry,
  className 
}) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const loadHistory = useCallback(() => {
    try {
      const entries = toolType 
        ? automationHistoryService.getHistoryByTool(toolType)
        : automationHistoryService.getHistory();
      console.log('Loaded history entries:', entries.length, 'for tool:', toolType);
      setHistory(entries);
    } catch (error) {
      console.error('Error loading history:', error);
      setHistory([]);
    }
  }, [toolType]);

  // Load history on mount, when panel opens, and when toolType changes
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Reload history when panel opens
  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, loadHistory]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    automationHistoryService.deleteEntry(id);
    loadHistory();
  };

  const handleClearAll = () => {
    automationHistoryService.clearHistory(toolType);
    loadHistory();
  };

  const getToolIcon = (type: AutomationToolType) => {
    switch (type) {
      case 'scenario':
        return <FileCode className="h-4 w-4" />;
      case 'xpath':
        return <FileCode2 className="h-4 w-4" />;
      case 'testcase':
        return <ClipboardList className="h-4 w-4" />;
    }
  };

  const getToolColor = (type: AutomationToolType) => {
    switch (type) {
      case 'scenario':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case 'xpath':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
      case 'testcase':
        return 'bg-green-500/10 text-green-600 dark:text-green-400';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className={cn("gap-2", className)}>
          <History className="h-4 w-4" />
          History
          {history.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {history.length}
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
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4">
          {history.length > 0 && (
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
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <History className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">
                  No recent activity
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  Your automation sessions will appear here
                </p>
              </div>
            ) : (
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
                      {/* Tool icon */}
                      <div className={cn(
                        "h-8 w-8 rounded-md flex items-center justify-center flex-shrink-0",
                        getToolColor(entry.toolType)
                      )}>
                        {getToolIcon(entry.toolType)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {!toolType && (
                            <Badge variant="outline" className="text-xs">
                              {automationHistoryService.getToolIcon(entry.toolType)}
                            </Badge>
                          )}
                          <span className="font-medium text-sm truncate">
                            {entry.title}
                          </span>
                        </div>
                        
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {entry.summary}
                        </p>

                        {/* Metadata badges */}
                        <div className="flex flex-wrap gap-1 mb-2">
                          {entry.metadata?.workspace && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0">
                              📁 {entry.metadata.workspace}
                            </Badge>
                          )}
                          {entry.metadata?.module && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0">
                              📦 {entry.metadata.module}
                            </Badge>
                          )}
                          {entry.metadata?.framework && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0">
                              ⚙️ {entry.metadata.framework}
                            </Badge>
                          )}
                          {entry.metadata?.platform && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0">
                              {entry.metadata.platform === 'android' ? '🤖' : '🍎'} {entry.metadata.platform}
                            </Badge>
                          )}
                        </div>

                        {/* Timestamp */}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{automationHistoryService.formatTimestamp(entry.timestamp)}</span>
                          <span className="text-muted-foreground/50">•</span>
                          <span className="text-muted-foreground/70">
                            {entry.timestamp.toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => handleDelete(entry.id, e)}
                        >
                          <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                        {onSelectEntry && (
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
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
