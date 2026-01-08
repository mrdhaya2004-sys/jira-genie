-- Create workspaces table
CREATE TABLE public.workspaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on workspaces
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- RLS policies for workspaces
CREATE POLICY "Users can view their own workspaces" 
ON public.workspaces FOR SELECT 
USING (auth.uid() = owner_id);

CREATE POLICY "Users can create their own workspaces" 
ON public.workspaces FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own workspaces" 
ON public.workspaces FOR UPDATE 
USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own workspaces" 
ON public.workspaces FOR DELETE 
USING (auth.uid() = owner_id);

-- Trigger for updated_at
CREATE TRIGGER update_workspaces_updated_at
BEFORE UPDATE ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create workspace_files table for user stories, APK, IPA
CREATE TABLE public.workspace_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('user_story', 'apk', 'ipa')),
  file_url TEXT NOT NULL,
  file_size BIGINT,
  content_extracted TEXT,
  metadata JSONB DEFAULT '{}',
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on workspace_files
ALTER TABLE public.workspace_files ENABLE ROW LEVEL SECURITY;

-- RLS policies for workspace_files (based on workspace ownership)
CREATE POLICY "Users can view files in their workspaces" 
ON public.workspace_files FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.workspaces 
    WHERE workspaces.id = workspace_files.workspace_id 
    AND workspaces.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can upload files to their workspaces" 
ON public.workspace_files FOR INSERT 
WITH CHECK (
  auth.uid() = uploaded_by AND
  EXISTS (
    SELECT 1 FROM public.workspaces 
    WHERE workspaces.id = workspace_files.workspace_id 
    AND workspaces.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can delete files in their workspaces" 
ON public.workspace_files FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.workspaces 
    WHERE workspaces.id = workspace_files.workspace_id 
    AND workspaces.owner_id = auth.uid()
  )
);

-- Create workspace_chat_messages for AI conversations
CREATE TABLE public.workspace_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on workspace_chat_messages
ALTER TABLE public.workspace_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for workspace_chat_messages
CREATE POLICY "Users can view chat messages in their workspaces" 
ON public.workspace_chat_messages FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.workspaces 
    WHERE workspaces.id = workspace_chat_messages.workspace_id 
    AND workspaces.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can create chat messages in their workspaces" 
ON public.workspace_chat_messages FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspaces 
    WHERE workspaces.id = workspace_chat_messages.workspace_id 
    AND workspaces.owner_id = auth.uid()
  )
);

-- Create storage bucket for workspace files
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('workspace-files', 'workspace-files', false, 524288000);

-- Storage policies for workspace-files bucket
CREATE POLICY "Users can upload to their workspace folders"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'workspace-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their workspace files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'workspace-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their workspace files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'workspace-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);