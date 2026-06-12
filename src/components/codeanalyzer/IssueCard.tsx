import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Copy, Check, AlertTriangle, Lightbulb, BookOpen, ChevronDown, Maximize2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CodeIssue, Severity } from '@/types/codeAnalyzer';

const sevStyle: Record<Severity, string> = {
  critical: 'bg-rose-500/10 text-rose-600 border-rose-500/40 dark:text-rose-400',
  high:     'bg-orange-500/10 text-orange-600 border-orange-500/40 dark:text-orange-400',
  medium:   'bg-amber-500/10 text-amber-600 border-amber-500/40 dark:text-amber-400',
  low:      'bg-sky-500/10 text-sky-600 border-sky-500/40 dark:text-sky-400',
};

const confidenceTone = (n: number) =>
  n >= 85 ? 'text-emerald-600 border-emerald-500/40 bg-emerald-500/10'
  : n >= 70 ? 'text-amber-600 border-amber-500/40 bg-amber-500/10'
  : 'text-rose-600 border-rose-500/40 bg-rose-500/10';

const CodePane: React.FC<{ code: string; label: string; tone: 'problem' | 'fix'; onExpand?: () => void }> = ({ code, label, tone, onExpand }) => {
  const [copied, setCopied] = useState(false);
  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <div className="group relative">
      <div className={cn('flex items-center justify-between px-3 py-1.5 text-[10.5px] uppercase tracking-wider rounded-t-xl border border-b-0',
        tone === 'problem' ? 'text-rose-600 border-rose-500/30 bg-rose-500/5' : 'text-emerald-600 border-emerald-500/30 bg-emerald-500/5')}>
        <span className="font-medium">{label}</span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onExpand && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onExpand(); }}>
              <Maximize2 className="h-3 w-3" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copy}>
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </Button>
        </div>
      </div>
      <pre className={cn('hca-code rounded-t-none', tone === 'problem' ? 'hca-code-problem' : 'hca-code-fix')}>
        <code>{code || '—'}</code>
      </pre>
    </div>
  );
};

interface Props { issue: CodeIssue }

const IssueCard: React.FC<Props> = ({ issue }) => {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<null | { code: string; label: string }>(null);
  const conf = typeof issue.confidence === 'number' ? Math.round(issue.confidence) : null;

  return (
    <>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="hca-glass hca-glass-hover hca-rise overflow-hidden">
          <CollapsibleTrigger asChild>
            <button type="button" className="w-full text-left p-4 flex items-start gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 rounded-2xl">
              <div className={cn('h-8 w-8 rounded-xl border flex items-center justify-center shrink-0', sevStyle[issue.severity])}>
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <Badge className={cn('border rounded-full px-2.5 text-[10px]', sevStyle[issue.severity])}>{issue.severity.toUpperCase()}</Badge>
                  {issue.line ? <span className="hca-chip">Line {issue.line}{issue.endLine ? `–${issue.endLine}` : ''}</span> : null}
                  {issue.type && <span className="hca-chip text-muted-foreground">{issue.type}</span>}
                  {conf !== null && (
                    <span className={cn('hca-chip border', confidenceTone(conf))}>{conf}% confidence</span>
                  )}
                </div>
                <h4 className="text-sm font-semibold leading-tight">{issue.title}</h4>
                {issue.problem && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{issue.problem}</p>}
              </div>
              <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform shrink-0 mt-1', open && 'rotate-180')} />
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
            <div className="px-4 pb-4 space-y-4 border-t border-border/40 pt-4">
              {issue.evidence && issue.evidence.trim() && issue.evidence.trim() !== (issue.codeBefore || '').trim() && (
                <div className="rounded-xl border border-border/50 bg-muted/40 px-3 py-2 text-xs font-mono overflow-x-auto">
                  <span className="text-[10px] font-sans uppercase tracking-wider text-muted-foreground mr-2">Evidence</span>
                  <code>{issue.evidence}</code>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-0.5">Problem</div>
                    <p className="leading-snug">{issue.problem || '—'}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Lightbulb className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-0.5">Suggested Fix</div>
                    <p className={cn('leading-snug', !issue.suggestion && 'italic text-muted-foreground')}>{issue.suggestion || 'See the fixed snippet below.'}</p>
                  </div>
                </div>
              </div>

              {(issue.codeBefore || issue.codeAfter) && (
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-2 items-stretch">
                  <CodePane code={issue.codeBefore} label="Problem" tone="problem" onExpand={() => setExpanded({ code: issue.codeBefore, label: 'Problem' })} />
                  <div className="hidden md:flex items-center justify-center">
                    <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                  {issue.codeAfter
                    ? <CodePane code={issue.codeAfter} label="Suggested Fix" tone="fix" onExpand={() => setExpanded({ code: issue.codeAfter, label: 'Suggested Fix' })} />
                    : <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground flex items-center">
                        No significant optimization opportunity detected — the existing snippet already follows acceptable practices for the issue described.
                      </div>}
                </div>
              )}

              {issue.explanation && (
                <div className="text-xs text-muted-foreground bg-muted/30 rounded-xl p-3 border border-border/40">
                  <div className="font-medium text-foreground mb-1">Why it matters</div>
                  {issue.explanation}
                </div>
              )}
              {issue.bestPractice && (
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <BookOpen className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <span><span className="font-medium text-foreground">Best practice: </span>{issue.bestPractice}</span>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      <Dialog open={!!expanded} onOpenChange={(o) => !o && setExpanded(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>{expanded?.label}</DialogTitle></DialogHeader>
          <pre className="hca-code max-h-[70vh] overflow-auto"><code>{expanded?.code}</code></pre>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default IssueCard;
