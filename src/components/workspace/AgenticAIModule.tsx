import React, { useState } from 'react';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import WorkspaceEmptyState from './WorkspaceEmptyState';
import WorkspaceList from './WorkspaceList';
import WorkspaceDetail from './WorkspaceDetail';
import CreateWorkspaceDialog from './CreateWorkspaceDialog';
import DeleteWorkspaceDialog from './DeleteWorkspaceDialog';
import type { Workspace } from '@/types/workspace';

const AgenticAIModule: React.FC = () => {
  const { workspaces, isLoading, createWorkspace, updateWorkspace, deleteWorkspace } = useWorkspaces();
  
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workspaceToEdit, setWorkspaceToEdit] = useState<Workspace | null>(null);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<Workspace | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateWorkspace = async (name: string, description?: string) => {
    setIsSubmitting(true);
    const result = await createWorkspace(name, description);
    setIsSubmitting(false);
    if (result) {
      setCreateDialogOpen(false);
      setSelectedWorkspace(result);
    }
  };

  const handleEditWorkspace = async (name: string, description?: string) => {
    if (!workspaceToEdit) return;
    setIsSubmitting(true);
    const result = await updateWorkspace(workspaceToEdit.id, name, description);
    setIsSubmitting(false);
    if (result) {
      setEditDialogOpen(false);
      setWorkspaceToEdit(null);
      if (selectedWorkspace?.id === result.id) {
        setSelectedWorkspace(result);
      }
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!workspaceToDelete) return;
    setIsSubmitting(true);
    const success = await deleteWorkspace(workspaceToDelete.id);
    setIsSubmitting(false);
    if (success) {
      setDeleteDialogOpen(false);
      setWorkspaceToDelete(null);
      if (selectedWorkspace?.id === workspaceToDelete.id) {
        setSelectedWorkspace(null);
      }
    }
  };

  const openEditDialog = (workspace: Workspace) => {
    setWorkspaceToEdit(workspace);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (workspace: Workspace) => {
    setWorkspaceToDelete(workspace);
    setDeleteDialogOpen(true);
  };

  // Show workspace detail if selected
  if (selectedWorkspace) {
    return (
      <WorkspaceDetail
        workspace={selectedWorkspace}
        onBack={() => setSelectedWorkspace(null)}
      />
    );
  }

  // Show empty state if no workspaces
  if (!isLoading && workspaces.length === 0) {
    return (
      <>
        <WorkspaceEmptyState onCreateWorkspace={() => setCreateDialogOpen(true)} />
        <CreateWorkspaceDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSubmit={handleCreateWorkspace}
          isLoading={isSubmitting}
        />
      </>
    );
  }

  // Show workspace list
  return (
    <>
      <WorkspaceList
        workspaces={workspaces}
        isLoading={isLoading}
        onSelectWorkspace={setSelectedWorkspace}
        onCreateWorkspace={() => setCreateDialogOpen(true)}
        onEditWorkspace={openEditDialog}
        onDeleteWorkspace={openDeleteDialog}
      />

      <CreateWorkspaceDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateWorkspace}
        isLoading={isSubmitting}
      />

      <CreateWorkspaceDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSubmit={handleEditWorkspace}
        isLoading={isSubmitting}
        editMode
        initialData={workspaceToEdit ? {
          name: workspaceToEdit.name,
          description: workspaceToEdit.description || undefined,
        } : undefined}
      />

      <DeleteWorkspaceDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        workspaceName={workspaceToDelete?.name || ''}
        onConfirm={handleDeleteWorkspace}
        isLoading={isSubmitting}
      />
    </>
  );
};

export default AgenticAIModule;
