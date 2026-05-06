import React from 'react';
import { Brain, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WorkspaceEmptyStateProps {
  onCreateWorkspace: () => void;
}

const WorkspaceEmptyState: React.FC<WorkspaceEmptyStateProps> = ({ onCreateWorkspace }) => {
  return (
    <div className="h-full flex items-center justify-center p-8 bg-gradient-to-br from-primary/5 via-background to-[hsl(var(--chart-2))]/5">
      <div className="relative text-center max-w-md">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-56 w-56 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="relative mx-auto w-24 h-24 mb-6">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary to-[hsl(var(--chart-2))] blur-xl opacity-50 animate-pulse" />
          <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-[hsl(var(--chart-2))] flex items-center justify-center shadow-xl shadow-primary/30 ring-1 ring-white/20">
            <Brain className="h-12 w-12 text-primary-foreground" />
          </div>
          <div className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-warning flex items-center justify-center shadow-md">
            <Sparkles className="h-4 w-4 text-warning-foreground" />
          </div>
        </div>
        <h2 className="relative text-3xl font-bold text-foreground mb-2 bg-gradient-to-r from-foreground to-primary bg-clip-text">
          Welcome to Hive AI
        </h2>
        <p className="relative text-muted-foreground mb-8 leading-relaxed">
          Create your first workspace to start training the Agentic AI with user stories, builds and DOM context.
        </p>
        <Button
          onClick={onCreateWorkspace}
          size="lg"
          className="relative gap-2 shadow-lg shadow-primary/30 bg-gradient-to-r from-primary to-[hsl(var(--chart-2))] hover:opacity-90 text-primary-foreground"
        >
          <Plus className="h-5 w-5" />
          Create New Workspace
        </Button>
      </div>
    </div>
  );
};

export default WorkspaceEmptyState;
