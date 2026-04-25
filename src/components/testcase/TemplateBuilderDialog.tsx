import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, GripVertical, ArrowLeft, ArrowRight, Sparkles, CheckCircle2, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ParsedExcelStructure, TestCaseColumn } from '@/types/testcase';

interface TemplateBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (structure: ParsedExcelStructure) => void;
}

const DEFAULT_HEADERS = ['Test Case ID', 'Title', 'Preconditions', 'Steps', 'Expected Result', 'Priority'];

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || `col_${Date.now()}`;

type Step = 'edit' | 'confirm';

const TemplateBuilderDialog: React.FC<TemplateBuilderDialogProps> = ({ open, onOpenChange, onConfirm }) => {
  const [headers, setHeaders] = useState<string[]>(DEFAULT_HEADERS);
  const [step, setStep] = useState<Step>('edit');

  const updateHeader = (idx: number, value: string) => {
    setHeaders(prev => prev.map((h, i) => (i === idx ? value : h)));
  };

  const addColumn = () => {
    setHeaders(prev => [...prev, `Column ${prev.length + 1}`]);
  };

  const removeColumn = (idx: number) => {
    if (headers.length <= 1) return;
    setHeaders(prev => prev.filter((_, i) => i !== idx));
  };

  const moveColumn = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= headers.length) return;
    setHeaders(prev => {
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  };

  const cleanedHeaders = headers.map(h => h.trim()).filter(Boolean);

  const goToConfirm = () => {
    if (cleanedHeaders.length === 0) return;
    setStep('confirm');
  };

  const handleGenerate = () => {
    if (cleanedHeaders.length === 0) return;
    const usedKeys = new Set<string>();
    const columns: TestCaseColumn[] = cleanedHeaders.map((header, index) => {
      let key = slugify(header);
      let suffix = 1;
      while (usedKeys.has(key)) {
        key = `${slugify(header)}_${suffix++}`;
      }
      usedKeys.add(key);
      return { key, header, index };
    });
    onConfirm({ columns, sampleRows: [], sheetName: 'Test Cases' });
    setHeaders(DEFAULT_HEADERS);
    setStep('edit');
  };

  const reset = () => setHeaders(DEFAULT_HEADERS);

  const handleClose = (next: boolean) => {
    if (!next) setStep('edit');
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl w-[calc(100vw-2rem)] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {step === 'edit' ? 'Create Test Case Template' : 'Confirm Your Template'}
          </DialogTitle>
          <DialogDescription>
            {step === 'edit'
              ? 'Add, rename, reorder, or delete columns to define your test case structure.'
              : 'Review your column structure. AI will generate test cases that match this format exactly.'}
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 text-xs w-full min-w-0">
          <div className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-full border whitespace-nowrap shrink-0',
            step === 'edit' ? 'border-primary text-primary bg-primary/5' : 'border-border text-muted-foreground'
          )}>
            <span className="h-4 w-4 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center text-[10px] font-semibold">1</span>
            Build columns
          </div>
          <div className="h-px flex-1 min-w-[12px] bg-border" />
          <div className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-full border whitespace-nowrap shrink-0',
            step === 'confirm' ? 'border-primary text-primary bg-primary/5' : 'border-border text-muted-foreground'
          )}>
            <span className={cn(
              'h-4 w-4 rounded-full inline-flex items-center justify-center text-[10px] font-semibold',
              step === 'confirm' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            )}>2</span>
            Confirm &amp; generate
          </div>
        </div>

        {step === 'edit' ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="bg-muted/60 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border flex items-center justify-between">
                <span>Sheet1 — Column Headers ({cleanedHeaders.length})</span>
                <Button variant="ghost" size="sm" onClick={reset} className="h-6 text-xs">Reset</Button>
              </div>

              <ScrollArea className="max-h-[420px]">
                <div className="divide-y divide-border">
                  {headers.map((header, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors',
                        idx % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                      )}
                    >
                      <div className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => moveColumn(idx, -1)}
                          disabled={idx === 0}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                          aria-label="Move up"
                        >
                          <ArrowLeft className="h-3 w-3 rotate-90" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveColumn(idx, 1)}
                          disabled={idx === headers.length - 1}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                          aria-label="Move down"
                        >
                          <ArrowRight className="h-3 w-3 rotate-90" />
                        </button>
                      </div>
                      <GripVertical className="h-4 w-4 text-muted-foreground/60" />
                      <div className="w-8 text-xs font-mono text-muted-foreground text-center">
                        {String.fromCharCode(65 + (idx % 26))}{idx >= 26 ? Math.floor(idx / 26) : ''}
                      </div>
                      <Input
                        value={header}
                        onChange={(e) => updateHeader(idx, e.target.value)}
                        placeholder="Column name"
                        className="flex-1 h-9"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeColumn(idx)}
                        disabled={headers.length <= 1}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="border-t border-border p-2 bg-muted/30">
                <Button variant="outline" size="sm" onClick={addColumn} className="w-full">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Column
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              💡 Tip: Use clear, descriptive column names like "Test Case ID", "Steps", or "Expected Result".
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-3 flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Your test case format is ready.</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Click <span className="font-medium text-foreground">Generate Test Cases</span> to proceed.
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
              <div className="bg-muted/60 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
                Preview — {cleanedHeaders.length} column{cleanedHeaders.length === 1 ? '' : 's'}
              </div>
              <div className="overflow-x-auto max-w-full">
                <table className="min-w-full text-xs border-collapse">
                  <thead className="bg-muted/40">
                    <tr>
                      {cleanedHeaders.map((h, i) => (
                        <th
                          key={i}
                          className="px-3 py-2 text-left font-semibold border-b border-r border-border min-w-[110px] last:border-r-0 whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {cleanedHeaders.map((_, i) => (
                        <td key={i} className="px-3 py-3 border-r border-border last:border-r-0 text-muted-foreground/60 italic">
                          —
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'edit' ? (
            <>
              <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
              <Button onClick={goToConfirm} disabled={cleanedHeaders.length === 0}>
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Customization Complete
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep('edit')}>
                <Pencil className="h-4 w-4 mr-1.5" />
                Edit Columns
              </Button>
              <Button onClick={handleGenerate}>
                <Sparkles className="h-4 w-4 mr-1.5" />
                Generate Test Cases
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateBuilderDialog;
