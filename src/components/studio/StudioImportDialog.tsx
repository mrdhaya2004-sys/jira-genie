import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { FolderGit2, Upload, FileArchive, Github, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SAMPLE_PROJECTS, type DetectedProject } from './sampleProjects';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (project: DetectedProject) => void;
}

const StudioImportDialog: React.FC<Props> = ({ open, onOpenChange, onImport }) => {
  const [selected, setSelected] = useState<string>(SAMPLE_PROJECTS[0].id);
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);

  const steps = [
    'Reading project archive…',
    'Detecting build tool & language…',
    'Parsing pom.xml / build.gradle / package.json…',
    'Identifying framework & test runner…',
    'Scanning dependencies for updates & CVEs…',
    'Import complete',
  ];

  const runImport = () => {
    setScanning(true);
    setScanStep(0);
    let i = 0;
    const t = setInterval(() => {
      i++;
      setScanStep(i);
      if (i >= steps.length - 1) {
        clearInterval(t);
        setTimeout(() => {
          const proj = SAMPLE_PROJECTS.find(p => p.id === selected)!;
          onImport(proj);
          setScanning(false);
          setScanStep(0);
          onOpenChange(false);
        }, 500);
      }
    }, 450);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FolderGit2 className="h-5 w-5 text-primary" /> Import Automation Project</DialogTitle>
          <DialogDescription>
            Drop a .zip, connect a Git repo, or pick a sample framework. TestZone Studio will detect the language, build tool, framework, and missing SDKs automatically.
          </DialogDescription>
        </DialogHeader>

        {!scanning ? (
          <>
            <div className="grid grid-cols-3 gap-3">
              <button className="tz-card-hover rounded-xl border border-white/10 bg-white/5 p-4 text-left">
                <Upload className="h-5 w-5 text-primary mb-2" />
                <div className="text-sm font-medium">Upload .zip</div>
                <div className="text-xs text-muted-foreground">Any Maven, Gradle, Node project</div>
              </button>
              <button className="tz-card-hover rounded-xl border border-white/10 bg-white/5 p-4 text-left">
                <Github className="h-5 w-5 text-primary mb-2" />
                <div className="text-sm font-medium">Git repository</div>
                <div className="text-xs text-muted-foreground">GitHub • GitLab • Bitbucket</div>
              </button>
              <button className="tz-card-hover rounded-xl border border-white/10 bg-white/5 p-4 text-left">
                <FileArchive className="h-5 w-5 text-primary mb-2" />
                <div className="text-sm font-medium">Local folder</div>
                <div className="text-xs text-muted-foreground">Point at existing workspace</div>
              </button>
            </div>

            <div className="mt-2">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Or start from a sample framework</div>
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
            </div>
          </>
        ) : (
          <div className="py-4 space-y-2">
            {steps.map((s, idx) => (
              <div key={s} className={cn('flex items-center gap-2 text-sm', idx > scanStep && 'opacity-40')}>
                {idx < scanStep ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : idx === scanStep ? (
                  <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
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
          <Button onClick={runImport} disabled={scanning}>{scanning ? 'Analyzing…' : 'Import & Analyze'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StudioImportDialog;
