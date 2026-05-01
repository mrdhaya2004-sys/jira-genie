import React, { useState } from 'react';
import { ArrowLeft, Upload, FileText, Smartphone, Trash2, FolderOpen, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useWorkspaceFiles } from '@/hooks/useWorkspaces';
import WorkspaceEnvironmentsPanel from './WorkspaceEnvironmentsPanel';
import { EnvironmentBadge } from './EnvironmentSelector';
import type { Workspace } from '@/types/workspace';
import type { Environment } from '@/types/environment';

interface WorkspaceDetailProps {
  workspace: Workspace;
  onBack: () => void;
}

const WorkspaceDetail: React.FC<WorkspaceDetailProps> = ({ workspace, onBack }) => {
  const { files, isLoading: filesLoading, uploadFile, deleteFile } = useWorkspaceFiles(workspace.id);
  const [activeTab, setActiveTab] = useState('files');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fileType: 'user_story' | 'apk' | 'ipa') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (fileType === 'apk' && !file.name.endsWith('.apk')) {
      alert('Please upload a valid APK file');
      return;
    }
    if (fileType === 'ipa' && !file.name.endsWith('.ipa')) {
      alert('Please upload a valid IPA file');
      return;
    }

    await uploadFile(file, fileType);
    e.target.value = '';
  };

  const userStories = files.filter(f => f.file_type === 'user_story');
  const appFiles = files.filter(f => f.file_type === 'apk' || f.file_type === 'ipa');

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3 sm:p-4 border-b bg-background">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9 shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base sm:text-xl font-semibold truncate">{workspace.name}</h1>
          {workspace.description && (
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{workspace.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {workspace.default_environment && (
            <EnvironmentBadge env={workspace.default_environment as Environment} />
          )}
          <Badge variant="outline" className="gap-1 text-[11px] sm:text-xs">
            <FileText className="h-3 w-3" />
            {userStories.length} Stories
          </Badge>
          <Badge variant="outline" className="gap-1 text-[11px] sm:text-xs">
            <Smartphone className="h-3 w-3" />
            {appFiles.length} Apps
          </Badge>
        </div>
      </div>

      {/* Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden min-h-0">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-3 sm:px-4 h-12 shrink-0">
          <TabsTrigger value="files" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
            Files & Stories
          </TabsTrigger>
          <TabsTrigger value="environments" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none gap-1.5">
            <Layers className="h-3.5 w-3.5" /> Environments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="flex-1 overflow-auto p-3 sm:p-4 mt-0 bg-muted/20 data-[state=inactive]:hidden">
          {files.length === 0 && !filesLoading ? (
            <div className="min-h-full flex items-center justify-center py-8">
              <div className="text-center max-w-md mx-auto">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <FolderOpen className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No files or stories yet</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Upload user stories or application files (APK / IPA) to organize your project context.
                </p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <Button asChild variant="outline" size="sm" className="gap-2">
                    <label htmlFor="story-upload" className="cursor-pointer">
                      <Upload className="h-4 w-4" />
                      Upload Story
                    </label>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="gap-2">
                    <label htmlFor="apk-upload" className="cursor-pointer">
                      <Upload className="h-4 w-4" />
                      Upload APK
                    </label>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="gap-2">
                    <label htmlFor="ipa-upload" className="cursor-pointer">
                      <Upload className="h-4 w-4" />
                      Upload IPA
                    </label>
                  </Button>
                </div>
                <input type="file" id="story-upload" className="hidden" accept=".txt,.doc,.docx,.pdf" onChange={(e) => handleFileUpload(e, 'user_story')} />
                <input type="file" id="apk-upload" className="hidden" accept=".apk" onChange={(e) => handleFileUpload(e, 'apk')} />
                <input type="file" id="ipa-upload" className="hidden" accept=".ipa" onChange={(e) => handleFileUpload(e, 'ipa')} />
              </div>
            </div>
          ) : (
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 min-h-full content-start">
            {/* User Stories */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  User Stories
                </CardTitle>
                <CardDescription>
                  Upload user stories that describe your application requirements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    id="story-upload"
                    className="hidden"
                    accept=".txt,.doc,.docx,.pdf"
                    onChange={(e) => handleFileUpload(e, 'user_story')}
                  />
                  <Button asChild variant="outline" className="gap-2">
                    <label htmlFor="story-upload" className="cursor-pointer">
                      <Upload className="h-4 w-4" />
                      Upload Story
                    </label>
                  </Button>
                </div>
                <div className="space-y-2">
                  {userStories.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No user stories uploaded yet
                    </p>
                  ) : (
                    userStories.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm truncate">{file.file_name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={() => deleteFile(file.id, file.file_url)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Application Files */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Application Files
                </CardTitle>
                <CardDescription>
                  Upload APK or IPA files to associate builds with this workspace
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="file"
                    id="apk-upload"
                    className="hidden"
                    accept=".apk"
                    onChange={(e) => handleFileUpload(e, 'apk')}
                  />
                  <Button asChild variant="outline" className="gap-2">
                    <label htmlFor="apk-upload" className="cursor-pointer">
                      <Upload className="h-4 w-4" />
                      Upload APK
                    </label>
                  </Button>
                  <input
                    type="file"
                    id="ipa-upload"
                    className="hidden"
                    accept=".ipa"
                    onChange={(e) => handleFileUpload(e, 'ipa')}
                  />
                  <Button asChild variant="outline" className="gap-2">
                    <label htmlFor="ipa-upload" className="cursor-pointer">
                      <Upload className="h-4 w-4" />
                      Upload IPA
                    </label>
                  </Button>
                </div>
                <div className="space-y-2">
                  {appFiles.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No application files uploaded yet
                    </p>
                  ) : (
                    appFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Smartphone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm truncate">{file.file_name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {file.file_type.toUpperCase()}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={() => deleteFile(file.id, file.file_url)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          )}
        </TabsContent>

        <TabsContent value="environments" className="flex-1 overflow-auto p-3 sm:p-4 mt-0 bg-muted/20 data-[state=inactive]:hidden">
          <WorkspaceEnvironmentsPanel
            workspace={workspace}
            files={files}
            onUploadBuild={async (file, platform, environment) => {
              const fileType = platform === 'android' ? 'apk' : 'ipa';
              await uploadFile(file, fileType, { environment, platform });
            }}
            onDeleteFile={deleteFile}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WorkspaceDetail;
