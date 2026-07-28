import React, { useRef, useState } from 'react';
import JSZip from 'jszip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FolderGit2, Upload, FileArchive, Github, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SAMPLE_PROJECTS, type DetectedProject } from './sampleProjects';
import { buildProjectFromFiles } from './projectParser';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (project: DetectedProject) => void;
}

// Binary/lockfile extensions to skip when reading a real project's contents
const BINARY_RE = /\.(png|jpg|jpeg|gif|webp|ico|svg|pdf|zip|jar|war|apk|ipa|aab|so|dll|exe|class|woff2?|ttf|eot|mp3|mp4|mov|bin|node|keystore)$/i;
const IGNORE_RE = /(^|\/)(node_modules|\.git|\.idea|\.gradle|build|dist|target|coverage|\.venv|__pycache__)(\/|$)/;
const LOCKFILES = new Set(['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb']);

async function readZipToFiles(zip: JSZip): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  // If everything is under a single top-level folder (GitHub zipballs are), strip it
  const topLevel = new Set<string>();
  zip.forEach((relPath) => {
    const first = relPath.split('/')[0];
    if (first) topLevel.add(first);
  });
  const strip = topLevel.size === 1 ? [...topLevel][0] + '/' : '';
  const entries: JSZip.JSZipObject[] = [];
  zip.forEach((_p, f) => { if (!f.dir) entries.push(f); });
  for (const file of entries) {
    let path = file.name;
    if (strip && path.startsWith(strip)) path = path.slice(strip.length);
    if (!path || IGNORE_RE.test(path)) continue;
    const base = path.split('/').pop() || '';
    if (LOCKFILES.has(base) || BINARY_RE.test(path)) continue;
    try {
      const text = await file.async('string');
      out.set(path, text);
    } catch { /* skip unreadable */ }
    if (out.size >= 1500) break;
  }
  return out;
}

