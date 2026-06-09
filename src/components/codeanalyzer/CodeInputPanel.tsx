import React, { useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, FileCode, Github, Play, X, Code2 } from 'lucide-react';
import { SUPPORTED_LANGUAGES, SUPPORTED_FRAMEWORKS } from '@/types/codeAnalyzer';
import type { AnalyzeInput } from '@/hooks/useCodeAnalyzer';

interface Props {
  onAnalyze: (input: AnalyzeInput) => void;
  isAnalyzing: boolean;
}

const MAX_FILES = 10;
const MAX_FILE_BYTES = 2 * 1024 * 1024;

const CodeInputPanel: React.FC<Props> = ({ onAnalyze, isAnalyzing }) => {
  const [tab, setTab] = useState<'snippet' | 'files' | 'github' | 'gitlab'>('snippet');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState<string>('Java');
  const [framework, setFramework] = useState<string>('Auto-detect');
  const [files, setFiles] = useState<{ path: string; content: string }[]>([]);
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('');
  const [token, setToken] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (list: FileList | null) => {
    if (!list) return;
    const next: { path: string; content: string }[] = [];
    for (const f of Array.from(list).slice(0, MAX_FILES)) {
      if (f.size > MAX_FILE_BYTES) continue;
      const content = await f.text();
      next.push({ path: f.name, content });
    }
    setFiles((prev) => [...prev, ...next].slice(0, MAX_FILES));
  };

  const submit = () => {
    const fw = framework === 'Auto-detect' ? undefined : framework;
    if (tab === 'snippet') {
      if (!code.trim()) return;
      onAnalyze({ sourceType: 'snippet', code, language, framework: fw, sourceLabel: 'Pasted snippet' });
    } else if (tab === 'files') {
      if (files.length === 0) return;
      onAnalyze({ sourceType: 'files', files, language, framework: fw, sourceLabel: `${files.length} file(s)` });
    } else if (tab === 'github') {
      if (!repoUrl.trim()) return;
      onAnalyze({ sourceType: 'github', repoUrl, branch: branch || undefined, githubToken: token || undefined, language, framework: fw });
    } else {
      if (!repoUrl.trim()) return;
      onAnalyze({ sourceType: 'gitlab', repoUrl, branch: branch || undefined, gitlabToken: token || undefined, language, framework: fw });
    }
  };

  return (
    <Card className="glass-effect border-border/60">
      <CardContent className="p-5 space-y-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="snippet"><Code2 className="h-3.5 w-3.5 mr-1.5" />Snippet</TabsTrigger>
            <TabsTrigger value="files"><FileCode className="h-3.5 w-3.5 mr-1.5" />Files</TabsTrigger>
            <TabsTrigger value="github"><Github className="h-3.5 w-3.5 mr-1.5" />GitHub</TabsTrigger>
            <TabsTrigger value="gitlab"><Github className="h-3.5 w-3.5 mr-1.5" />GitLab</TabsTrigger>
          </TabsList>

          <TabsContent value="snippet" className="mt-4">
            <Textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Paste your code here..."
              className="font-mono text-xs min-h-[260px]"
            />
          </TabsContent>

          <TabsContent value="files" className="mt-4 space-y-3">
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
              className="border-2 border-dashed border-border/60 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm">Drop files here or click to upload</p>
              <p className="text-xs text-muted-foreground mt-1">Up to {MAX_FILES} files, 2MB each</p>
              <input ref={fileInputRef} type="file" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
            </div>
            {files.length > 0 && (
              <div className="space-y-1.5">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-muted/40 rounded-md px-3 py-1.5">
                    <span className="font-mono truncate">{f.path}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFiles((p) => p.filter((_, idx) => idx !== i))}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="github" className="mt-4 space-y-3">
            <Input value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="https://github.com/owner/repo" />
            <div className="grid grid-cols-2 gap-2">
              <Input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="branch (optional)" />
              <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="PAT (for private repos)" type="password" />
            </div>
            <Badge variant="outline" className="text-[10px]">Up to 25 source files will be analyzed</Badge>
          </TabsContent>

          <TabsContent value="gitlab" className="mt-4 space-y-3">
            <Input value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="https://gitlab.com/owner/repo" />
            <div className="grid grid-cols-2 gap-2">
              <Input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="branch (optional)" />
              <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="PAT (for private repos)" type="password" />
            </div>
            <Badge variant="outline" className="text-[10px]">Self-hosted GitLab is supported via the full URL</Badge>
          </TabsContent>
        </Tabs>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SUPPORTED_LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Framework</Label>
            <Select value={framework} onValueChange={setFramework}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SUPPORTED_FRAMEWORKS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={submit} disabled={isAnalyzing} className="w-full" size="lg">
          {isAnalyzing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing your code…</> : <><Play className="h-4 w-4 mr-2" />Run AI Analysis</>}
        </Button>
      </CardContent>
    </Card>
  );
};

export default CodeInputPanel;
