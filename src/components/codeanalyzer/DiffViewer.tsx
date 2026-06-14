import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  before: string;
  after: string;
  className?: string;
}

/**
 * Lightweight line-based diff viewer (GitHub PR style).
 * Uses a longest-common-subsequence walk over lines to mark added/removed/unchanged.
 */
function lineDiff(a: string, b: string) {
  const aLines = a.split('\n');
  const bLines = b.split('\n');
  const n = aLines.length, m = bLines.length;

  // LCS table — kept small enough for typical refactor snippets (<2k lines).
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = aLines[i] === bLines[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: { type: 'same' | 'add' | 'remove'; text: string }[] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (aLines[i] === bLines[j]) { out.push({ type: 'same', text: aLines[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ type: 'remove', text: aLines[i] }); i++; }
    else { out.push({ type: 'add', text: bLines[j] }); j++; }
  }
  while (i < n) out.push({ type: 'remove', text: aLines[i++] });
  while (j < m) out.push({ type: 'add', text: bLines[j++] });
  return out;
}

const DiffViewer: React.FC<Props> = ({ before, after, className }) => {
  const rows = useMemo(() => lineDiff(before || '', after || ''), [before, after]);
  const stats = useMemo(() => {
    let add = 0, remove = 0;
    for (const r of rows) { if (r.type === 'add') add++; else if (r.type === 'remove') remove++; }
    return { add, remove };
  }, [rows]);

  return (
    <div className={cn('hca-glass overflow-hidden', className)}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/40">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Difference</span>
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="text-emerald-600 dark:text-emerald-400">+{stats.add}</span>
          <span className="text-rose-600 dark:text-rose-400">−{stats.remove}</span>
        </div>
      </div>
      <div className="overflow-auto max-h-[480px] text-[12px] font-mono leading-relaxed">
        {rows.map((r, i) => (
          <div
            key={i}
            className={cn(
              'flex gap-2 px-3 py-0.5 whitespace-pre',
              r.type === 'add' && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
              r.type === 'remove' && 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
            )}
          >
            <span className="w-4 shrink-0 select-none opacity-60">
              {r.type === 'add' ? '+' : r.type === 'remove' ? '−' : ' '}
            </span>
            <span className="flex-1">{r.text || '\u00A0'}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DiffViewer;
