import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  History, 
  Clock, 
  Trash2, 
  FileCode,
  FileCode2,
  ClipboardList,
  X,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  automationHistoryService, 
  HistoryEntry, 
  AutomationToolType 
} from '@/lib/automationHistory';

const HistoryModule: React.FC = () => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<AutomationToolType | 'all'>('all');

  const loadHistory = useCallback(() => {
    try {
      const entries = selectedFilter === 'all' 
        ? automationHistoryService.getHistory()
        : automationHistoryService.getHistoryByTool(selectedFilter);
      setHistory(entries);
    } catch (error) {
      console.error('Error loading history:', error);
      setHistory([]);
    }
  }, [selectedFilter]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleDelete = (id: string) => {
    automationHistoryService.deleteEntry(id);
    loadHistory();
  };

  const handleClearAll = () => {
    if (selectedFilter === 'all') {
      automationHistoryService.clearHistory();
    } else {
      automationHistoryService.clearHistory(selectedFilter);
    }
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

  const filterOptions: { value: AutomationToolType | 'all'; label: string; icon: string }[] = [
    { value: 'all', label: 'All', icon: '📋' },
    { value: 'scenario', label: 'Scenarios', icon: '🧩' },
    { value: 'xpath', label: 'XPath', icon: '🧬' },
    { value: 'testcase', label: 'Test Cases', icon: '📋' },
  ];

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <History className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              📜 Automation History
              <Badge variant="secondary" className="text-xs">
                {history.length} entries
              </Badge>
            </h2>
            <p className="text-xs text-muted-foreground">
              View your recent automation tool activity
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleClearAll}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear {selectedFilter === 'all' ? 'All' : selectedFilter}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={loadHistory}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b bg-card/50 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filter:</span>
          {filterOptions.map((option) => (
            <Button
              key={option.value}
              variant={selectedFilter === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedFilter(option.value)}
              className="text-xs"
            >
              {option.icon} {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* History List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3 max-w-4xl mx-auto">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <History className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No activity yet</h3>
              <p className="text-muted-foreground text-sm max-w-md">
                Your automation tool usage will appear here. Start generating scenarios, XPaths, or test cases to see your history.
              </p>
            </div>
          ) : (
            history.map((entry) => (
              <div
                key={entry.id}
                className="group relative p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Tool icon */}
                  <div className={cn(
                    "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
                    getToolColor(entry.toolType)
                  )}>
                    {getToolIcon(entry.toolType)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {automationHistoryService.getToolIcon(entry.toolType)} {automationHistoryService.getToolLabel(entry.toolType)}
                      </Badge>
                    </div>
                    
                    <h4 className="font-medium text-sm mb-1 truncate">
                      {entry.title}
                    </h4>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {entry.summary}
                    </p>

                    {/* Metadata badges */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {entry.metadata?.workspace && (
                        <Badge variant="secondary" className="text-xs">
                          📁 {entry.metadata.workspace}
                        </Badge>
                      )}
                      {entry.metadata?.module && (
                        <Badge variant="secondary" className="text-xs">
                          📦 {entry.metadata.module}
                        </Badge>
                      )}
                      {entry.metadata?.framework && (
                        <Badge variant="secondary" className="text-xs">
                          ⚙️ {entry.metadata.framework}
                        </Badge>
                      )}
                      {entry.metadata?.platform && (
                        <Badge variant="secondary" className="text-xs">
                          {entry.metadata.platform === 'android' ? '🤖' : '🍎'} {entry.metadata.platform}
                        </Badge>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{automationHistoryService.formatTimestamp(entry.timestamp)}</span>
                      <span className="text-muted-foreground/50">•</span>
                      <span>
                        {entry.timestamp.toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="text-muted-foreground/50">•</span>
                      <span>
                        {entry.timestamp.toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Delete button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDelete(entry.id)}
                  >
                    <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default HistoryModule;
