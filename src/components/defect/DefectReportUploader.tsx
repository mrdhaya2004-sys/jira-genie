import React, { useCallback, useRef, useState } from 'react';
import { Upload, FileArchive, FileJson, FileText, FileCode2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SUPPORTED_REPORT_EXTENSIONS } from '@/types/defectAnalyzer';

interface DefectReportUploaderProps {
  onAccepted: (files: File[]) => void;
  disabled?: boolean;
}

const iconFor = (name: string) => {
  const l = name.toLowerCase();
  if (l.endsWith('.zip')) return FileArchive;
  if (l.endsWith('.json')) return FileJson;
  if (l.endsWith('.html') || l.endsWith('.htm') || l.endsWith('.xml')) return FileCode2;
  return FileText;
};

const isSupported = (name: string) => SUPPORTED_REPORT_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext));

const DefectReportUploader: React.FC<DefectReportUploaderProps> = ({ onAccepted, disabled }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hover, setHover] = useState(false);
  const [staged, setStaged] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback((files: File[]) => {
    const good: File[] = [];
    const bad: string[] = [];
    files.forEach((f) => (isSupported(f.name) ? good.push(f) : bad.push(f.name)));
    if (bad.length) setError(`Unsupported: ${bad.join(', ')}. Allowed: ${SUPPORTED_REPORT_EXTENSIONS.join(', ')}`);
    else setError(null);
    return good;
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setHover(false);
      if (disabled) return;
      const files = validate(Array.from(e.dataTransfer.files));
      if (files.length) setStaged((prev) => [...prev, ...files]);
    },
    [disabled, validate],
  );

  const onPick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const list = e.target.files ? Array.from(e.target.files) : [];
      const files = validate(list);
      if (files.length) setStaged((prev) => [...prev, ...files]);
      if (inputRef.current) inputRef.current.value = '';
    },
    [validate],
  );

  const remove = (i: number) => setStaged((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = () => {
    if (!staged.length) return;
    onAccepted(staged);
    setStaged([]);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setHover(true);
        }}
        onDragLeave={() => setHover(false)}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          'glass-card relative cursor-pointer rounded-2xl border border-dashed border-border/60 p-6 text-center transition-all',
          'hover:border-primary/60 hover:shadow-[0_0_40px_-12px_hsl(var(--glow-primary))]',
          hover && 'border-primary/70 bg-primary/5 scale-[1.01]',
          disabled && 'opacity-60 cursor-not-allowed',
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 rounded-2xl pointer-events-none" />
        <div className="relative flex flex-col items-center gap-2">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/30 blur-xl animate-glow-pulse" />
            <div className="relative h-12 w-12 rounded-full glass-effect flex items-center justify-center">
              <Upload className="h-5 w-5 text-primary" />
            </div>
          </div>
          <p className="text-sm font-medium">Drop your execution report here</p>
          <p className="text-xs text-muted-foreground">
            HTML / JSON / LOG / TXT / XML / ZIP — or click to browse
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={SUPPORTED_REPORT_EXTENSIONS.join(',')}
          className="hidden"
          onChange={onPick}
          disabled={disabled}
        />
      </div>

      {error && (
        <p className="text-xs text-destructive glass-effect rounded-lg px-3 py-2">{error}</p>
      )}

      {staged.length > 0 && (
        <div className="space-y-2">
          {staged.map((f, i) => {
            const Icon = iconFor(f.name);
            return (
              <div
                key={`${f.name}-${i}`}
                className="glass-effect rounded-xl px-3 py-2 flex items-center gap-3"
              >
                <Icon className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{f.name}</p>
                  <p className="text-[10px] text-muted-foreground">{(f.size / 1024).toFixed(1)} KB</p>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => remove(i)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
          <Button
            variant="glass-primary"
            className="w-full"
            onClick={handleSubmit}
            disabled={disabled}
          >
            <Upload className="h-4 w-4" />
            Upload {staged.length} file{staged.length > 1 ? 's' : ''}
          </Button>
        </div>
      )}
    </div>
  );
};

export default DefectReportUploader;
