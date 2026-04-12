import React from 'react';
import { Brain, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WorkspaceEmptyStateProps {
  onCreateWorkspace: () => void;
}

const WorkspaceEmptyState: React.FC<WorkspaceEmptyStateProps> = ({ onCreateWorkspace }) => {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="relative mx-auto w-20 h-20 mb-6">
          <div className="absolute inset-0 rounded-2xl bg-primary/10 animate-pulse-dot" />
          <div className="relative w-20 h-20 rounded-2xl module-icon-gradient flex items-center justify-center">
            <Brain className="h-10 w-10 text-primary" />
          </div>
          <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          No workspace found
        </h2>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Create a new workspace to start training your Agentic AI with user stories and application files.
        </p>
        <Button onClick={onCreateWorkspace} size="lg" className="gap-2 shadow-md hover:shadow-lg transition-shadow">
          <Plus className="h-5 w-5" />
          Create New Workspace
        </Button>
      </div>
    </div>
  );
};

export default WorkspaceEmptyState;
