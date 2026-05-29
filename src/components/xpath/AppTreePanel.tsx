import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronRight, Search, Layers3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AppTreeScreen, ElementType } from '@/types/xpath';

interface AppTreePanelProps {
  appTree: AppTreeScreen[];
  totalNodes: number;
}

const elementTypeIcon: Record<string, string> = {
  button: '🔘', input: '📝', dropdown: '🔽', checkbox: '☑️', radio: '🔘',
  link: '🔗', text: '🔤', image: '🖼️', table: '📊', list: '📋',
  nav: '🧭', dialog: '💬', tab: '📑', card: '🪪', form: '📋',
  container: '📦', accessibility: '♿', unknown: '❓',
};

const AppTreePanel: React.FC<AppTreePanelProps> = ({ appTree, totalNodes }) => {
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    appTree.slice(0, 2).forEach((s) => { init[s.screen] = true; });
    return init;
  });
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    if (!filter.trim()) return appTree;
    const q = filter.toLowerCase();
    return appTree
      .map((s) => ({
        ...s,
        interactive: s.interactive.filter(
          (e) => e.name.toLowerCase().includes(q) || e.tag.toLowerCase().includes(q),
        ),
      }))
      .filter((s) => s.screen.toLowerCase().includes(q) || s.interactive.length > 0);
  }, [appTree, filter]);

  if (!appTree || appTree.length === 0) return null;

  return (
    <Card className="p-3 space-y-2 bg-muted/30 border-border/60">
      <div className="flex items-center justify-between gap-2">
        <h5 className="text-xs font-semibold flex items-center gap-1.5">
          <Layers3 className="h-3.5 w-3.5 text-primary" />
          Application Tree
        </h5>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-[10px]">{appTree.length} screen{appTree.length === 1 ? '' : 's'}</Badge>
          <Badge variant="outline" className="text-[10px]">{totalNodes.toLocaleString()} nodes</Badge>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter screens & elements…"
          className="h-7 pl-7 text-xs"
        />
      </div>

      <div className="max-h-72 overflow-y-auto pr-1 space-y-1">
        {filtered.map((s) => {
          const isOpen = !!open[s.screen] || !!filter.trim();
          return (
            <div key={s.screen} className="text-xs">
              <button
                type="button"
                onClick={() => setOpen((p) => ({ ...p, [s.screen]: !isOpen }))}
                className="flex items-center gap-1.5 w-full px-1 py-1 rounded hover:bg-background/60 transition-colors text-left"
              >
                {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                <span className="font-medium truncate">{s.screen}</span>
                <Badge variant="outline" className="text-[10px] ml-auto">{s.interactive.length}/{s.total}</Badge>
              </button>
              {isOpen && (
                <ul className="ml-4 pl-2 border-l border-border/40 space-y-0.5 mt-0.5">
                  {s.interactive.length === 0 ? (
                    <li className="text-[11px] text-muted-foreground italic py-0.5">No interactive elements detected.</li>
                  ) : (
                    s.interactive.map((el) => (
                      <li
                        key={el.id}
                        className={cn(
                          'flex items-center gap-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors',
                        )}
                        title={el.tag}
                      >
                        <span className="text-[10px]">{elementTypeIcon[el.element_type] || '•'}</span>
                        <span className="truncate flex-1">{el.name}</span>
                        <code className="text-[9px] font-mono opacity-60 shrink-0">{el.element_type}</code>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-[11px] text-muted-foreground italic px-1 py-2">No matches.</p>
        )}
      </div>
    </Card>
  );
};

export default AppTreePanel;
