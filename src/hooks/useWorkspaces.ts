import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Workspace, WorkspaceFile } from '@/types/workspace';

export const useWorkspaces = () => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchWorkspaces = useCallback(async () => {
    if (!user) {
      setWorkspaces([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkspaces(data || []);
    } catch (error) {
      console.error('Error fetching workspaces:', error);
      toast({
        title: 'Error',
        description: 'Failed to load workspaces',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  const createWorkspace = useCallback(async (name: string, description?: string) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('workspaces')
        .insert({
          name,
          description: description || null,
          owner_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setWorkspaces(prev => [data, ...prev]);
      toast({
        title: 'Success',
        description: 'Workspace created successfully',
      });
      return data;
    } catch (error) {
      console.error('Error creating workspace:', error);
      toast({
        title: 'Error',
        description: 'Failed to create workspace',
        variant: 'destructive',
      });
      return null;
    }
  }, [user, toast]);

  const updateWorkspace = useCallback(async (id: string, name: string, description?: string) => {
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .update({ name, description: description || null })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setWorkspaces(prev => prev.map(w => w.id === id ? data : w));
      toast({
        title: 'Success',
        description: 'Workspace updated successfully',
      });
      return data;
    } catch (error) {
      console.error('Error updating workspace:', error);
      toast({
        title: 'Error',
        description: 'Failed to update workspace',
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  const deleteWorkspace = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setWorkspaces(prev => prev.filter(w => w.id !== id));
      toast({
        title: 'Success',
        description: 'Workspace deleted successfully',
      });
      return true;
    } catch (error) {
      console.error('Error deleting workspace:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete workspace',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  return {
    workspaces,
    isLoading,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    refetch: fetchWorkspaces,
  };
};

export const useWorkspaceFiles = (workspaceId: string | null) => {
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchFiles = useCallback(async () => {
    if (!workspaceId || !user) {
      setFiles([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('workspace_files')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles((data || []) as WorkspaceFile[]);
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, user]);

  const uploadFile = useCallback(async (
    file: File,
    fileType: 'user_story' | 'apk' | 'ipa'
  ) => {
    if (!workspaceId || !user) return null;

    try {
      // Upload to storage
      const filePath = `${user.id}/${workspaceId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('workspace-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('workspace-files')
        .getPublicUrl(filePath);

      // Extract content for user stories (text files)
      let contentExtracted: string | null = null;
      if (fileType === 'user_story' && file.type.includes('text')) {
        contentExtracted = await file.text();
      }

      // Create database record
      const { data, error } = await supabase
        .from('workspace_files')
        .insert({
          workspace_id: workspaceId,
          file_name: file.name,
          file_type: fileType,
          file_url: urlData.publicUrl,
          file_size: file.size,
          content_extracted: contentExtracted,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setFiles(prev => [data as WorkspaceFile, ...prev]);
      toast({
        title: 'Success',
        description: `${file.name} uploaded successfully`,
      });
      return data;
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload file',
        variant: 'destructive',
      });
      return null;
    }
  }, [workspaceId, user, toast]);

  const deleteFile = useCallback(async (fileId: string, fileUrl: string) => {
    try {
      // Extract path from URL for storage deletion
      const urlParts = fileUrl.split('/workspace-files/');
      if (urlParts.length > 1) {
        await supabase.storage
          .from('workspace-files')
          .remove([urlParts[1]]);
      }

      const { error } = await supabase
        .from('workspace_files')
        .delete()
        .eq('id', fileId);

      if (error) throw error;

      setFiles(prev => prev.filter(f => f.id !== fileId));
      toast({
        title: 'Success',
        description: 'File deleted successfully',
      });
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete file',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  return {
    files,
    isLoading,
    uploadFile,
    deleteFile,
    refetch: fetchFiles,
  };
};