const StudioImportDialog: React.FC<Props> = ({ open, onOpenChange, onImport }) => {
  const [tab, setTab] = useState<'sample' | 'upload' | 'git'>('sample');
  const [selected, setSelected] = useState<string>(SAMPLE_PROJECTS[0].id);
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [gitUrl, setGitUrl] = useState('');
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const steps = [
    'Reading project archive…',
    'Detecting build tool & language…',
    'Parsing pom.xml / build.gradle / package.json…',
    'Identifying framework & test runner…',
    'Scanning dependencies for updates…',
    'Import complete',
  ];

  const advanceSteps = () => {
    setScanStep(0);
    let i = 0;
    return new Promise<void>((resolve) => {
      const t = setInterval(() => {
        i++;
        setScanStep(i);
        if (i >= steps.length - 1) { clearInterval(t); resolve(); }
      }, 320);
    });
  };

  const finish = async (project: DetectedProject) => {
    await advanceSteps();
    setTimeout(() => {
      onImport(project);
      setScanning(false);
      setScanStep(0);
      setZipFile(null);
      setGitUrl('');
      onOpenChange(false);
    }, 350);
  };

  const runSample = async () => {
    setError(null);
    setScanning(true);
    const proj = SAMPLE_PROJECTS.find(p => p.id === selected)!;
    await finish(proj);
  };

  const runUpload = async () => {
    if (!zipFile) { setError('Choose a .zip file to import.'); return; }
    setError(null);
    setScanning(true);
    try {
      const zip = await JSZip.loadAsync(await zipFile.arrayBuffer());
      const files = await readZipToFiles(zip);
      if (files.size === 0) throw new Error('No readable source files found in this archive.');
      const name = zipFile.name.replace(/\.zip$/i, '');
      const project = buildProjectFromFiles(name, files);
      await finish(project);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse zip.');
      setScanning(false);
      setScanStep(0);
    }
  };

  const runGitClone = async () => {
    if (!gitUrl.trim()) { setError('Enter a GitHub URL or owner/repo.'); return; }
    setError(null);
    setScanning(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('studio-git-fetch', {
        body: { url: gitUrl.trim() },
      });
      if (fnErr) throw new Error(fnErr.message || 'Fetch failed.');
      if (!data?.zipBase64) throw new Error(data?.error || 'No archive returned.');
      // Decode base64 → Uint8Array
      const bin = atob(data.zipBase64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const zip = await JSZip.loadAsync(bytes);
      const files = await readZipToFiles(zip);
      if (files.size === 0) throw new Error('Cloned repository is empty or unreadable.');
      const project = buildProjectFromFiles(`${data.owner}/${data.repo}`, files);
      toast.success(`Cloned ${data.owner}/${data.repo}`);
      await finish(project);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Git clone failed.');
      setScanning(false);
      setScanStep(0);
    }
  };

  const primary = () => {
    if (tab === 'upload') return runUpload();
    if (tab === 'git') return runGitClone();
    return runSample();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!scanning) onOpenChange(v); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FolderGit2 className="h-5 w-5 text-primary" /> Import Automation Project</DialogTitle>
          <DialogDescription>
            Upload a .zip, clone a GitHub repo, or pick a sample framework. TestZone Studio will detect the language, build tool, framework, and missing SDKs.
          </DialogDescription>
        </DialogHeader>

        {!scanning ? (
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="sample"><FileArchive className="h-3.5 w-3.5 mr-1.5" /> Samples</TabsTrigger>
              <TabsTrigger value="upload"><Upload className="h-3.5 w-3.5 mr-1.5" /> Upload .zip</TabsTrigger>
              <TabsTrigger value="git"><Github className="h-3.5 w-3.5 mr-1.5" /> GitHub</TabsTrigger>
            </TabsList>

            <TabsContent value="sample" className="mt-3">
              <div className="space-y-2">
                {SAMPLE_PROJECTS.map(p => (
                  <Card
                    key={p.id}
                    onClick={() => setSelected(p.id)}
                    className={cn(
                      'p-3 cursor-pointer transition-all border',
                      selected === p.id ? 'border-primary bg-primary/10' : 'border-white/10 hover:border-white/20'
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{p.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{p.framework} • {p.buildTool} • {p.platform}</div>
                      </div>
                      <div className="flex gap-1 shrink-0 flex-wrap justify-end">
                        <Badge variant="secondary" className="text-[10px]">{p.language}</Badge>
                        <Badge variant="outline" className="text-[10px]">{p.projectType}</Badge>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="upload" className="mt-3 space-y-3">
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f && f.name.toLowerCase().endsWith('.zip')) setZipFile(f);
                  else setError('Only .zip archives are supported.');
                }}
                className="rounded-xl border-2 border-dashed border-white/15 hover:border-primary/60 bg-white/5 p-8 text-center cursor-pointer transition-colors"
              >
                <Upload className="h-8 w-8 text-primary mx-auto mb-2" />
                <div className="text-sm font-medium">{zipFile ? zipFile.name : 'Click or drop a .zip file here'}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {zipFile
                    ? `${(zipFile.size / 1024 / 1024).toFixed(1)} MB — parsed locally in your browser`
                    : 'Any Maven, Gradle, Node, Python, or Robot project'}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".zip,application/zip"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) { setZipFile(f); setError(null); } }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Files never leave your browser — parsing runs client-side. `node_modules`, `.git`, build outputs, and binaries are skipped automatically.
              </p>
            </TabsContent>

            <TabsContent value="git" className="mt-3 space-y-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
                <label className="text-xs font-medium text-muted-foreground">GitHub repository</label>
                <Input
                  value={gitUrl}
                  onChange={(e) => setGitUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo  or  owner/repo"
                  className="bg-black/40 border-white/10"
                />
                <p className="text-[11px] text-muted-foreground">
                  Public repos clone instantly. For private repos, connect GitHub in Settings first.
                </p>
              </div>
            </TabsContent>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-200">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </Tabs>
        ) : (
          <div className="py-4 space-y-2">
            {steps.map((s, idx) => (
              <div key={s} className={cn('flex items-center gap-2 text-sm', idx > scanStep && 'opacity-40')}>
                {idx < scanStep ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : idx === scanStep ? (
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                ) : (
                  <div className="h-4 w-4 rounded-full border border-muted-foreground/30" />
                )}
                <span>{s}</span>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={scanning}>Cancel</Button>
          <Button onClick={primary} disabled={scanning}>
            {scanning ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Analyzing…</> : 'Import & Analyze'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StudioImportDialog;
