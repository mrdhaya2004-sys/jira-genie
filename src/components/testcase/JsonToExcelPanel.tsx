import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Braces, FileSpreadsheet, Pencil, Check, X, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ParsedExcelStructure } from '@/types/testcase';

interface JsonToExcelPanelProps {
  /** Raw assistant content that may contain a JSON code block or bare array. */
  rawContent: string;
  /** Optional column schema for header mapping. If omitted, keys from JSON are used. */
  structure?: ParsedExcelStructure | null;
}

const normalizeKey = (s: string): string =>
  String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

/** Extract the first JSON array/object from arbitrary text. Returns the raw string slice. */
const extractJsonSlice = (raw: string): string | null => {
  if (!raw) return null;
  const fence = raw.match(/```json\s*([\s\S]*?)```/i) || raw.match(/```\s*([\s\S]*?)```/);
  if (fence?.[1]) return fence[1].trim();
  const firstArr = raw.indexOf('[');
  const lastArr = raw.lastIndexOf(']');
  if (firstArr !== -1 && lastArr > firstArr) return raw.slice(firstArr, lastArr + 1);
  const firstObj = raw.indexOf('{');
  const lastObj = raw.lastIndexOf('}');
  if (firstObj !== -1 && lastObj > firstObj) return raw.slice(firstObj, lastObj + 1);
  return null;
};

const safeParse = (raw: string): any[] | null => {
  const slice = extractJsonSlice(raw);
  if (!slice) return null;
  const cleaned = slice
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/,\s*([}\]])/g, '$1')
    .trim();
  try {
    const p = JSON.parse(cleaned);
    if (Array.isArray(p)) return p;
    if (p && typeof p === 'object') return [p];
  } catch {
    try {
      const requoted = cleaned.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"');
      const p = JSON.parse(requoted);
      if (Array.isArray(p)) return p;
      if (p && typeof p === 'object') return [p];
    } catch {
      return null;
    }
  }
  return null;
};

const JsonToExcelPanel: React.FC<JsonToExcelPanelProps> = ({ rawContent, structure }) => {
  const { toast } = useToast();
  const initialJson = useMemo(() => {
    const slice = extractJsonSlice(rawContent);
    if (!slice) return '';
    try {
      const parsed = safeParse(slice);
      return parsed ? JSON.stringify(parsed, null, 2) : slice.trim();
    } catch {
      return slice.trim();
    }
  }, [rawContent]);

  const [editing, setEditing] = useState(false);
  const [jsonText, setJsonText] = useState(initialJson);
  const [error, setError] = useState<string | null>(null);

  // Don't render the panel if there's no JSON-like content
  if (!initialJson) return null;

  const handleConvert = () => {
    setError(null);
    const rows = safeParse(jsonText);
    if (!rows || rows.length === 0) {
      setError('Could not parse valid JSON. Please check the syntax and try again.');
      toast({
        title: 'Invalid JSON',
        description: 'The JSON could not be parsed. Fix the syntax and retry.',
        variant: 'destructive',
      });
      return;
    }

    // Determine columns: prefer user-defined structure, else infer from JSON keys (union)
    let columns: { key: string; header: string }[];
    if (structure?.columns?.length) {
      columns = structure.columns.map(c => ({ key: c.key, header: c.header }));
    } else {
      const seen = new Set<string>();
      const ordered: string[] = [];
      rows.forEach(r => {
        if (r && typeof r === 'object') {
          Object.keys(r).forEach(k => {
            if (!seen.has(k)) { seen.add(k); ordered.push(k); }
          });
        }
      });
      columns = ordered.map(k => ({ key: k, header: k }));
    }

    if (columns.length === 0) {
      setError('No columns could be determined from the JSON.');
      return;
    }

    // Build rows with fuzzy key matching
    const aoa: (string | number)[][] = [columns.map(c => c.header)];
    rows.forEach(r => {
      if (!r || typeof r !== 'object') return;
      const idx: Record<string, any> = {};
      Object.keys(r).forEach(k => { idx[normalizeKey(k)] = r[k]; });
      const row = columns.map(c => {
        const v =
          idx[normalizeKey(c.key)] ??
          idx[normalizeKey(c.header)] ??
          '';
        if (Array.isArray(v)) {
          return v
            .map(x => (typeof x === 'string' ? x : JSON.stringify(x)))
            .map((x, i) => (/^\s*\d+[.)]/.test(x) ? x : `${i + 1}. ${x}`))
            .join('\n');
        }
        if (v && typeof v === 'object') return JSON.stringify(v);
        return String(v ?? '');
      });
      aoa.push(row);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, structure?.sheetName || 'Test Cases');
    const fileName = `test_cases_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);

    toast({
      title: 'Download Complete',
      description: `${rows.length} row${rows.length === 1 ? '' : 's'} exported to ${fileName}`,
    });
  };

  return (
    <Card className="mt-2 border-dashed">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Braces className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">AI JSON Output</span>
          </div>
          <div className="flex items-center gap-1">
            {editing ? (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => { setJsonText(initialJson); setEditing(false); setError(null); }}
                >
                  <X className="h-3 w-3 mr-1" /> Cancel
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => { setEditing(false); setError(null); }}
                >
                  <Check className="h-3 w-3 mr-1" /> Done
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-3 w-3 mr-1" /> Edit
              </Button>
            )}
          </div>
        </div>

        {editing ? (
          <Textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            className="font-mono text-xs min-h-[180px] max-h-[320px]"
            spellCheck={false}
          />
        ) : (
          <pre className="text-xs bg-muted/50 rounded-md p-2 max-h-[240px] overflow-auto font-mono whitespace-pre-wrap break-words">
            {jsonText}
          </pre>
        )}

        {error && (
          <div className="flex items-start gap-2 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end">
          <Button size="sm" onClick={handleConvert}>
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
            Convert to Excel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default JsonToExcelPanel;
