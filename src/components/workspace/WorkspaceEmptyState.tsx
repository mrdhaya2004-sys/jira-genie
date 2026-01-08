import React from 'react';
import { Brain, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WorkspaceEmptyStateProps {
  onCreateWorkspace: () => void;
}

const WorkspaceEmptyState: React.FC<WorkspaceEmptyStateProps> = ({ onCreateWorkspace }) => {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <Brain className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground mb-3">
          No workspace found
        </h2>
        <p className="text-muted-foreground mb-6">
          Create a new workspace to start training your Agentic AI with user stories and application files.
        </p>
        <Button onClick={onCreateWorkspace} size="lg" className="gap-2">
          <Plus className="h-5 w-5" />
          Create New Workspace
        </Button>
      </div>
    </div>
  );
};

export default WorkspaceEmptyState;
