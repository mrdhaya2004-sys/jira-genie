import React, { useMemo, useState } from 'react';
import { ChevronRight, ChevronDown, File as FileIcon, Folder, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FileNode } from './sampleProjects';

const iconFor = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase();
  const colors: Record<string, string> = {
    java: 'text-orange-400', kt: 'text-purple-400',
    ts: 'text-sky-400', tsx: 'text-sky-400', js: 'text-yellow-400', jsx: 'text-yellow-400',
    json: 'text-amber-400', xml: 'text-emerald-400', yaml: 'text-emerald-400', yml: 'text-emerald-400',
    feature: 'text-lime-400', md: 'text-slate-400',
    gradle: 'text-emerald-500', groovy: 'text-emerald-500',
    properties: 'text-blue-400', csv: 'text-teal-400',
  };
  return colors[ext || ''] || 'text-muted-foreground';
};

interface TreeProps {
  nodes: FileNode[];
  activePath: string;
  onOpen: (path: string) => void;
  depth?: number;
}

const Tree: React.FC<TreeProps> = ({ nodes, activePath, onOpen, depth = 0 }) => {
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const s: Record<string, boolean> = {};
    nodes.forEach(n => { if (n.type === 'dir' && depth < 2) s[n.path] = true; });
    return s;
  });
  return (
    <ul className="text-[13px]">
      {nodes.map(n => (
        <li key={n.path}>
          {n.type === 'dir' ? (
            <>
              <button
                type="button"
                onClick={() => setOpen(s => ({ ...s, [n.path]: !s[n.path] }))}
                className="w-full flex items-center gap-1 px-2 py-1 rounded hover:bg-white/5 text-left"
                style={{ paddingLeft: 8 + depth * 12 }}
              >
                {open[n.path] ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                {open[n.path] ? <FolderOpen className="h-4 w-4 text-sky-400" /> : <Folder className="h-4 w-4 text-sky-400/80" />}
                <span className="truncate">{n.name}</span>
              </button>
              {open[n.path] && <Tree nodes={n.children} activePath={activePath} onOpen={onOpen} depth={depth + 1} />}
            </>
          ) : (
            <button
              type="button"
              onClick={() => onOpen(n.path)}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-white/5',
                activePath === n.path && 'bg-primary/15 text-primary-foreground'
              )}
              style={{ paddingLeft: 22 + depth * 12 }}
            >
              <FileIcon className={cn('h-3.5 w-3.5', iconFor(n.name))} />
              <span className="truncate">{n.name}</span>
            </button>
          )}
        </li>
      ))}
    </ul>
  );
};

export default Tree;
