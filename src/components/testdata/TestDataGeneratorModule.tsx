import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Database, Sparkles, Wand2, Loader2, RotateCcw, Download, Plus, X, Upload, FileJson, FileSpreadsheet, FileText, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import {
  useTestDataGenerator, type TDCategory, type TDField, type TDInputField, type TDDataset,
} from "@/hooks/useTestDataGenerator";

const CATEGORY_META: Record<TDCategory, { label: string; cls: string }> = {
  positive:           { label: "Positive",           cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  negative:           { label: "Negative",           cls: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30" },
  boundary:           { label: "Boundary",           cls: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30" },
  edge:               { label: "Edge",               cls: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30" },
  invalid_format:     { label: "Invalid Format",     cls: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30" },
  security:           { label: "Security",           cls: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30" },
  special_character:  { label: "Special Char",       cls: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30" },
  null_empty:         { label: "Null / Empty",       cls: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30" },
};

function flattenRows(fields: TDField[]) {
  const rows: Array<Record<string, string>> = [];
  for (const f of fields) {
    for (const d of f.datasets || []) {
      rows.push({
        Field: f.name,
        Validation: f.validation,
        Mandatory: f.mandatory ? "Yes" : "No",
        InputType: f.input_type || "",
        Category: CATEGORY_META[d.category]?.label || d.category,
        TestingType: d.testing_type,
        Value: d.value,
        ExpectedResult: d.expected_result,
        Reasoning: d.reasoning,
      });
    }
  }
  return rows;
}

const TestDataGeneratorModule: React.FC = () => {
  const { workspaces, isLoading: wsLoading } = useWorkspaces();
  const { generate, reset, isLoading, result } = useTestDataGenerator();

  const [workspaceId, setWorkspaceId] = useState<string>("none");
  const [query, setQuery] = useState("");
  const [screenName, setScreenName] = useState("");
  const [moduleName, setModuleName] = useState("");
  const [useFields, setUseFields] = useState(false);
  const [fields, setFields] = useState<TDInputField[]>([{ name: "" }]);
  const [filter, setFilter] = useState<TDCategory | "all">("all");

  const canSubmit = query.trim().length > 1 && !isLoading;

  const handleGenerate = async () => {
    const cleanFields = useFields ? fields.filter(f => f.name.trim()) : undefined;
    await generate({
      workspaceId: workspaceId !== "none" ? workspaceId : null,
      query: query.trim(),
      screenName: screenName.trim() || undefined,
      moduleName: moduleName.trim() || undefined,
      fields: cleanFields,
    });
  };

  const rows = useMemo(() => result ? flattenRows(result.fields) : [], [result]);

  const exportExcel = () => {
    if (!result) return;
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Test Data");
    XLSX.writeFile(wb, `test-data-${result.screen_name || "export"}.xlsx`);
  };
  const exportCSV = () => {
    if (!result) return;
    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv" });
    triggerDownload(blob, `test-data-${result.screen_name || "export"}.csv`);
  };
  const exportJSON = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    triggerDownload(blob, `test-data-${result.screen_name || "export"}.json`);
  };
  const exportPDF = () => {
    if (!result) return;
    const html = renderPdfHtml(result);
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  const noContextWorkspace = workspaceId !== "none";
  const noContextSelected = workspaceId === "none" && !useFields && !screenName && !query;

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-primary/5 via-background to-background">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-card to-[hsl(var(--chart-2))]/10 backdrop-blur-md px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2">
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-[hsl(var(--chart-2))]/10 blur-3xl pointer-events-none animate-pulse" />
        <div className="relative flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-gradient-to-br from-primary/20 to-[hsl(var(--chart-2))]/30 backdrop-blur-md border border-white/10 flex items-center justify-center shrink-0">
            <Database className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold tracking-tight flex items-center gap-2 text-sm sm:text-base truncate">
              <span className="truncate text-foreground">Test Data Generator</span>
              <Sparkles className="h-4 w-4 text-primary shrink-0 hidden sm:inline-block" />
              <Badge className="text-[10px] sm:text-xs hidden md:inline-flex shrink-0 border-0 bg-gradient-to-r from-primary to-[hsl(var(--chart-2))] text-primary-foreground shadow-sm">
                Context-Aware AI
              </Badge>
            </h2>
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate mt-0.5">
              Reads project requirements first, then generates intelligent test data
            </p>
          </div>
        </div>
        <div className="relative flex items-center gap-1.5 sm:gap-2 shrink-0">
          {result && (
            <Badge variant="outline" className="text-xs hidden md:inline-flex border-success/40 bg-success/10 text-foreground">
              {result.fields.length} fields · {rows.length} datasets
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => { reset(); setQuery(""); }}
            className="bg-card/70 backdrop-blur-sm border-destructive/30"
          >
            <RotateCcw className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline font-medium">Reset</span>
          </Button>
        </div>
      </div>

      {/* Body */}
      <ScrollArea className="flex-1">
        <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4">
          {/* Input panel */}
          <Card className="p-4 sm:p-5 bg-card/70 backdrop-blur-xl border border-white/10 shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="td-ws">Project Workspace (Hive AI Core)</Label>
                <Select value={workspaceId} onValueChange={setWorkspaceId} disabled={wsLoading}>
                  <SelectTrigger id="td-ws"><SelectValue placeholder={wsLoading ? "Loading…" : "No workspace (generic)"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No workspace — generic data</SelectItem>
                    {workspaces.map(w => (<SelectItem key={w.id} value={w.id}>📁 {w.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="td-module">Module Name</Label>
                  <Input id="td-module" value={moduleName} onChange={e => setModuleName(e.target.value)} placeholder="e.g. Trade Ticket" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="td-screen">Screen Name</Label>
                  <Input id="td-screen" value={screenName} onChange={e => setScreenName(e.target.value)} placeholder="e.g. Login" />
                </div>
              </div>
            </div>

            <div className="mt-3 space-y-1.5">
              <Label htmlFor="td-query">Describe the screen / requirement</Label>
              <Textarea
                id="td-query"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder='e.g. "Generate test data for the trade ticket: counter, quantity, price, account, currency"'
                className="min-h-[88px]"
              />
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Switch id="td-fields" checked={useFields} onCheckedChange={setUseFields} />
                <Label htmlFor="td-fields" className="cursor-pointer">Specify form fields manually</Label>
              </div>
              <Button onClick={handleGenerate} disabled={!canSubmit} className="bg-gradient-to-r from-primary to-[hsl(var(--chart-2))] text-primary-foreground">
                {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                {isLoading ? "Analyzing requirements…" : "Generate Test Data"}
              </Button>
            </div>

            {useFields && (
              <div className="mt-4 rounded-xl border border-white/10 bg-background/40 backdrop-blur-md p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Form Fields</Label>
                  <Button size="sm" variant="ghost" onClick={() => setFields(f => [...f, { name: "" }])}>
                    <Plus className="h-4 w-4 mr-1" /> Add field
                  </Button>
                </div>
                {fields.map((f, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2">
                    <Input className="col-span-4" placeholder="Field name" value={f.name} onChange={e => updateField(setFields, i, { name: e.target.value })} />
                    <Input className="col-span-2" placeholder="Type" value={f.type || ""} onChange={e => updateField(setFields, i, { type: e.target.value })} />
                    <Input className="col-span-5" placeholder="Validation rule" value={f.validation || ""} onChange={e => updateField(setFields, i, { validation: e.target.value })} />
                    <Button variant="ghost" size="icon" className="col-span-1" onClick={() => setFields(arr => arr.filter((_, j) => j !== i))}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Smart-assist / no-context hint */}
          {!result && !isLoading && (
            <Card className="p-4 bg-muted/30 backdrop-blur-md border border-white/10">
              <div className="flex items-start gap-3">
                <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="text-foreground font-medium">How TestZone reads context first</p>
                  <p>1. If you pick a <strong>Workspace</strong>, the AI reads its user stories, BRD/PRD docs, notes and metadata before generating data.</p>
                  <p>2. If you only describe a screen (e.g. <em>"Login Page"</em>), the AI will ask you to add fields or a user story, or fall back to generic intelligent data.</p>
                  <p>3. No context? Use <strong>Specify form fields manually</strong> or upload a user story in <strong>Hive AI – Core Workspace</strong>.</p>
                </div>
              </div>
            </Card>
          )}

          {/* Result */}
          {result && (
            <Card className="p-4 sm:p-5 bg-card/70 backdrop-blur-xl border border-white/10 shadow-lg space-y-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-lg">{result.module_name || moduleName || "Module"} · {result.screen_name || screenName || "Screen"}</h3>
                    <Badge variant="outline" className={result.context_used
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"}>
                      {result.context_used ? "Project-aware" : "Generic mode"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{result.context_summary}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={exportExcel}><FileSpreadsheet className="h-4 w-4 mr-2" />Excel (.xlsx)</DropdownMenuItem>
                    <DropdownMenuItem onClick={exportCSV}><FileSpreadsheet className="h-4 w-4 mr-2" />CSV</DropdownMenuItem>
                    <DropdownMenuItem onClick={exportJSON}><FileJson className="h-4 w-4 mr-2" />JSON</DropdownMenuItem>
                    <DropdownMenuItem onClick={exportPDF}><FileText className="h-4 w-4 mr-2" />PDF (print)</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <Tabs defaultValue="table" className="w-full">
                <TabsList>
                  <TabsTrigger value="table">Test Data Table</TabsTrigger>
                  <TabsTrigger value="fields">By Field ({result.fields.length})</TabsTrigger>
                  <TabsTrigger value="raw">JSON</TabsTrigger>
                </TabsList>

                <TabsContent value="table" className="mt-3">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <FilterChip label="All" active={filter === "all"} onClick={() => setFilter("all")} />
                    {(Object.keys(CATEGORY_META) as TDCategory[]).map(c => (
                      <FilterChip key={c} label={CATEGORY_META[c].label} active={filter === c}
                        onClick={() => setFilter(filter === c ? "all" : c)} cls={CATEGORY_META[c].cls} />
                    ))}
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-white/10 bg-background/40 backdrop-blur-md">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <Th>Field</Th><Th>Validation</Th><Th>Category</Th><Th>Testing Type</Th>
                          <Th>Value</Th><Th>Expected Result</Th><Th>Why</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.fields.flatMap(f => f.datasets
                          .filter(d => filter === "all" || d.category === filter)
                          .map((d, i) => (
                          <tr key={`${f.name}-${i}`} className="border-t border-white/5 hover:bg-primary/5">
                            <Td className="font-medium">{f.name}{f.mandatory && <span className="text-red-500 ml-0.5">*</span>}</Td>
                            <Td className="text-muted-foreground">{f.validation}</Td>
                            <Td><Badge variant="outline" className={CATEGORY_META[d.category]?.cls}>{CATEGORY_META[d.category]?.label || d.category}</Badge></Td>
                            <Td className="text-xs"><Badge variant="secondary" className="capitalize">{d.testing_type}</Badge></Td>
                            <Td className="font-mono text-xs max-w-[260px] break-words">{d.value || <em className="text-muted-foreground">∅ empty</em>}</Td>
                            <Td className="text-xs">{d.expected_result}</Td>
                            <Td className="text-xs text-muted-foreground">{d.reasoning}</Td>
                          </tr>
                        )))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                <TabsContent value="fields" className="mt-3 space-y-3">
                  {result.fields.map((f) => (
                    <Card key={f.name} className="p-4 bg-background/40 border border-white/10">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div>
                          <h4 className="font-semibold">{f.name}{f.mandatory && <span className="text-red-500 ml-0.5">*</span>}</h4>
                          <p className="text-xs text-muted-foreground">{f.input_type} · {f.data_format}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {Array.from(new Set(f.datasets.map(d => d.category))).map(c => (
                            <Badge key={c} variant="outline" className={CATEGORY_META[c]?.cls}>{CATEGORY_META[c]?.label || c}</Badge>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs mt-2"><strong>Validation:</strong> {f.validation}</p>
                      <p className="text-xs"><strong>Objective:</strong> {f.testing_objective}</p>
                      <p className="text-xs"><strong>Expected behavior:</strong> {f.expected_behavior}</p>
                    </Card>
                  ))}
                </TabsContent>

                <TabsContent value="raw" className="mt-3">
                  <pre className="text-xs bg-background/60 border border-white/10 rounded-xl p-3 overflow-auto max-h-[500px]">
{JSON.stringify(result, null, 2)}
                  </pre>
                </TabsContent>
              </Tabs>

              {result.notes && (
                <p className="text-xs text-muted-foreground border-t border-white/10 pt-3">
                  <strong>AI notes:</strong> {result.notes}
                </p>
              )}
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

function FilterChip({ label, active, onClick, cls }: { label: string; active: boolean; onClick: () => void; cls?: string }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-2.5 py-1 rounded-full border transition ${active ? (cls || "bg-primary/20 text-foreground border-primary/40") : "bg-background/40 border-white/10 text-muted-foreground hover:text-foreground"}`}
    >{label}</button>
  );
}
function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left font-medium px-3 py-2 whitespace-nowrap">{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 align-top ${className || ""}`}>{children}</td>;
}
function updateField(setFields: React.Dispatch<React.SetStateAction<TDInputField[]>>, i: number, patch: Partial<TDInputField>) {
  setFields(arr => arr.map((f, j) => j === i ? { ...f, ...patch } : f));
}
function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}
function renderPdfHtml(r: any) {
  const rows = flattenRows(r.fields).map(row => `
    <tr>${["Field","Validation","Category","TestingType","Value","ExpectedResult","Reasoning"].map(k => `<td>${escapeHtml(String((row as any)[k] ?? ""))}</td>`).join("")}</tr>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"/><title>Test Data — ${escapeHtml(r.screen_name || "")}</title>
    <style>body{font-family:system-ui,sans-serif;padding:24px;color:#111}h1{margin:0 0 4px}p{color:#555;margin:0 0 16px}
    table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ddd;padding:6px;text-align:left;vertical-align:top}
    th{background:#f3f4f6}</style></head><body>
    <h1>${escapeHtml(r.module_name || "")} — ${escapeHtml(r.screen_name || "")}</h1>
    <p>${escapeHtml(r.context_summary || "")}</p>
    <table><thead><tr><th>Field</th><th>Validation</th><th>Category</th><th>Testing Type</th><th>Value</th><th>Expected Result</th><th>Reasoning</th></tr></thead>
    <tbody>${rows}</tbody></table></body></html>`;
}
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

export default TestDataGeneratorModule;
