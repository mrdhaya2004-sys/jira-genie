import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GitBranch, Send, Sparkles, Play, CalendarClock, RotateCw, Loader2, RefreshCw, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useGitLabConnection } from '@/hooks/useGitLabConnection';
import { useGitLabProjects } from '@/hooks/useGitLabProjects';
import { useGitLabPipelines } from '@/hooks/useGitLabPipelines';
import PipelineStatusCard from './PipelineStatusCard';
import ScheduleExecutionDialog from './ScheduleExecutionDialog';
import ExecutionHistoryPanel from './ExecutionHistoryPanel';
import type { ChatMsg, GitLabPipelineRun, PipelineStatus } from '@/types/gitlab';
import { format } from 'date-fns';

const CONV_ID = 'gitlab-chat-v1';
const STORAGE_PROJECT = 'gl_active_project_v1';

function matchBranch(input: string, branches: string[]): { match: string | null; suggestions: string[] } {
  const cleaned = input.toLowerCase().replace(/\b(start|run|execute|trigger|kick\s*off|fire|launch|build|deploy|pipeline|branch|now|please)\b/g, '').trim();
  if (!cleaned) return { match: null, suggestions: branches.slice(0, 6) };
  const lower = branches.map((b) => b.toLowerCase());
  let idx = lower.indexOf(cleaned);
  if (idx === -1) idx = lower.findIndex((b) => b === cleaned.replace(/\s+/g, '-'));
  if (idx === -1) idx = lower.findIndex((b) => b.includes(cleaned) || cleaned.includes(b));
  if (idx !== -1) return { match: branches[idx], suggestions: [] };

  // suggestions by substring overlap
  const scored = branches
    .map((b, i) => ({ b, score: overlap(lower[i], cleaned) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((x) => x.b);
  return { match: null, suggestions: scored.length ? scored : branches.slice(0, 5) };
}

function overlap(a: string, b: string): number {
  let s = 0;
  for (let len = Math.min(a.length, b.length); len >= 2; len--) {
    for (let i = 0; i + len <= a.length; i++) {
      if (b.includes(a.slice(i, i + len))) return len;
    }
  }
  return s;
}

interface Props {
  onConnect: () => void;
  onShowHistory: () => void;
}

const GitLabChatPanel: React.FC<Props> = ({ onConnect, onShowHistory }) => {
  const { connection, sync, syncing } = useGitLabConnection();
  const { projects, branchesByProject, reload } = useGitLabProjects(!!connection);
  const { runs } = useGitLabPipelines();

  const [activeProjectId, setActiveProjectId] = useState<string>(() => localStorage.getItem(STORAGE_PROJECT) || '');
  useEffect(() => {
    if (!activeProjectId && projects.length > 0) {
      const id = projects[0].id;
      setActiveProjectId(id);
      localStorage.setItem(STORAGE_PROJECT, id);
    }
  }, [projects, activeProjectId]);
  useEffect(() => { if (activeProjectId) localStorage.setItem(STORAGE_PROJECT, activeProjectId); }, [activeProjectId]);

  const activeProject = useMemo(() => projects.find((p) => p.id === activeProjectId) || null, [projects, activeProjectId]);
  const branches = useMemo(() => (activeProjectId ? branchesByProject[activeProjectId] || [] : []), [branchesByProject, activeProjectId]);
  const branchNames = useMemo(() => branches.map((b) => b.name), [branches]);

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [schedule, setSchedule] = useState<{ branch: string; projectRowId: string } | null>(null);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Greeting once project selected
  useEffect(() => {
    if (!activeProject || messages.length > 0) return;
    setMessages([
      {
        kind: 'ai-text', id: 'greet', at: new Date().toISOString(),
        content: `Hi! I'm your GitLab assistant for **${activeProject.name}**. Type something like *"Start ${branchNames[0] || 'main'}"* or pick a branch below.`,
      },
    ]);
  }, [activeProject, branchNames, messages.length]);

  // Reset greeting when project changes
  useEffect(() => { setMessages([]); }, [activeProjectId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, runs]);

  const pushMsg = (m: ChatMsg) => setMessages((prev) => [...prev, m]);

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || !activeProject) return;
    setInput('');
    const userId = crypto.randomUUID();
    pushMsg({ kind: 'user', id: userId, content: text, at: new Date().toISOString() });

    const { match, suggestions } = matchBranch(text, branchNames);
    if (match) {
      pushMsg({
        kind: 'ai-branch-match', id: crypto.randomUUID(), at: new Date().toISOString(),
        branch: match, projectRowId: activeProject.id,
      });
    } else {
      pushMsg({
        kind: 'ai-branch-miss', id: crypto.randomUUID(), at: new Date().toISOString(),
        query: text, suggestions,
      });
    }
  };

  const triggerNow = async (projectRowId: string, branch: string) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('gitlab-trigger-pipeline', {
        body: { project_row_id: projectRowId, branch, conversation_id: CONV_ID },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || 'Failed');
      pushMsg({ kind: 'ai-pipeline', id: crypto.randomUUID(), at: new Date().toISOString(), runId: data.run.id });
      pushMsg({
        kind: 'ai-text', id: crypto.randomUUID(), at: new Date().toISOString(),
        content: `🚀 **${branch}** pipeline started — I'll notify you when it completes.`,
      });
    } catch (e) {
      toast({ title: 'Could not trigger pipeline', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const schedulePipeline = async (projectRowId: string, branch: string, runAt: Date) => {
    const { data, error } = await supabase.from('gitlab_schedules').insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      project_row_id: projectRowId,
      branch,
      run_at: runAt.toISOString(),
      conversation_id: CONV_ID,
    }).select().single();
    if (error) {
      toast({ title: 'Schedule failed', description: error.message, variant: 'destructive' });
      return;
    }
    pushMsg({
      kind: 'ai-schedule-confirmed', id: crypto.randomUUID(), at: new Date().toISOString(),
      scheduleId: data.id, branch, runAt: runAt.toISOString(),
    });
  };

  if (!connection) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="p-8 text-center max-w-md">
          <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center">
            <GitBranch className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-lg font-semibold">Connect GitLab to start</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Trigger pipelines, schedule executions and get live status updates right inside chat.
          </p>
          <Button onClick={onConnect} className="mt-5 bg-gradient-to-r from-orange-500 to-rose-500 text-white">
            Connect GitLab
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Main chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/60 bg-card/40 backdrop-blur-sm">
          <Select value={activeProjectId} onValueChange={setActiveProjectId}>
            <SelectTrigger className="h-9 w-[300px]">
              <SelectValue placeholder={isGitHub ? 'Select repository' : 'Select project'} />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate">{p.path_with_namespace}</span>
                    {p.visibility && (
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground border border-border/60 rounded px-1 py-0.5">
                        {p.visibility}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
              {projects.length === 0 && (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  {isGitHub ? 'No repositories synced' : 'No projects synced'}
                </div>
              )}
            </SelectContent>
          </Select>
          <Button size="sm" variant="ghost" onClick={sync} disabled={syncing} className="gap-1.5">
            {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Sync
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline" className="gap-1 border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Connected
            </Badge>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowHistoryDrawer((v) => !v)}>
              <History className="h-3.5 w-3.5" /> History
            </Button>
          </div>
        </div>

        {/* Branch chips */}
        {branchNames.length > 0 && (
          <div className="px-4 py-2 border-b border-border/40 flex gap-2 flex-wrap bg-background/60">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground self-center">Suggested branches</span>
            {branchNames.slice(0, 10).map((b) => (
              <Button
                key={b} size="sm" variant="secondary"
                className="h-7 text-xs gap-1.5"
                onClick={() => send(`Start ${b}`)}
              >
                <GitBranch className="h-3 w-3" /> {b}
              </Button>
            ))}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m) => (
            <MessageRow
              key={m.id} msg={m} runs={runs}
              onStartNow={triggerNow}
              onSchedule={(branch, projectRowId) => setSchedule({ branch, projectRowId })}
              onSendChip={send}
              onRerun={(run) => triggerNow(run.project_row_id, run.branch)}
            />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-border/60 bg-card/40 backdrop-blur-sm">
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='Type "Start Homepage", "Run Regression"…'
              className="h-10"
              disabled={busy || !activeProject}
            />
            <Button type="submit" disabled={busy || !input.trim() || !activeProject} className="h-10 gap-2">
              <Send className="h-4 w-4" /> Send
            </Button>
          </form>
        </div>
      </div>

      {/* History drawer */}
      {showHistoryDrawer && (
        <div className="w-[340px] border-l border-border/60 bg-card/60 backdrop-blur-sm overflow-y-auto">
          <div className="px-4 py-2.5 border-b border-border/40 font-medium text-sm">Execution History</div>
          <ExecutionHistoryPanel runs={runs} onRerun={(r) => triggerNow(r.project_row_id, r.branch)} />
        </div>
      )}

      {schedule && (
        <ScheduleExecutionDialog
          open
          branch={schedule.branch}
          onOpenChange={(o) => { if (!o) setSchedule(null); }}
          onConfirm={async (runAt) => { await schedulePipeline(schedule.projectRowId, schedule.branch, runAt); setSchedule(null); }}
        />
      )}
    </div>
  );
};

const MessageRow: React.FC<{
  msg: ChatMsg;
  runs: GitLabPipelineRun[];
  onStartNow: (projectRowId: string, branch: string) => void;
  onSchedule: (branch: string, projectRowId: string) => void;
  onSendChip: (text: string) => void;
  onRerun: (run: GitLabPipelineRun) => void;
}> = ({ msg, runs, onStartNow, onSchedule, onSendChip, onRerun }) => {
  if (msg.kind === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-sm px-4 py-2 bg-primary text-primary-foreground text-sm">
          {msg.content}
        </div>
      </div>
    );
  }
  const wrap = (children: React.ReactNode) => (
    <div className="flex gap-3">
      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center flex-shrink-0">
        <Sparkles className="h-4 w-4 text-white" />
      </div>
      <div className="flex-1 min-w-0 space-y-2">{children}</div>
    </div>
  );

  if (msg.kind === 'ai-text') {
    return wrap(<div className="text-sm text-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>') }} />);
  }
  if (msg.kind === 'ai-branch-match') {
    return wrap(
      <Card className="p-3 bg-card/70 inline-block">
        <div className="text-sm">
          ✅ Branch found: <span className="font-semibold">{msg.branch}</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">Choose how to execute it:</div>
        <div className="mt-2 flex gap-2 flex-wrap">
          <Button size="sm" className="gap-1.5" onClick={() => onStartNow(msg.projectRowId, msg.branch)}>
            <Play className="h-3.5 w-3.5" /> Start Now
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onSchedule(msg.branch, msg.projectRowId)}>
            <CalendarClock className="h-3.5 w-3.5" /> Schedule Execution
          </Button>
        </div>
      </Card>,
    );
  }
  if (msg.kind === 'ai-branch-miss') {
    return wrap(
      <div className="text-sm">
        I couldn't find a branch matching <span className="font-medium">"{msg.query}"</span>. Did you mean:
        <div className="mt-2 flex gap-2 flex-wrap">
          {msg.suggestions.map((s) => (
            <Button key={s} size="sm" variant="secondary" className="h-7 text-xs gap-1.5" onClick={() => onSendChip(`Start ${s}`)}>
              <GitBranch className="h-3 w-3" /> {s}
            </Button>
          ))}
        </div>
      </div>,
    );
  }
  if (msg.kind === 'ai-pipeline') {
    const run = runs.find((r) => r.id === msg.runId);
    if (!run) return wrap(<div className="text-sm text-muted-foreground">Pipeline starting…</div>);
    return wrap(<>
      <PipelineStatusCard run={run} onRerun={onRerun} />
      {(run.status === 'success' || run.status === 'failed') && (
        <div className="flex gap-2 flex-wrap pt-1">
          <span className="text-[11px] text-muted-foreground self-center">Next:</span>
          {run.web_url && (
            <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
              <a href={run.web_url} target="_blank" rel="noreferrer">View Report</a>
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => onRerun(run)}>
            <RotateCw className="h-3 w-3" /> Re-run
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onSendChip('Run Regression')}>Run Regression</Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onSendChip('Run Smoke')}>Run Smoke</Button>
        </div>
      )}
    </>);
  }
  if (msg.kind === 'ai-schedule-confirmed') {
    return wrap(
      <Card className="p-3 bg-card/70">
        <div className="text-sm">📅 Scheduled <span className="font-semibold">{msg.branch}</span> for <span className="font-mono">{format(new Date(msg.runAt), 'PPp')}</span>.</div>
        <div className="text-xs text-muted-foreground mt-1">I'll trigger it automatically and notify you here when it starts.</div>
      </Card>,
    );
  }
  return null;
};

export default GitLabChatPanel;
