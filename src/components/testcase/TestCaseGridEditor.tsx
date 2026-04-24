import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Download, FileSpreadsheet } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { ParsedExcelStructure, GeneratedTestCase } from '@/types/testcase';

interface TestCaseGridEditorProps {
  structure: ParsedExcelStructure;
  initialRows: GeneratedTestCase[];
  onDownload: (rows: GeneratedTestCase[]) => void;
}

const TestCaseGridEditor = React.forwardRef<HTMLDivElement, TestCaseGridEditorProps>(({ structure, initialRows, onDownload }, ref) => {
  const [rows, setRows] = useState<GeneratedTestCase[]>(initialRows);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const updateCell = (rowIdx: number, key: string, value: string) => {
    setRows(prev => prev.map((r, i) => (i === rowIdx ? { ...r, [key]: value } : r)));
  };

  const addRow = () => {
    const empty: GeneratedTestCase = {};
    structure.columns.forEach(c => { empty[c.key] = ''; });
    setRows(prev => [...prev, empty]);
  };

  const removeRow = (idx: number) => {
    setRows(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <Card ref={ref} className="border-dashed mt-2">
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Editable Test Cases ({rows.length})</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={addRow}>
              <Plus className="h-3 w-3 mr-1" /> Add Row
            </Button>
            <Button size="sm" onClick={() => onDownload(rows)} disabled={rows.length === 0}>
              <Download className="h-3 w-3 mr-1" /> Download Excel
            </Button>
          </div>
        </div>

        <div className="rounded-md border border-border overflow-hidden">
          <ScrollArea className="max-h-[480px]">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead className="bg-muted/60 sticky top-0">
                  <tr>
                    <th className="w-10 px-2 py-2 text-left font-medium text-muted-foreground border-b border-r border-border">#</th>
                    {structure.columns.map(col => (
                      <th
                        key={col.key}
                        className="px-2 py-2 text-left font-semibold border-b border-r border-border min-w-[160px]"
                      >
                        {col.header}
                      </th>
                    ))}
                    <th className="w-10 px-2 py-2 border-b border-border" />
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={structure.columns.length + 2} className="text-center py-8 text-muted-foreground">
                        No rows. Click "Add Row" to start.
                      </td>
                    </tr>
                  ) : rows.map((row, rIdx) => (
                    <tr key={rIdx} className={cn('hover:bg-muted/30', rIdx % 2 === 1 && 'bg-muted/10')}>
                      <td className="px-2 py-1 text-muted-foreground border-r border-b border-border font-mono">
                        {rIdx + 1}
                      </td>
                      {structure.columns.map(col => (
                        <td key={col.key} className="border-r border-b border-border p-0 align-top">
                          <textarea
                            value={row[col.key] || ''}
                            onChange={(e) => updateCell(rIdx, col.key, e.target.value)}
                            rows={Math.min(6, Math.max(1, (row[col.key] || '').split('\n').length))}
                            className="w-full px-2 py-1 bg-transparent outline-none focus:bg-primary/5 resize-y min-h-[28px] text-xs leading-snug"
                          />
                        </td>
                      ))}
                      <td className="border-b border-border text-center">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeRow(rIdx)}
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
});

TestCaseGridEditor.displayName = 'TestCaseGridEditor';

export default TestCaseGridEditor;
