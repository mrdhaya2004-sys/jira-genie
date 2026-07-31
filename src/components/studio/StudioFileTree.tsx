import React, { useState } from 'react';
import { ChevronRight, ChevronDown, File as FileIcon, Folder, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FileNode } from './sampleProjects';

const iconFor = (name: string, dark: boolean) => {
  const ext = name.split('.').pop()?.toLowerCase();
  const light: Record<string, string> = {
    java: 'text-orange-500', kt: 'text-purple-600',
    ts: 'text-sky-600', tsx: 'text-sky-600', js: 'text-amber-500', jsx: 'text-amber-500',
    json: 'text-yellow-500', xml: 'text-purple-600', yaml: 'text-emerald-600', yml: 'text-emerald-600',
    feature: 'text-green-600', md: 'text-slate-500',
    gradle: 'text-emerald-600', groovy: 'text-emerald-600',
    properties: 'text-blue-600', csv: 'text-teal-600',
  };
  const darkMap: Record<string, string> = {
    java: 'text-orange-400', kt: 'text-purple-400',
    ts: 'text-sky-400', tsx: 'text-sky-400', js: 'text-yellow-400', jsx: 'text-yellow-400',
    json: 'text-amber-400', xml: 'text-emerald-400', yaml: 'text-emerald-400', yml: 'text-emerald-400',
    feature: 'text-lime-400', md: 'text-slate-400',
    gradle: 'text-emerald-500', groovy: 'text-emerald-500',
    properties: 'text-blue-400', csv: 'text-teal-400',
  };
  const map = dark ? darkMap : light;
  return map[ext || ''] || (dark ? 'text-muted-foreground' : 'text-slate-500');
};

interface TreeProps {
  nodes: FileNode[];
  activePath: string;
  onOpen: (path: string) => void;
  depth?: number;
  dark?: boolean;
}

const Tree: React.FC<TreeProps> = ({ nodes, activePath, onOpen, depth = 0, dark = false }) => {
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const s: Record<string, boolean> = {};
    nodes.forEach(n => { if (n.type === 'dir' && depth < 2) s[n.path] = true; });
    return s;
  });

  const hoverBg = dark ? 'hover:bg-white/5' : 'hover:bg-blue-50/70';
  const chev = dark ? 'text-muted-foreground' : 'text-slate-400';
  const folder = dark ? 'text-sky-400' : 'text-[#2563EB]';
  const folderDim = dark ? 'text-sky-400/80' : 'text-[#2563EB]/80';

  return (
    <ul className="text-[13px]">
      {nodes.map(n => (
        <li key={n.path}>
          {n.type === 'dir' ? (
            <>
              <button
                type="button"
                onClick={() => setOpen(s => ({ ...s, [n.path]: !s[n.path] }))}
                className={cn('w-full flex items-center gap-1 px-2 py-1 rounded text-left transition-colors', hoverBg)}
                style={{ paddingLeft: 8 + depth * 12 }}
              >
                {open[n.path] ? <ChevronDown className={cn('h-3.5 w-3.5', chev)} /> : <ChevronRight className={cn('h-3.5 w-3.5', chev)} />}
                {open[n.path] ? <FolderOpen className={cn('h-4 w-4', folder)} /> : <Folder className={cn('h-4 w-4', folderDim)} />}
                <span className="truncate">{n.name}</span>
              </button>
              {open[n.path] && <Tree nodes={n.children} activePath={activePath} onOpen={onOpen} depth={depth + 1} dark={dark} />}
            </>
          ) : (
            <button
              type="button"
              onClick={() => onOpen(n.path)}
              data-active={activePath === n.path ? 'true' : 'false'}
              className={cn(
                'tz-nav-item tz-nav-sm w-full gap-2 px-2 py-1 text-left text-[13px]',
                activePath === n.path && 'font-medium'
              )}
              style={{ paddingLeft: 22 + depth * 12 }}
            >
              <FileIcon className={cn('h-3.5 w-3.5', activePath === n.path ? '' : iconFor(n.name, dark))} />
              <span className="truncate">{n.name}</span>
            </button>

          )}
        </li>
      ))}
    </ul>
  );
};

export default Tree;
