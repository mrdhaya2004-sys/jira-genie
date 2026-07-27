import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Download, HardDrive, Info, CheckCircle2 } from 'lucide-react';
import type { MissingComponent } from './sampleProjects';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  components: MissingComponent[];
  onInstalled: (installed: string[]) => void;
  onLog: (line: string) => void;
}

const StudioInstallerDialog: React.FC<Props> = ({ open, onOpenChange, components, onInstalled, onLog }) => {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentIdx, setCurrentIdx] = useState(0);

  useEffect(() => {
    if (!open) return;
    const s: Record<string, boolean> = {};
    components.forEach(c => { s[c.name] = c.required; });
    setSelected(s);
    setProgress(0);
    setCurrentIdx(0);
    setInstalling(false);
  }, [open, components]);

  const chosen = components.filter(c => selected[c.name]);
  const totalMb = chosen.reduce((a, c) => a + c.sizeMb, 0);
  const etaMin = Math.max(1, Math.round(totalMb / 60));

  const runInstall = () => {
    if (chosen.length === 0) return;
    setInstalling(true);
    setProgress(0);
    setCurrentIdx(0);
    let i = 0;
    let p = 0;
    onLog(`▶ Starting installation of ${chosen.length} component(s) • ~${totalMb} MB`);
    const t = setInterval(() => {
      p += 4;
      setProgress(p);
      const step = Math.min(chosen.length - 1, Math.floor((p / 100) * chosen.length));
      if (step !== i) {
        onLog(`✔ Installed ${chosen[i].name} ${chosen[i].version}`);
        i = step;
        setCurrentIdx(step);
        onLog(`⬇ Downloading ${chosen[step].name} ${chosen[step].version} from ${chosen[step].source}…`);
      }
      if (p >= 100) {
        clearInterval(t);
        onLog(`✔ Installed ${chosen[chosen.length - 1].name} ${chosen[chosen.length - 1].version}`);
        onLog(`✅ All components ready. Environment configured.`);
        onInstalled(chosen.map(c => c.name));
        setTimeout(() => { setInstalling(false); onOpenChange(false); }, 700);
      }
    }, 120);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!installing) onOpenChange(o); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-400" /> Smart Installer — Required Components</DialogTitle>
          <DialogDescription>
            Nothing is downloaded without your approval. Review each component below, then choose Install, Custom Location, or Skip.
          </DialogDescription>
        </DialogHeader>

        {!installing ? (
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {components.map(c => (
              <label
                key={c.name}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 cursor-pointer hover:border-white/20 transition-colors"
              >
                <Checkbox
                  checked={!!selected[c.name]}
                  onCheckedChange={(v) => setSelected(s => ({ ...s, [c.name]: !!v }))}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-sm font-medium">{c.name}</div>
                    <Badge variant="secondary" className="text-[10px]">v{c.version}</Badge>
                    {c.required ? (
                      <Badge className="text-[10px] bg-rose-500/20 text-rose-300 border-rose-500/30">Required</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">Optional</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{c.purpose}</div>
                  <div className="text-[11px] text-muted-foreground/70 mt-1 flex items-center gap-3">
                    <span className="inline-flex items-center gap-1"><HardDrive className="h-3 w-3" /> {c.sizeMb} MB</span>
                    <span>Source: {c.source}</span>
                  </div>
                </div>
              </label>
            ))}
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <div className="text-sm">Installing <span className="font-mono">{chosen[currentIdx]?.name}</span> {chosen[currentIdx]?.version}…</div>
            <Progress value={progress} />
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              {chosen.map((c, i) => (
                <div key={c.name} className={cn('flex items-center gap-1.5', i > currentIdx && 'opacity-40')}>
                  {i < currentIdx ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <div className="h-3.5 w-3.5 rounded-full border border-primary" />}
                  <span>{c.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!installing && (
          <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-white/10 pt-3">
            <div className="inline-flex items-center gap-1.5"><Info className="h-3.5 w-3.5" /> {chosen.length} component(s) • ~{totalMb} MB • est. {etaMin} min</div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {!installing && (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Skip</Button>
              <Button variant="outline">Custom Location…</Button>
              <Button onClick={runInstall} disabled={chosen.length === 0}>
                <Download className="h-4 w-4 mr-1.5" /> Install {chosen.length} component{chosen.length === 1 ? '' : 's'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StudioInstallerDialog;
