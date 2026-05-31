import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Upload, Smartphone, Trash2, Code2, Check, FileText, Star, AlertTriangle, Sparkles } from 'lucide-react';
import { ENVIRONMENTS, type Environment, type BuildPlatform, getEnvironmentMeta } from '@/types/environment';
import { EnvironmentBadge } from './EnvironmentSelector';
import { useWorkspaceEnvironment } from '@/hooks/useWorkspaceEnvironment';
import type { Workspace, WorkspaceFile } from '@/types/workspace';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface WorkspaceEnvironmentsPanelProps {
  workspace: Workspace;
  files: WorkspaceFile[];
  onUploadBuild: (file: File, platform: BuildPlatform, env: Environment) => Promise<void>;
  onDeleteFile: (fileId: string, fileUrl: string) => Promise<boolean | void>;
}

const WorkspaceEnvironmentsPanel: React.FC<WorkspaceEnvironmentsPanelProps> = ({
  workspace,
  files,
  onUploadBuild,
  onDeleteFile,
}) => {
  const { toast } = useToast();
  const env = useWorkspaceEnvironment(workspace.id, workspace.default_environment ?? null);
  const [activeTab, setActiveTab] = useState<Environment>(
    (env.activeEnv || (workspace.default_environment as Environment) || 'dev')
  );
  const [domDialog, setDomDialog] = useState<{ env: Environment; platform: BuildPlatform } | null>(null);
  const [domDraft, setDomDraft] = useState('');

  const buildsForEnv = (e: Environment) =>
    files.filter(f => (f.file_type === 'apk' || f.file_type === 'ipa') && f.environment === e);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, platform: BuildPlatform, environment: Environment) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const expectedExt = platform === 'android' ? '.apk' : '.ipa';
    if (!file.name.toLowerCase().endsWith(expectedExt)) {
      toast({ title: 'Invalid file', description: `Please upload a valid ${expectedExt} file`, variant: 'destructive' });
      e.target.value = '';
      return;
    }
    await onUploadBuild(file, platform, environment);
    e.target.value = '';
  };

  const openDomEditor = (e: Environment, p: BuildPlatform) => {
    const existing = env.getDomSnapshot(e, p);
    setDomDraft(existing?.dom_content || '');
    setDomDialog({ env: e, platform: p });
  };

  const saveDom = async () => {
    if (!domDialog) return;
    if (!domDraft.trim()) {
      toast({ title: 'Empty DOM', description: 'Paste page-source / DOM XML before saving', variant: 'destructive' });
      return;
    }
    await env.upsertDomSnapshot(domDialog.env, domDialog.platform, domDraft.trim());
    setDomDialog(null);
  };

  const setAsDefault = async (e: Environment) => {
    await env.setWorkspaceDefaultEnv(e);
    toast({ title: 'Default updated', description: `${getEnvironmentMeta(e)?.label} is now the workspace default.` });
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto w-full">
      <Card className="relative overflow-hidden border-primary/20 shadow-sm">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-[hsl(var(--chart-2))] to-success rounded-none" />
        <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <CardHeader className="relative pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-[hsl(var(--chart-2))] flex items-center justify-center shadow-md shadow-primary/30">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold">Environments</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Manage builds and DOM snapshots per environment. Modules will use the data from the selected environment.
          </CardDescription>
        </CardHeader>
        <CardContent className="relative">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Environment)}>
            <TabsList className="grid grid-cols-4 w-full h-auto p-1.5 bg-gradient-to-r from-primary/10 via-muted/40 to-[hsl(var(--chart-2))]/10 rounded-xl border border-border/60 gap-1">
              {ENVIRONMENTS.map(e => {
                const activeStyles: Record<string, string> = {
                  dev: 'data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-blue-500/30',
                  uat: 'data-[state=active]:bg-gradient-to-br data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-amber-500/30',
                  beta: 'data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-500 data-[state=active]:to-fuchsia-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-purple-500/30',
                  prod: 'data-[state=active]:bg-gradient-to-br data-[state=active]:from-emerald-500 data-[state=active]:to-green-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-emerald-500/30',
                };
                const dotColor: Record<string, string> = {
                  dev: 'bg-blue-500',
                  uat: 'bg-amber-500',
                  beta: 'bg-purple-500',
                  prod: 'bg-emerald-500',
                };
                return (
                  <TabsTrigger
                    key={e.value}
                    value={e.value}
                    className={cn(
                      'group relative flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-semibold rounded-lg py-2 px-2 transition-all duration-200 text-foreground/80 hover:text-foreground hover:bg-card/80 data-[state=active]:scale-[1.02]',
                      activeStyles[e.value]
                    )}
                  >
                    <span className={cn('h-2 w-2 rounded-full ring-2 ring-white/40 group-data-[state=active]:ring-white/70 group-data-[state=active]:animate-pulse', dotColor[e.value])} />
                    <span className="font-bold tracking-wide">{e.shortLabel}</span>
                    <span className="hidden md:inline opacity-80 font-normal">— {e.label.replace(e.shortLabel, '').trim() || e.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {ENVIRONMENTS.map(envMeta => {
              const builds = buildsForEnv(envMeta.value);
              const androidBuild = builds.find(b => b.platform === 'android' || b.file_type === 'apk');
              const iosBuild = builds.find(b => b.platform === 'ios' || b.file_type === 'ipa');
              const androidDom = env.getDomSnapshot(envMeta.value, 'android');
              const iosDom = env.getDomSnapshot(envMeta.value, 'ios');
              const isDefault = workspace.default_environment === envMeta.value;

              return (
                <TabsContent key={envMeta.value} value={envMeta.value} className="mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <EnvironmentBadge env={envMeta.value} />
                      <span className="text-sm font-medium">{envMeta.label}</span>
                      <span className="text-xs text-muted-foreground">— {envMeta.description}</span>
                    </div>
                    <Button
                      size="sm"
                      variant={isDefault ? 'secondary' : 'outline'}
                      onClick={() => setAsDefault(envMeta.value)}
                      disabled={isDefault}
                      className="gap-1.5"
                    >
                      <Star className={cn('h-3.5 w-3.5', isDefault && 'fill-current')} />
                      {isDefault ? 'Default' : 'Set as default'}
                    </Button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <PlatformCard
                      platform="android"
                      env={envMeta.value}
                      build={androidBuild}
                      dom={androidDom}
                      onUpload={handleUpload}
                      onDeleteBuild={onDeleteFile}
                      onEditDom={openDomEditor}
                      onDeleteDom={env.deleteDomSnapshot}
                    />
                    <PlatformCard
                      platform="ios"
                      env={envMeta.value}
                      build={iosBuild}
                      dom={iosDom}
                      onUpload={handleUpload}
                      onDeleteBuild={onDeleteFile}
                      onEditDom={openDomEditor}
                      onDeleteDom={env.deleteDomSnapshot}
                    />
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={!!domDialog} onOpenChange={(o) => !o && setDomDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              DOM Snapshot — {domDialog && getEnvironmentMeta(domDialog.env)?.label} / {domDialog?.platform === 'android' ? 'Android' : 'iOS'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Paste the page source / DOM XML. Modules will use this as the AI context for the selected environment.
              <span className="block mt-1 text-amber-600 dark:text-amber-400">
                Auto-extract from APK/IPA — coming soon.
              </span>
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={domDraft}
            onChange={(e) => setDomDraft(e.target.value)}
            placeholder="<hierarchy>...</hierarchy> or full page source XML"
            className="min-h-[280px] font-mono text-xs"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDomDialog(null)}>Cancel</Button>
            <Button onClick={saveDom}>
              <Check className="h-4 w-4 mr-1" /> Save DOM
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface PlatformCardProps {
  platform: BuildPlatform;
  env: Environment;
  build?: WorkspaceFile;
  dom?: { id: string; updated_at: string; dom_content: string };
  onUpload: (e: React.ChangeEvent<HTMLInputElement>, platform: BuildPlatform, env: Environment) => void;
  onDeleteBuild: (id: string, url: string) => any;
  onEditDom: (env: Environment, platform: BuildPlatform) => void;
  onDeleteDom: (id: string) => any;
}

const PlatformCard: React.FC<PlatformCardProps> = ({ platform, env, build, dom, onUpload, onDeleteBuild, onEditDom, onDeleteDom }) => {
  const inputId = `build-upload-${env}-${platform}`;
  const accept = platform === 'android' ? '.apk' : '.ipa';
  const label = platform === 'android' ? '🤖 Android (APK)' : '🍎 iOS (IPA)';

  return (
    <div className="rounded-lg border bg-card p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        {!build && (
          <Badge variant="outline" className="text-[10px] gap-1 text-amber-600 border-amber-500/40">
            <AlertTriangle className="h-3 w-3" /> No build
          </Badge>
        )}
      </div>

      {/* Build slot */}
      <div className="space-y-2">
        {build ? (
          <div className="flex items-center justify-between p-2 rounded bg-muted/50">
            <div className="flex items-center gap-2 min-w-0">
              <Smartphone className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs truncate">{build.file_name}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDeleteBuild(build.id, build.file_url)}>
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
        ) : (
          <>
            <input
              id={inputId}
              type="file"
              accept={accept}
              className="hidden"
              onChange={(e) => onUpload(e, platform, env)}
            />
            <Button asChild variant="outline" size="sm" className="w-full gap-2">
              <label htmlFor={inputId} className="cursor-pointer">
                <Upload className="h-3.5 w-3.5" />
                Upload {platform === 'android' ? 'APK' : 'IPA'}
              </label>
            </Button>
          </>
        )}
      </div>

      {/* DOM slot */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Code2 className="h-3 w-3" /> DOM Snapshot
          </span>
          {dom && (
            <Badge variant="secondary" className="text-[10px]">
              {dom.dom_content.length.toLocaleString()} chars
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => onEditDom(env, platform)}>
            <FileText className="h-3.5 w-3.5" />
            {dom ? 'Edit DOM' : 'Add DOM'}
          </Button>
          {dom && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDeleteDom(dom.id)}>
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkspaceEnvironmentsPanel;
