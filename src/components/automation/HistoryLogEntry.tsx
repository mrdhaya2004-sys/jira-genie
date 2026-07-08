import React from 'react';
import { Button } from '@/components/ui/button';
import { Eye, Play, Trash2, Clock, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sessionHistoryService } from '@/lib/sessionHistory';
import type { HistoryLog } from '@/hooks/useHistoryLogs';

/** Vibrant accent system matched to the Intelligence Hub palette */
const MODULE_ACCENT: Record<string, { hue: string; chip: string; ring: string; glow: string; icon: string; label: string }> = {
  'test-case-generator':    { hue: '#10B981', chip: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/25', ring: 'ring-emerald-400/40', glow: 'shadow-[0_0_0_1px_rgba(16,185,129,0.18),0_18px_40px_-18px_rgba(16,185,129,0.45)]', icon: '📋', label: 'Test Cases' },
  'logic-scenario-creator': { hue: '#06B6D4', chip: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border-cyan-500/25', ring: 'ring-cyan-400/40', glow: 'shadow-[0_0_0_1px_rgba(6,182,212,0.18),0_18px_40px_-18px_rgba(6,182,212,0.45)]', icon: '🧩', label: 'Scenarios' },
  'xpath-generator':        { hue: '#8B5CF6', chip: 'bg-violet-500/15 text-violet-600 dark:text-violet-300 border-violet-500/25', ring: 'ring-violet-400/40', glow: 'shadow-[0_0_0_1px_rgba(139,92,246,0.18),0_18px_40px_-18px_rgba(139,92,246,0.45)]', icon: '🧬', label: 'XPath' },
  'jira-ticket-raiser':     { hue: '#F59E0B', chip: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/25', ring: 'ring-amber-400/40', glow: 'shadow-[0_0_0_1px_rgba(245,158,11,0.18),0_18px_40px_-18px_rgba(245,158,11,0.45)]', icon: '🎫', label: 'Jira' },
  'agentic-ai':             { hue: '#A855F7', chip: 'bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300 border-fuchsia-500/25', ring: 'ring-fuchsia-400/40', glow: 'shadow-[0_0_0_1px_rgba(168,85,247,0.18),0_18px_40px_-18px_rgba(168,85,247,0.45)]', icon: '🤖', label: 'Agentic AI' },
  'code-analyzer':          { hue: '#3B82F6', chip: 'bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/25', ring: 'ring-blue-400/40', glow: 'shadow-[0_0_0_1px_rgba(59,130,246,0.18),0_18px_40px_-18px_rgba(59,130,246,0.45)]', icon: '🧠', label: 'Code Analyzer' },
  'defect-analyzer':        { hue: '#EF4444', chip: 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/25', ring: 'ring-rose-400/40', glow: 'shadow-[0_0_0_1px_rgba(239,68,68,0.18),0_18px_40px_-18px_rgba(239,68,68,0.45)]', icon: '🐞', label: 'Defects' },
  'gitlab-execution':       { hue: '#F97316', chip: 'bg-orange-500/15 text-orange-600 dark:text-orange-300 border-orange-500/25', ring: 'ring-orange-400/40', glow: 'shadow-[0_0_0_1px_rgba(249,115,22,0.18),0_18px_40px_-18px_rgba(249,115,22,0.45)]', icon: '🚀', label: 'GitLab' },
  'chat':                   { hue: '#06B6D4', chip: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border-cyan-500/25', ring: 'ring-cyan-400/40', glow: 'shadow-[0_0_0_1px_rgba(6,182,212,0.18),0_18px_40px_-18px_rgba(6,182,212,0.45)]', icon: '💬', label: 'AI Chat' },
};
const DEFAULT_ACCENT = { hue: '#64748B', chip: 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/25', ring: 'ring-slate-400/40', glow: 'shadow-[0_0_0_1px_rgba(100,116,139,0.18),0_18px_40px_-18px_rgba(100,116,139,0.35)]', icon: '📄', label: 'Activity' };

interface Props {
  log: HistoryLog;
  onDelete: (id: string) => void;
  onView?: (log: HistoryLog) => void;
  onResume?: (module: string, prompt: string, historyLogId: string) => void;
}

const HistoryLogEntry: React.FC<Props> = ({ log, onDelete, onView, onResume }) => {
  const d = new Date(log.created_at);
  const accent = MODULE_ACCENT[log.module_name] || DEFAULT_ACCENT;
  const moduleLabel = sessionHistoryService.getModuleLabel(log.module_name) || accent.label;
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="group relative flex gap-3 pl-1.5">
      {/* Timeline rail dot */}
      <div className="relative flex flex-col items-center pt-4">
        <div
          className={cn('relative h-2.5 w-2.5 rounded-full ring-4', accent.ring)}
          style={{ background: accent.hue, boxShadow: `0 0 14px ${accent.hue}80` }}
        />
      </div>

      {/* Time stamp column */}
      <div className="hidden sm:flex flex-col items-end pt-3 w-[52px] shrink-0">
        <span className="text-[11px] font-semibold text-foreground tabular-nums">{time}</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
      </div>

      {/* Glass card */}
      <div
        className={cn(
          'relative flex-1 min-w-0 rounded-2xl p-3 mb-2.5 transition-all duration-300',
          'bg-white/55 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06]',
          'hover:-translate-y-0.5 hover:bg-white/70 dark:hover:bg-white/[0.07]',
          accent.glow,
        )}
      >
        {/* Subtle tinted wash */}
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-60"
          style={{ background: `radial-gradient(120% 100% at 0% 0%, ${accent.hue}1F, transparent 55%)` }}
        />

        <div className="relative flex items-start gap-2.5">
          <div
            className={cn('h-9 w-9 rounded-xl flex items-center justify-center text-base shrink-0 border', accent.chip)}
          >
            <span>{accent.icon}</span>
          </div>

          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span
                className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full border', accent.chip)}
              >
                {moduleLabel}
              </span>
              <span className="text-[11px] text-muted-foreground capitalize">{log.action_type.replace(/_/g, ' ')}</span>
              <span className="sm:hidden inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" /> {time}
              </span>
            </div>

            {log.input_prompt && (
              <p className="text-sm font-medium text-foreground mb-0.5 line-clamp-2 leading-snug break-words">
                {log.input_prompt}
              </p>
            )}
            {log.output_summary && (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed break-words">
                {log.output_summary}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              {onView && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5 bg-white/40 dark:bg-white/[0.04] backdrop-blur-md border-white/40 dark:border-white/10"
                  onClick={() => onView(log)}
                >
                  <Eye className="h-3 w-3" />
                  View
                </Button>
              )}
              {log.input_prompt && onResume && (
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1.5 text-white border-0"
                  style={{ background: `linear-gradient(135deg, ${accent.hue}, ${accent.hue}cc)` }}
                  onClick={() => onResume(log.module_name, log.input_prompt!, log.id)}
                >
                  <Play className="h-3 w-3" />
                  Continue
                </Button>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="absolute -top-1.5 -right-1.5 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity bg-white/60 dark:bg-black/40 backdrop-blur-md rounded-full"
            onClick={() => onDelete(log.id)}
          >
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HistoryLogEntry;
