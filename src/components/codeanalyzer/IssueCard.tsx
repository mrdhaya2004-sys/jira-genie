import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Check, AlertTriangle, Lightbulb, BookOpen, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CodeIssue, Severity } from '@/types/codeAnalyzer';

const sevStyle: Record<Severity, string> = {
  critical: 'bg-rose-500/15 text-rose-600 border-rose-500/40',
  high: 'bg-orange-500/15 text-orange-600 border-orange-500/40',
  medium: 'bg-amber-500/15 text-amber-600 border-amber-500/40',
  low: 'bg-sky-500/15 text-sky-600 border-sky-500/40',
};

const CodeBlock: React.FC<{ code: string; label: string; tone: 'before' | 'after' }> = ({ code, label, tone }) => {
  const [copied, setCopied] = React.useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className={cn(
      'rounded-lg border overflow-hidden',
      tone === 'before' ? 'border-rose-500/30 bg-rose-500/5' : 'border-emerald-500/30 bg-emerald-500/5'
    )}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-inherit text-[11px] font-medium uppercase tracking-wide">
        <span className={tone === 'before' ? 'text-rose-600' : 'text-emerald-600'}>{label}</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copy}>
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
      <pre className="p-3 text-xs font-mono overflow-x-auto whitespace-pre"><code>{code || '—'}</code></pre>
    </div>
  );
};

interface Props { issue: CodeIssue }

const IssueCard: React.FC<Props> = ({ issue }) => (
  <Card className="border-border/60">
    <CardContent className="p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={cn('border', sevStyle[issue.severity])}>{issue.severity.toUpperCase()}</Badge>
        {issue.line ? <Badge variant="outline">Line {issue.line}{issue.endLine ? `-${issue.endLine}` : ''}</Badge> : null}
        {issue.type && <Badge variant="secondary">{issue.type}</Badge>}
        {typeof issue.confidence === 'number' && (
          <Badge variant="outline" className="border-primary/40 text-primary">Confidence {Math.round(issue.confidence)}%</Badge>
        )}
      </div>
      <h4 className="font-semibold text-sm">{issue.title}</h4>
      {issue.evidence && issue.evidence.trim() && issue.evidence.trim() !== (issue.codeBefore || '').trim() && (
        <div className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs font-mono overflow-x-auto">
          <span className="text-[10px] font-sans uppercase tracking-wide text-muted-foreground mr-2">Evidence</span>
          <code>{issue.evidence}</code>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div className="flex gap-2"><AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" /><div><div className="text-xs font-medium text-muted-foreground mb-0.5">Problem</div><p>{issue.problem || '—'}</p></div></div>
        <div className="flex gap-2"><Lightbulb className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" /><div><div className="text-xs font-medium text-muted-foreground mb-0.5">Suggested Fix</div><p className={cn(!issue.suggestion && 'italic text-muted-foreground')}>{issue.suggestion || 'AI did not provide a distinct fix description — see codeAfter for the actual change.'}</p></div></div>
      </div>
      {(issue.codeBefore || issue.codeAfter) && (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-2 items-center">
          <CodeBlock code={issue.codeBefore} label="Before" tone="before" />
          <ArrowRight className="h-4 w-4 text-muted-foreground hidden md:block mx-auto" />
          {issue.codeAfter
            ? <CodeBlock code={issue.codeAfter} label="After" tone="after" />
            : <div className="rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-300">AI did not produce a distinct fixed snippet. Switch to a stronger model (Gemini 2.5 Pro, GPT-5, Claude Sonnet) for an improved version.</div>}
        </div>
      )}
      {issue.explanation && (
        <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
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
    </CardContent>
  </Card>
);

export default IssueCard;
