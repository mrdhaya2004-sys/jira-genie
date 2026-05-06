import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Plus, Brain, MoreVertical, Pencil, Trash2, Sparkles, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import type { Workspace } from '@/types/workspace';

interface WorkspaceListProps {
  workspaces: Workspace[];
  isLoading: boolean;
  onSelectWorkspace: (workspace: Workspace) => void;
  onCreateWorkspace: () => void;
  onEditWorkspace: (workspace: Workspace) => void;
  onDeleteWorkspace: (workspace: Workspace) => void;
}

// Rotating accent palette for visual variety using semantic tokens.
const ACCENTS = [
  'from-primary/20 via-primary/5 to-transparent',
  'from-[hsl(var(--chart-2))]/25 via-[hsl(var(--chart-2))]/5 to-transparent',
  'from-success/20 via-success/5 to-transparent',
  'from-warning/20 via-warning/5 to-transparent',
  'from-[hsl(var(--chart-1))]/25 via-[hsl(var(--chart-1))]/5 to-transparent',
];

const ICON_ACCENTS = [
  'bg-gradient-to-br from-primary to-[hsl(var(--chart-2))] text-primary-foreground',
  'bg-gradient-to-br from-[hsl(var(--chart-2))] to-primary text-primary-foreground',
  'bg-gradient-to-br from-success to-[hsl(var(--chart-1))] text-success-foreground',
  'bg-gradient-to-br from-warning to-[hsl(var(--chart-1))] text-warning-foreground',
  'bg-gradient-to-br from-[hsl(var(--chart-1))] to-primary text-primary-foreground',
];

const WorkspaceList: React.FC<WorkspaceListProps> = ({
  workspaces,
  isLoading,
  onSelectWorkspace,
  onCreateWorkspace,
  onEditWorkspace,
  onDeleteWorkspace,
}) => {
  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-primary/10 via-card to-[hsl(var(--chart-2))]/10 dark:from-primary/15 dark:via-card dark:to-[hsl(var(--chart-2))]/15 p-6 mb-8 shadow-sm">
          <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-[hsl(var(--chart-2))]/10 blur-3xl pointer-events-none" />
          <div className="relative flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-[hsl(var(--chart-2))] flex items-center justify-center shadow-lg shadow-primary/30">
                <Brain className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  Hive AI — Core Workspaces
                  <Sparkles className="h-4 w-4 text-primary" />
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Train your Agentic AI with stories, builds and DOM context.
                </p>
              </div>
            </div>
            <Button
              onClick={onCreateWorkspace}
              size="lg"
              className="gap-2 shadow-md shadow-primary/30 bg-gradient-to-r from-primary to-[hsl(var(--chart-2))] hover:opacity-90 text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              New Workspace
            </Button>
          </div>
        </div>

        {/* Workspace Cards */}
        <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((workspace, idx) => {
            const accent = ACCENTS[idx % ACCENTS.length];
            const iconAccent = ICON_ACCENTS[idx % ICON_ACCENTS.length];
            return (
              <Card
                key={workspace.id}
                className="group relative cursor-pointer overflow-hidden border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/40"
                onClick={() => onSelectWorkspace(workspace)}
              >
                {/* Gradient wash */}
                <div className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none`} />
                {/* Top accent bar */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${iconAccent}`} />

                <CardContent className="relative p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`h-11 w-11 rounded-xl ${iconAccent} flex items-center justify-center shadow-md ring-1 ring-white/20`}>
                      <Brain className="h-5 w-5" />
                    </div>
                    <div className="flex items-center gap-1">
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-primary -translate-x-1 group-hover:translate-x-0 transition-all" />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditWorkspace(workspace); }}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); onDeleteWorkspace(workspace); }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <h3 className="font-semibold text-base text-foreground truncate group-hover:text-primary transition-colors">
                    {workspace.name}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Created {formatDistanceToNow(new Date(workspace.created_at), { addSuffix: true })}
                  </p>
                  {workspace.description && (
                    <p className="text-sm text-muted-foreground mt-3 line-clamp-2 leading-relaxed">
                      {workspace.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Add new card */}
          <Card
            onClick={onCreateWorkspace}
            className="group cursor-pointer border-2 border-dashed border-border hover:border-primary/60 bg-transparent hover:bg-primary/5 transition-all flex items-center justify-center min-h-[160px]"
          >
            <div className="text-center p-6">
              <div className="mx-auto h-11 w-11 rounded-xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center mb-2 transition-colors">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">New Workspace</p>
              <p className="text-xs text-muted-foreground mt-0.5">Add another project context</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceList;
