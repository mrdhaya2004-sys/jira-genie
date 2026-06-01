import React from 'react';
import DOMPurify from 'dompurify';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, FileText } from 'lucide-react';
import HiveAIAvatar from '@/components/ai/HiveAIAvatar';
import { cn } from '@/lib/utils';
import DefectAnalysisDashboard from './DefectAnalysisDashboard';
import type { DefectChatMessage as ChatType, ExecutionOS, XPathIssue } from '@/types/defectAnalyzer';

interface Props {
  message: ChatType;
  onWorkspaceSelect?: (id: string, name: string) => void;
  onOsSelect?: (os: ExecutionOS) => void;
  onRegenerateXPath?: (issue: XPathIssue) => void;
}

const sanitize = (s: string) =>
  DOMPurify.sanitize(s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\n/g, '<br/>'), {
    ALLOWED_TAGS: ['strong', 'em', 'br', 'code'],
    ALLOWED_ATTR: [],
  });

const DefectChatMessage: React.FC<Props> = ({ message, onWorkspaceSelect, onOsSelect, onRegenerateXPath }) => {
  const isBot = message.role === 'assistant';

  return (
    <div className={cn('flex gap-3 max-w-5xl', isBot ? 'mr-auto' : 'ml-auto flex-row-reverse')}>
      <div className="relative flex-shrink-0">
        {isBot ? (
          <HiveAIAvatar size={32} />
        ) : (
          <Avatar className="relative h-8 w-8 ring-1 ring-border/60">
            <AvatarFallback className="bg-muted">
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        )}
      </div>

      <div className={cn('flex flex-col gap-2 min-w-0 flex-1', !isBot && 'items-end')}>
        {message.content && (
          <Card
            className={cn(
              'shadow-soft border-border/60 backdrop-blur-sm max-w-[90%]',
              isBot
                ? 'bg-card/80'
                : 'bg-gradient-to-br from-primary to-primary/85 text-primary-foreground border-primary/30 shadow-[0_0_20px_-8px_hsl(var(--primary)/0.5)]',
            )}
          >
            <CardContent className="p-3">
              <div
                className="text-sm prose prose-sm max-w-none [&_code]:text-xs [&_code]:bg-muted/40 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded"
                dangerouslySetInnerHTML={{ __html: sanitize(message.content) }}
              />
            </CardContent>
          </Card>
        )}

        {message.type === 'workspace_select' && message.options && onWorkspaceSelect && (
          <div className="flex flex-wrap gap-2 mt-1">
            {message.options.map((o) => (
              <Button key={o.id} variant="glass" size="sm" onClick={() => onWorkspaceSelect(o.id, o.label)}>
                📁 {o.label}
              </Button>
            ))}
          </div>
        )}

        {message.type === 'os_select' && message.options && onOsSelect && (
          <div className="flex flex-wrap gap-2 mt-1">
            {message.options.map((o) => (
              <Button
                key={o.id}
                variant="glass"
                size="sm"
                onClick={() => onOsSelect(o.value as ExecutionOS)}
                className="gap-2"
              >
                <span className="text-base">{o.icon}</span>
                <span>{o.label}</span>
              </Button>
            ))}
          </div>
        )}

        {message.type === 'report_uploaded' && message.reportSummary && (
          <div className="flex flex-wrap gap-1.5">
            {message.reportSummary.map((f, i) => (
              <Badge key={i} variant="outline" className="glass-effect gap-1 text-[11px]">
                <FileText className="h-3 w-3" />
                {f.name}
              </Badge>
            ))}
          </div>
        )}

        {message.type === 'analysis_result' && message.analysis && (
          <div className="w-full">
            <DefectAnalysisDashboard analysis={message.analysis} onRegenerateXPath={onRegenerateXPath} />
          </div>
        )}

        <span className="text-[10px] text-muted-foreground">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
};

export default DefectChatMessage;
