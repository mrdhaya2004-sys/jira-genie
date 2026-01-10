import React from 'react';
import { TicketData, IssueType, Priority } from '@/types/ticket';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bug, 
  CheckSquare, 
  BookOpen, 
  AlertTriangle, 
  Rocket,
  User, 
  Calendar, 
  Layers, 
  Paperclip,
  Check,
  X,
  Pencil,
  FileText,
  Target,
  ClipboardCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface TicketPreviewProps {
  ticket: Partial<TicketData>;
  onConfirm: () => void;
  onCancel: () => void;
  onEdit?: () => void;
}

const issueTypeConfig: Record<IssueType, { icon: any; color: string }> = {
  Bug: { icon: Bug, color: 'text-status-bug' },
  Task: { icon: CheckSquare, color: 'text-status-task' },
  Story: { icon: BookOpen, color: 'text-status-story' },
  Epic: { icon: Rocket, color: 'text-primary' },
  Incident: { icon: AlertTriangle, color: 'text-status-incident' },
};

const priorityConfig: Record<Priority, { color: string; bgColor: string }> = {
  Critical: { color: 'text-priority-critical', bgColor: 'bg-priority-critical/10' },
  High: { color: 'text-priority-high', bgColor: 'bg-priority-high/10' },
  Medium: { color: 'text-priority-medium', bgColor: 'bg-priority-medium/10' },
  Low: { color: 'text-priority-low', bgColor: 'bg-priority-low/10' },
};

const TicketPreview: React.FC<TicketPreviewProps> = ({ ticket, onConfirm, onCancel, onEdit }) => {
  const issueTypeKey = ticket.issueType as IssueType | undefined;
  const issueConfig = issueTypeKey && issueTypeConfig[issueTypeKey] ? issueTypeConfig[issueTypeKey] : null;
  const IssueIcon = issueConfig?.icon ?? CheckSquare;
  const issueColor = issueConfig?.color ?? 'text-muted-foreground';
  
  const priorityKey = ticket.priority as Priority | undefined;
  const priority = priorityKey && priorityConfig[priorityKey] ? priorityConfig[priorityKey] : priorityConfig.Medium;

  return (
    <Card className="w-full max-w-lg mt-2 shadow-soft-lg border-border/50 animate-slide-in-up">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <IssueIcon className={cn("h-5 w-5", issueColor)} />
            <Badge variant="outline" className="text-xs font-mono">
              {ticket.projectKey}-????
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {ticket.issueType || 'Unknown Type'}
            </Badge>
          </div>
          <Badge 
            variant="secondary" 
            className={cn("text-xs", priority.color, priority.bgColor)}
          >
            {ticket.priority || 'Medium'}
          </Badge>
        </div>
        <CardTitle className="text-base font-semibold mt-2 leading-tight">
          {ticket.summary || 'Untitled Ticket'}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4 text-sm">
        {/* Procedure/Steps */}
        {ticket.description && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground font-medium">
              <FileText className="h-4 w-4" />
              <span>Procedure / Steps</span>
            </div>
            <p className="text-foreground pl-6 whitespace-pre-wrap">
              {ticket.description}
            </p>
          </div>
        )}

        {/* Actual Result */}
        {ticket.actualResult && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground font-medium">
              <AlertTriangle className="h-4 w-4" />
              <span>Actual Result</span>
            </div>
            <p className="text-foreground pl-6 whitespace-pre-wrap">
              {ticket.actualResult}
            </p>
          </div>
        )}

        {/* Expected Result */}
        {ticket.expectedResult && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground font-medium">
              <Target className="h-4 w-4" />
              <span>Expected Result</span>
            </div>
            <p className="text-foreground pl-6 whitespace-pre-wrap">
              {ticket.expectedResult}
            </p>
          </div>
        )}

        <Separator className="my-3" />
        
        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-3">
          {ticket.module && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Layers className="h-4 w-4" />
              <div>
                <span className="text-xs block">Module</span>
                <span className="text-foreground text-sm">{ticket.module}</span>
              </div>
            </div>
          )}
          {ticket.sprint && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <div>
                <span className="text-xs block">Sprint</span>
                <span className="text-foreground text-sm">{ticket.sprint}</span>
              </div>
            </div>
          )}
          {ticket.assignee && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <div>
                <span className="text-xs block">Assignee</span>
                <span className="text-foreground text-sm">
                  {ticket.assignee === 'auto' ? 'Auto-assign' : ticket.assignee.includes('@') ? ticket.assignee.split('@')[0] : ticket.assignee}
                </span>
              </div>
            </div>
          )}
          {ticket.attachments && ticket.attachments.length > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Paperclip className="h-4 w-4" />
              <div>
                <span className="text-xs block">Attachments</span>
                <span className="text-foreground text-sm">{ticket.attachments.length} file(s)</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex gap-2 pt-4 border-t border-border">
        <Button 
          variant="outline" 
          size="sm"
          onClick={onCancel}
        >
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
        {onEdit && (
          <Button 
            variant="outline"
            size="sm"
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
        )}
        <Button 
          className="flex-1"
          onClick={onConfirm}
        >
          <Check className="h-4 w-4 mr-2" />
          Create Ticket
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TicketPreview;
