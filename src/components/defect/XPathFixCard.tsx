import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, ArrowRight, Wand2 } from 'lucide-react';
import type { XPathIssue } from '@/types/defectAnalyzer';

const XPathFixCard: React.FC<{ issue: XPathIssue; onRegenerate?: (issue: XPathIssue) => void }> = ({
  issue,
  onRegenerate,
}) => {
  const [copied, setCopied] = useState<'old' | 'new' | null>(null);

  const copy = async (text: string, which: 'old' | 'new') => {
    await navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <Card className="glass-card overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <Wand2 className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-semibold truncate">
              {issue.scenario || 'XPath issue detected'}
            </span>
          </div>
          {typeof issue.confidence === 'number' && (
            <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
              Confidence {issue.confidence}%
            </Badge>
          )}
        </div>

        <p className="text-xs text-muted-foreground">{issue.reason}</p>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-destructive">
                Old XPath
              </span>
              <Button variant="ghost" size="icon-sm" onClick={() => copy(issue.oldXpath, 'old')}>
                {copied === 'old' ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
            <pre className="text-[11px] bg-destructive/5 border border-destructive/20 rounded-lg p-2 overflow-x-auto font-mono whitespace-pre-wrap break-all">
              {issue.oldXpath}
            </pre>
          </div>

          {issue.proposedXpath && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-success">
                  Proposed XPath
                </span>
                <Button variant="ghost" size="icon-sm" onClick={() => copy(issue.proposedXpath!, 'new')}>
                  {copied === 'new' ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
              <pre className="text-[11px] bg-success/5 border border-success/20 rounded-lg p-2 overflow-x-auto font-mono whitespace-pre-wrap break-all">
                {issue.proposedXpath}
              </pre>
            </div>
          )}
        </div>

        {onRegenerate && (
          <div className="pt-1">
            <Button variant="glass" size="sm" onClick={() => onRegenerate(issue)} className="w-full sm:w-auto">
              <Wand2 className="h-3.5 w-3.5" />
              Regenerate with Hive Mind
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default XPathFixCard;
