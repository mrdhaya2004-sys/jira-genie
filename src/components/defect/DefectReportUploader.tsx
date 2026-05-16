import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Upload,
  FileArchive,
  FileJson,
  FileText,
  FileCode2,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Folder,
  Sparkles,
  Gauge,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { SUPPORTED_REPORT_EXTENSIONS } from '@/types/defectAnalyzer';

export type UploadState = 'waiting' | 'uploading' | 'processing' | 'analyzing' | 'completed' | 'failed';

export interface UploadItem {
  id: string;
  file: File;
  state: UploadState;
  uploadedBytes: number;
  totalBytes: number;
  speedBps: number;
  etaSeconds: number;
  errorMessage?: string;
}

interface DefectReportUploaderProps {
  onAccepted: (files: File[], setProgress: (cb: (items: UploadItem[]) => UploadItem[]) => void) => Promise<void>;
  disabled?: boolean;
  externalState?: 'idle' | 'processing' | 'analyzing' | 'completed' | 'failed';
}

const iconFor = (name: string) => {
  const l = name.toLowerCase();
  if (l.endsWith('.zip')) return FileArchive;
  if (l.endsWith('.json')) return FileJson;
  if (l.endsWith('.html') || l.endsWith('.htm') || l.endsWith('.xml')) return FileCode2;
  return FileText;
};

const isSupported = (name: string) => SUPPORTED_REPORT_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext));

