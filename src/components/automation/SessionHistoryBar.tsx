import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { sessionHistoryService, SessionHistoryEntry } from '@/lib/sessionHistory';

const SessionHistoryBar: React.FC = () => {
  const [entries, setEntries] = useState<SessionHistoryEntry[]>([]);

  useEffect(() => {
    setEntries(sessionHistoryService.getHistory());
    // Poll for updates every 5 seconds
    const interval = setInterval(() => {
      setEntries(sessionHistoryService.getHistory());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  if (entries.length === 0) return null;

  // Deduplicate by module, keep latest
  const uniqueModules = new Map<string, SessionHistoryEntry>();
  entries.forEach(e => uniqueModules.set(e.module, e));
  const unique = Array.from(uniqueModules.values());

  return (
    <div className="border-b bg-primary/5 px-4 py-2 flex items-center gap-3 overflow-x-auto">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
        <Clock className="h-3.5 w-3.5" />
        <span className="font-medium">Session Activity:</span>
      </div>
      <div className="flex items-center gap-1.5">
        {unique.map((entry, idx) => (
          <Badge key={idx} variant="secondary" className="text-xs whitespace-nowrap">
            {entry.label}
          </Badge>
        ))}
      </div>
      <Badge variant="outline" className="text-xs ml-auto flex-shrink-0">
        {entries.length} action{entries.length !== 1 ? 's' : ''} this session
      </Badge>
    </div>
  );
};

export default SessionHistoryBar;
