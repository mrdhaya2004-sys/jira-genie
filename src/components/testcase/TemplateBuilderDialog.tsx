import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, GripVertical, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
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

const TemplateBuilderDialog: React.FC<TemplateBuilderDialogProps> = ({ open, onOpenChange, onConfirm }) => {
  const [headers, setHeaders] = useState<string[]>(DEFAULT_HEADERS);

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

  const handleConfirm = () => {
    const cleaned = headers.map(h => h.trim()).filter(Boolean);
    if (cleaned.length === 0) return;
    const usedKeys = new Set<string>();
    const columns: TestCaseColumn[] = cleaned.map((header, index) => {
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
  };

  const reset = () => setHeaders(DEFAULT_HEADERS);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Create Test Case Template
          </DialogTitle>
          <DialogDescription>
            Define the columns for your test case sheet. AI will generate test cases matching this exact structure.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Spreadsheet-like header preview */}
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="bg-muted/60 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border flex items-center justify-between">
              <span>Sheet1 — Column Headers ({headers.length})</span>
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={headers.every(h => !h.trim())}>
            Proceed
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateBuilderDialog;