const fmtBytes = (b: number) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(2)} MB`;
  return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const fmtSpeed = (bps: number) => {
  if (!bps || !isFinite(bps)) return '— MB/s';
  if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(1)} KB/s`;
  return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`;
};

const fmtEta = (sec: number) => {
  if (!isFinite(sec) || sec <= 0) return '—';
  if (sec < 60) return `${Math.ceil(sec)}s`;
  const m = Math.floor(sec / 60);
  const s = Math.ceil(sec % 60);
  return `${m}m ${s}s`;
};

const stateMeta: Record<UploadState, { label: string; tone: string; icon: React.ReactNode; ring: string }> = {
  waiting: {
    label: 'Waiting',
    tone: 'text-muted-foreground',
    ring: 'ring-border/50',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  uploading: {
    label: 'Uploading',
    tone: 'text-sky-400',
    ring: 'ring-sky-400/50',
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
  },
  processing: {
    label: 'Processing',
    tone: 'text-cyan-400',
    ring: 'ring-cyan-400/50',
    icon: <Sparkles className="h-3.5 w-3.5 animate-pulse" />,
  },
  analyzing: {
    label: 'AI Analyzing',
    tone: 'text-primary',
    ring: 'ring-primary/60',
    icon: <Gauge className="h-3.5 w-3.5 animate-pulse" />,
  },
  completed: {
    label: 'Completed',
    tone: 'text-emerald-400',
    ring: 'ring-emerald-400/60',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  failed: {
    label: 'Failed',
    tone: 'text-destructive',
    ring: 'ring-destructive/60',
    icon: <AlertCircle className="h-3.5 w-3.5" />,
  },
};

const DefectReportUploader: React.FC<DefectReportUploaderProps> = ({ onAccepted, disabled, externalState = 'idle' }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const [hover, setHover] = useState(false);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  const validate = useCallback((files: File[]) => {
    const good: File[] = [];
    const bad: string[] = [];
    files.forEach((f) => (isSupported(f.name) ? good.push(f) : bad.push(f.name)));
    if (bad.length) {
      setError(
        `Unsupported: ${bad.join(', ')}.\nAllowed: ${SUPPORTED_REPORT_EXTENSIONS.join(', ')}`,
      );
    } else {
      setError(null);
    }
    return good;
  }, []);

  const stageFiles = useCallback(
    (files: File[]) => {
      const items: UploadItem[] = files.map((f) => ({
        id: `${f.name}-${f.size}-${Math.random().toString(36).slice(2, 8)}`,
        file: f,
        state: 'waiting',
        uploadedBytes: 0,
        totalBytes: f.size,
        speedBps: 0,
        etaSeconds: 0,
      }));
      setItems((prev) => [...prev, ...items]);
    },
    [],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setHover(false);
      if (disabled) return;
      const files = validate(Array.from(e.dataTransfer.files));
      if (files.length) stageFiles(files);
    },
    [disabled, validate, stageFiles],
  );

  const onPick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const list = e.target.files ? Array.from(e.target.files) : [];
      const files = validate(list);
      if (files.length) stageFiles(files);
      if (e.target) e.target.value = '';
    },
    [validate, stageFiles],
  );

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const cancel = () => {
    cancelledRef.current = true;
    setItems((prev) =>
      prev.map((i) =>
        i.state === 'uploading' || i.state === 'processing'
          ? { ...i, state: 'failed', errorMessage: 'Cancelled' }
          : i,
      ),
    );
  };

  const startUpload = async () => {
    if (!items.length) return;
    cancelledRef.current = false;
    const filesToProcess = items.filter((i) => i.state !== 'completed').map((i) => i.file);
    if (!filesToProcess.length) return;

    try {
      await onAccepted(filesToProcess, (updater) => setItems(updater));
    } catch (e) {
      setItems((prev) =>
        prev.map((i) =>
          i.state === 'uploading' || i.state === 'processing'
            ? { ...i, state: 'failed', errorMessage: e instanceof Error ? e.message : 'Upload failed' }
            : i,
        ),
      );
    }
  };

  // Reflect external analysis state on the last batch
  useEffect(() => {
    if (externalState === 'analyzing') {
      setItems((prev) => prev.map((i) => (i.state === 'completed' ? { ...i, state: 'analyzing' } : i)));
    } else if (externalState === 'completed') {
      setItems((prev) => prev.map((i) => (i.state === 'analyzing' ? { ...i, state: 'completed' } : i)));
    }
  }, [externalState]);

  const overall = useMemo(() => {
    const total = items.reduce((s, i) => s + i.totalBytes, 0);
    const done = items.reduce((s, i) => s + i.uploadedBytes, 0);
    const pct = total ? Math.round((done / total) * 100) : 0;
    const activeSpeed = items
      .filter((i) => i.state === 'uploading')
      .reduce((s, i) => s + i.speedBps, 0);
    const remaining = total - done;
    const eta = activeSpeed > 0 ? remaining / activeSpeed : 0;
    return { total, done, pct, speed: activeSpeed, eta };
  }, [items]);

  const isBusy =
    items.some((i) => i.state === 'uploading' || i.state === 'processing' || i.state === 'analyzing') ||
    externalState === 'processing' ||
    externalState === 'analyzing';

  const hasWaiting = items.some((i) => i.state === 'waiting' || i.state === 'failed');

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setHover(true);
        }}
        onDragLeave={() => setHover(false)}
        onDrop={onDrop}
        onClick={() => !disabled && !isBusy && inputRef.current?.click()}
        className={cn(
          'relative cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-all overflow-hidden',
          'bg-gradient-to-br from-sky-500/10 via-primary/10 to-cyan-400/10 backdrop-blur-xl',
          'border-sky-400/40 shadow-[0_8px_40px_-12px_hsl(var(--primary)/0.35)]',
          'hover:border-sky-400/80 hover:shadow-[0_0_60px_-12px_hsl(var(--primary)/0.6)]',
          hover && 'scale-[1.01] border-sky-300 bg-gradient-to-br from-sky-500/20 via-primary/20 to-cyan-400/20',
          (disabled || isBusy) && 'opacity-60 cursor-not-allowed',
        )}
      >
        {/* animated gradient sheen */}
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute -top-1/2 -left-1/2 h-[200%] w-[200%] bg-[conic-gradient(from_0deg_at_50%_50%,hsl(var(--primary)/0.15),transparent_25%,hsl(199_89%_55%/0.18)_50%,transparent_75%,hsl(var(--primary)/0.15))] animate-[spin_18s_linear_infinite]" />
        </div>

        <div className="relative flex flex-col items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-sky-400/40 blur-2xl animate-pulse" />
            <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-sky-400 to-primary flex items-center justify-center shadow-lg shadow-primary/40">
              <Upload className="h-6 w-6 text-white drop-shadow" />
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold bg-gradient-to-r from-sky-300 to-primary bg-clip-text text-transparent">
              Drop your execution report here
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Folder · HTML · JSON · ZIP · Execution Logs · TXT · XML
            </p>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <Button
              type="button"
              size="sm"
              variant="glass-primary"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
              disabled={disabled || isBusy}
            >
              <Upload className="h-3.5 w-3.5" />
              Browse files
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="backdrop-blur-md bg-background/50 border-sky-400/40 hover:border-sky-400 hover:text-sky-300"
              onClick={(e) => {
                e.stopPropagation();
                folderRef.current?.click();
              }}
              disabled={disabled || isBusy}
            >
              <Folder className="h-3.5 w-3.5" />
              Upload folder
            </Button>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept={SUPPORTED_REPORT_EXTENSIONS.join(',')}
          className="hidden"
          onChange={onPick}
          disabled={disabled || isBusy}
        />
        <input
          ref={folderRef}
          type="file"
          multiple
          // @ts-expect-error non-standard but widely supported
          webkitdirectory="true"
          directory=""
          className="hidden"
          onChange={onPick}
          disabled={disabled || isBusy}
        />
      </div>

      {error && (
        <div className="text-xs text-destructive flex items-start gap-2 rounded-xl px-3 py-2 bg-destructive/10 border border-destructive/30 backdrop-blur-sm whitespace-pre-line">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {items.length > 0 && (
        <div className="space-y-2.5">
          {/* Overall progress */}
          {(isBusy || overall.pct > 0) && (
            <div className="rounded-2xl p-3 bg-gradient-to-br from-sky-500/10 to-primary/10 border border-sky-400/30 backdrop-blur-xl shadow-[0_4px_30px_-12px_hsl(var(--primary)/0.4)]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Sparkles className="h-4 w-4 text-sky-300" />
                    <div className="absolute inset-0 blur-md bg-sky-300/40 rounded-full animate-pulse" />
                  </div>
                  <span className="text-xs font-semibold">
                    {externalState === 'analyzing'
                      ? 'AI is analyzing your execution report…'
                      : externalState === 'processing'
                      ? 'Processing report contents…'
                      : `Uploading Report... ${overall.pct}% Completed`}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {fmtBytes(overall.done)} / {fmtBytes(overall.total)}
                </span>
              </div>
              <div className="relative h-2 rounded-full overflow-hidden bg-background/50">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 via-cyan-300 to-primary transition-all duration-300 shadow-[0_0_18px_hsl(199_89%_55%/0.8)]"
                  style={{ width: `${overall.pct}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Gauge className="h-3 w-3" /> Speed: {fmtSpeed(overall.speed)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> ETA: {fmtEta(overall.eta)}
                </span>
              </div>

              {externalState === 'analyzing' && (
                <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
                  {['Parsing report', 'DOM analysis', 'Hive Mind link'].map((label, i) => (
                    <div
                      key={label}
                      className="rounded-lg px-2 py-1.5 bg-background/40 border border-sky-400/20 flex items-center gap-1.5"
                      style={{ animationDelay: `${i * 120}ms` }}
                    >
                      <span className="relative inline-flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75 animate-ping" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-sky-300" />
                      </span>
                      <span className="text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Per-file rows */}
          {items.map((item) => {
            const Icon = iconFor(item.file.name);
            const meta = stateMeta[item.state];
            const pct = item.totalBytes ? Math.round((item.uploadedBytes / item.totalBytes) * 100) : 0;
            return (
              <div
                key={item.id}
                className={cn(
                  'relative rounded-xl p-3 bg-background/40 backdrop-blur-xl border transition-all',
                  'ring-1 ring-inset',
                  meta.ring,
                  item.state === 'uploading' && 'border-sky-400/40 shadow-[0_0_30px_-10px_hsl(199_89%_55%/0.6)]',
                  item.state === 'completed' && 'border-emerald-400/40',
                  item.state === 'failed' && 'border-destructive/40',
                  item.state === 'waiting' && 'border-border/40',
                  (item.state === 'processing' || item.state === 'analyzing') &&
                    'border-primary/40 shadow-[0_0_30px_-10px_hsl(var(--primary)/0.6)]',
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br',
                      item.state === 'completed' && 'from-emerald-500/30 to-emerald-400/10 text-emerald-300',
                      item.state === 'failed' && 'from-destructive/30 to-destructive/10 text-destructive',
                      item.state === 'uploading' && 'from-sky-500/30 to-sky-400/10 text-sky-300',
                      (item.state === 'processing' || item.state === 'analyzing') &&
                        'from-primary/30 to-primary/10 text-primary',
                      item.state === 'waiting' && 'from-muted/40 to-muted/10 text-muted-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium truncate">{item.file.name}</p>
                      <div
                        className={cn(
                          'flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide',
                          meta.tone,
                        )}
                      >
                        {meta.icon}
                        {meta.label}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-0.5 text-[10px] text-muted-foreground">
                      <span>
                        {fmtBytes(item.uploadedBytes)} / {fmtBytes(item.totalBytes)}
                        {item.state === 'uploading' && (
                          <>
                            {' · '}
                            <span className="text-sky-300">{fmtSpeed(item.speedBps)}</span>
                            {' · '}
                            ETA {fmtEta(item.etaSeconds)}
                          </>
                        )}
                      </span>
                      <span>{pct}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full overflow-hidden bg-background/60">
                      <div
                        className={cn(
                          'h-full transition-all duration-300',
                          item.state === 'failed'
                            ? 'bg-destructive'
                            : item.state === 'completed'
                            ? 'bg-emerald-400 shadow-[0_0_10px_hsl(142_70%_50%/0.7)]'
                            : item.state === 'processing' || item.state === 'analyzing'
                            ? 'bg-gradient-to-r from-primary to-cyan-300 shadow-[0_0_10px_hsl(var(--primary)/0.7)]'
                            : 'bg-gradient-to-r from-sky-400 to-cyan-300 shadow-[0_0_10px_hsl(199_89%_55%/0.7)]',
                        )}
                        style={{ width: `${item.state === 'completed' ? 100 : pct}%` }}
                      />
                    </div>
                    {item.errorMessage && (
                      <p className="mt-1 text-[10px] text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {item.errorMessage}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {item.state === 'failed' && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          setItems((prev) =>
                            prev.map((p) =>
                              p.id === item.id ? { ...p, state: 'waiting', uploadedBytes: 0, errorMessage: undefined } : p,
                            ),
                          );
                        }}
                        title="Retry"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {item.state !== 'uploading' && item.state !== 'processing' && item.state !== 'analyzing' && (
                      <Button variant="ghost" size="icon-sm" onClick={() => removeItem(item.id)} title="Remove">
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Actions */}
          <div className="flex items-center gap-2">
            {hasWaiting && (
              <Button variant="glass-primary" className="flex-1" onClick={startUpload} disabled={disabled || isBusy}>
                <Upload className="h-4 w-4" />
                Upload {items.filter((i) => i.state === 'waiting' || i.state === 'failed').length} file
                {items.filter((i) => i.state === 'waiting' || i.state === 'failed').length > 1 ? 's' : ''}
              </Button>
            )}
            {isBusy && (
              <Button variant="outline" onClick={cancel} className="border-destructive/40 hover:text-destructive">
                <X className="h-4 w-4" />
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DefectReportUploader;
