import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  History,
  Clock,
  Trash2,
  X,
  RotateCcw,
  Search,
  Download,
  CalendarDays,
  LayoutGrid,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHistoryLogs } from '@/hooks/useHistoryLogs';
import { sessionHistoryService } from '@/lib/sessionHistory';
import HistoryLogEntry from './HistoryLogEntry';
import SessionHistoryBar from './SessionHistoryBar';

const MODULE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'test-case-generator', label: 'Test Cases' },
  { value: 'logic-scenario-creator', label: 'Scenarios' },
  { value: 'xpath-generator', label: 'XPath' },
  { value: 'jira-ticket-raiser', label: 'Jira' },
  { value: 'agentic-ai', label: 'Agentic AI' },
];

interface HistoryModuleProps {
  onResumeAction?: (module: string, prompt: string, historyLogId?: string) => void;
}

const HistoryModule: React.FC<HistoryModuleProps> = ({ onResumeAction }) => {
  const {
    logs,
    isLoading,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    filterModule,
    setFilterModule,
    fetchLogs,
    deleteLog,
    clearAllLogs,
    logsByDate,
    logsByModule,
    exportAsCSV,
  } = useHistoryLogs();

  const grouped = viewMode === 'date' ? logsByDate() : logsByModule();

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Session History Bar */}
      <SessionHistoryBar />

      {/* Header */}
      <div className="border-b bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <History className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              📜 Persistent History
              <Badge variant="secondary" className="text-xs">
                {logs.length} entries
              </Badge>
            </h2>
            <p className="text-xs text-muted-foreground">
              Complete audit trail of all automation activity
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {logs.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={exportAsCSV}>
                <Download className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllLogs}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear {filterModule === 'all' ? 'All' : 'Filtered'}
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={fetchLogs}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Toolbar: Search + View Toggle + Filter */}
      <div className="border-b bg-card/50 px-4 py-2 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by module, keyword, or date..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>

        {/* View mode */}
        <Tabs value={viewMode} onValueChange={v => setViewMode(v as 'date' | 'module')}>
          <TabsList className="h-8">
            <TabsTrigger value="date" className="text-xs px-2 h-6 gap-1">
              <CalendarDays className="h-3 w-3" /> Date
            </TabsTrigger>
            <TabsTrigger value="module" className="text-xs px-2 h-6 gap-1">
              <LayoutGrid className="h-3 w-3" /> Module
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Module filter */}
        <div className="flex items-center gap-1.5">
          {MODULE_OPTIONS.map(opt => (
            <Button
              key={opt.value}
              variant={filterModule === opt.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterModule(opt.value)}
              className="text-xs h-7"
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6 max-w-4xl mx-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <RotateCcw className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : Object.keys(grouped).length === 0 ? (
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
            Object.entries(grouped).map(([groupKey, groupLogs]) => (
              <div key={groupKey}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-foreground">{groupKey}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {groupLogs.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {groupLogs.map(log => (
                    <HistoryLogEntry
                      key={log.id}
                      log={log}
                      onDelete={deleteLog}
                      onResume={onResumeAction}
                    />
                  ))}
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
