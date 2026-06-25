import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  Database, Sparkles, Wand2, Loader2, RotateCcw, Download, Plus, X,
  FileJson, FileSpreadsheet, FileText, Info, ShieldCheck, Target, Brain,
  Lightbulb, AlertTriangle, CheckCircle2, TrendingUp, ListChecks, FileCode2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import {
  useTestDataGenerator, type TDCategory, type TDField, type TDInputField, type TDResult,
} from "@/hooks/useTestDataGenerator";

const CATEGORY_META: Record<TDCategory, { label: string; cls: string; chip: string }> = {
  positive:           { label: "Positive",         chip: "from-emerald-400 to-green-500",   cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  negative:           { label: "Negative",         chip: "from-rose-400 to-red-500",        cls: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30" },
  boundary:           { label: "Boundary",         chip: "from-orange-400 to-amber-500",    cls: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30" },
  edge:               { label: "Edge",             chip: "from-blue-400 to-indigo-500",     cls: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30" },
  invalid_format:     { label: "Invalid Format",   chip: "from-pink-400 to-rose-500",       cls: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30" },
  security:           { label: "Security",         chip: "from-purple-500 to-fuchsia-500",  cls: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30" },
  special_character:  { label: "Special Char",     chip: "from-cyan-400 to-sky-500",        cls: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30" },
  null_empty:         { label: "Null / Empty",     chip: "from-slate-400 to-zinc-500",      cls: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30" },
  exploratory:        { label: "Exploratory",      chip: "from-teal-400 to-cyan-500",       cls: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30" },
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

  const handleGenerateMore = async () => {
    if (!result) return;
    const suggested = result.insights?.suggested_fields || [];
    const extraQuery = `${query.trim()}\n\nAlso generate test data for these additional fields: ${suggested.join(", ")}`;
    await generate({
      workspaceId: workspaceId !== "none" ? workspaceId : null,
      query: extraQuery,
      screenName: screenName.trim() || undefined,
      moduleName: moduleName.trim() || undefined,
      fields: useFields ? fields.filter(f => f.name.trim()) : undefined,
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
    triggerDownload(new Blob([csv], { type: "text/csv" }), `test-data-${result.screen_name || "export"}.csv`);
  };
  const exportJSON = () => {
    if (!result) return;
    triggerDownload(new Blob([JSON.stringify(result, null, 2)], { type: "application/json" }),
      `test-data-${result.screen_name || "export"}.json`);
  };
  const exportMarkdown = () => {
    if (!result) return;
    triggerDownload(new Blob([renderMarkdown(result)], { type: "text/markdown" }),
      `test-data-${result.screen_name || "export"}.md`);
  };
  const exportPDF = () => {
    if (!result) return;
    const html = renderPdfHtml(result);
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html); w.document.close(); w.focus();
    setTimeout(() => w.print(), 300);
  };

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      {/* Animated mesh backdrop */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-500/[0.06] via-fuchsia-500/[0.05] to-cyan-500/[0.06]" />
      <div className="absolute -z-10 top-[-10%] left-[10%] h-[420px] w-[420px] rounded-full bg-fuchsia-500/20 blur-[120px] animate-pulse" />
      <div className="absolute -z-10 bottom-[-10%] right-[5%] h-[420px] w-[420px] rounded-full bg-cyan-500/20 blur-[120px] animate-pulse" />
      <div className="absolute -z-10 top-[30%] right-[35%] h-[300px] w-[300px] rounded-full bg-indigo-500/15 blur-[100px]" />

      {/* Header */}
      <div className="relative overflow-hidden px-3 sm:px-5 py-3 sm:py-4 border-b border-white/10 backdrop-blur-2xl bg-gradient-to-r from-indigo-500/10 via-fuchsia-500/10 to-cyan-500/10">
        <div className="relative flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-cyan-500 shadow-lg shadow-fuchsia-500/30 flex items-center justify-center shrink-0">
              <Database className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-bold tracking-tight flex items-center gap-2 text-base sm:text-lg">
                <span className="truncate bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-cyan-600 dark:from-indigo-300 dark:via-fuchsia-300 dark:to-cyan-300 bg-clip-text text-transparent">
                  Test Data Generator
                </span>
                <Sparkles className="h-4 w-4 text-fuchsia-500 shrink-0 hidden sm:inline-block" />
                <Badge className="text-[10px] hidden md:inline-flex shrink-0 border-0 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-500 text-white shadow">
                  QA Intelligence Engine
                </Badge>
              </h2>
              <p className="text-[11px] sm:text-xs text-muted-foreground truncate mt-0.5">
                Requirement-aware · infers fields · validates business rules · enterprise coverage
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {result && (
              <Badge variant="outline" className="text-xs hidden md:inline-flex border-emerald-500/40 bg-emerald-500/10 text-foreground">
                {result.ai_summary.fields_identified} fields · {result.ai_summary.datasets_generated} datasets
              </Badge>
            )}
            <Button
              variant="outline" size="sm"
              onClick={() => { reset(); setQuery(""); }}
              className="bg-white/60 dark:bg-white/5 backdrop-blur-md border-white/20"
            >
              <RotateCcw className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline font-medium">Reset</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Body */}
      <ScrollArea className="flex-1">
        <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4">
          {/* Input panel */}
          <Card className="p-4 sm:p-5 bg-white/60 dark:bg-white/[0.04] backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-xl shadow-indigo-500/5 rounded-2xl">
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
                placeholder='e.g. "I need 5 types of login with different country"'
                className="min-h-[88px]"
              />
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Switch id="td-fields" checked={useFields} onCheckedChange={setUseFields} />
                <Label htmlFor="td-fields" className="cursor-pointer">Specify form fields manually</Label>
              </div>
              <Button
                onClick={handleGenerate}
                disabled={!canSubmit}
                className="bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-500 text-white shadow-lg shadow-fuchsia-500/30 hover:opacity-95"
              >
                {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                {isLoading ? "Analyzing requirements…" : "Generate Test Data"}
              </Button>
            </div>

            {useFields && (
              <div className="mt-4 rounded-xl border border-white/20 dark:border-white/10 bg-white/40 dark:bg-white/[0.03] backdrop-blur-md p-3 space-y-2">
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

          {!result && !isLoading && (
            <Card className="p-4 bg-white/50 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl">
              <div className="flex items-start gap-3">
                <Info className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="text-foreground font-medium">How the QA Intelligence Engine works</p>
                  <p>1. Reads your <strong>Workspace</strong> (user stories, BRD/PRD, knowledge hub) before generating.</p>
                  <p>2. <strong>Infers fields</strong> you didn't mention — e.g. "Login" → Email, Password, OTP, Country, Phone.</p>
                  <p>3. Identifies <strong>business + validation rules</strong>, generates security payloads, and scores coverage and confidence.</p>
                </div>
              </div>
            </Card>
          )}

          {/* Result */}
          {result && (
            <>
              {/* AI Summary header */}
              <AiSummaryHeader result={result} onGenerateMore={handleGenerateMore} />

              {/* Coverage + Confidence */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <CoverageCard coverage={result.coverage} />
                <ConfidenceCard score={result.confidence?.score ?? result.ai_summary.confidence} reasons={result.confidence?.reasons || []} />
                <ContextCard result={result} />
              </div>

              {/* Insights + Recommendations */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <InsightsPanel insights={result.insights} />
                <RecommendationsPanel
                  recommendations={result.recommendations}
                  suggested={result.insights?.suggested_fields || []}
                  onGenerateMore={handleGenerateMore}
                  screen={result.screen_name}
                />
              </div>

              {/* Datasets */}
              <Card className="p-4 sm:p-5 bg-white/60 dark:bg-white/[0.04] backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-xl rounded-2xl space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <ListChecks className="h-5 w-5 text-fuchsia-500" />
                      Generated Test Data
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Color-coded by category · grouped per field
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="bg-white/70 dark:bg-white/[0.05] backdrop-blur"><Download className="h-4 w-4 mr-2" />Export</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={exportExcel}><FileSpreadsheet className="h-4 w-4 mr-2" />Excel (.xlsx)</DropdownMenuItem>
                      <DropdownMenuItem onClick={exportCSV}><FileSpreadsheet className="h-4 w-4 mr-2" />CSV</DropdownMenuItem>
                      <DropdownMenuItem onClick={exportJSON}><FileJson className="h-4 w-4 mr-2" />JSON</DropdownMenuItem>
                      <DropdownMenuItem onClick={exportMarkdown}><FileCode2 className="h-4 w-4 mr-2" />Markdown (.md)</DropdownMenuItem>
                      <DropdownMenuItem onClick={exportPDF}><FileText className="h-4 w-4 mr-2" />PDF (print)</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <Tabs defaultValue="table" className="w-full">
                  <TabsList className="bg-white/60 dark:bg-white/[0.05] backdrop-blur-md">
                    <TabsTrigger value="table">Test Data Table</TabsTrigger>
                    <TabsTrigger value="fields">By Field ({result.fields.length})</TabsTrigger>
                  </TabsList>

                  <TabsContent value="table" className="mt-3">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <FilterChip label="All" active={filter === "all"} onClick={() => setFilter("all")} />
                      {(Object.keys(CATEGORY_META) as TDCategory[]).map(c => (
                        <FilterChip key={c} label={CATEGORY_META[c].label} active={filter === c}
                          onClick={() => setFilter(filter === c ? "all" : c)} cls={CATEGORY_META[c].cls} />
                      ))}
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-white/20 dark:border-white/10 bg-white/40 dark:bg-white/[0.02] backdrop-blur-md">
                      <table className="w-full text-sm">
                        <thead className="bg-gradient-to-r from-indigo-500/10 via-fuchsia-500/10 to-cyan-500/10 text-xs uppercase tracking-wide text-muted-foreground">
                          <tr>
                            <Th>Field</Th><Th>Validation</Th><Th>Category</Th><Th>Testing Type</Th>
                            <Th>Value</Th><Th>Expected Result</Th><Th>Why</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.fields.flatMap(f => f.datasets
                            .filter(d => filter === "all" || d.category === filter)
                            .map((d, i) => (
                            <tr key={`${f.name}-${i}`} className="border-t border-white/10 hover:bg-fuchsia-500/5 transition-colors">
                              <Td className="font-medium">{f.name}{f.mandatory && <span className="text-rose-500 ml-0.5">*</span>}</Td>
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
                      <Card key={f.name} className="p-4 bg-white/50 dark:bg-white/[0.03] border border-white/20 dark:border-white/10 backdrop-blur-md rounded-2xl">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div>
                            <h4 className="font-semibold">{f.name}{f.mandatory && <span className="text-rose-500 ml-0.5">*</span>}</h4>
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
                </Tabs>

                {result.notes && (
                  <p className="text-xs text-muted-foreground border-t border-white/10 pt-3">
                    <strong>AI notes:</strong> {result.notes}
                  </p>
                )}
              </Card>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

/* ============== Subcomponents ============== */

function AiSummaryHeader({ result, onGenerateMore }: { result: TDResult; onGenerateMore: () => void }) {
  const s = result.ai_summary;
  const riskColor = s.risk_level === "Low" ? "from-emerald-500 to-green-500"
    : s.risk_level === "Medium" ? "from-amber-500 to-orange-500" : "from-rose-500 to-red-500";
  return (
    <Card className="p-4 sm:p-5 bg-gradient-to-br from-indigo-500/10 via-fuchsia-500/10 to-cyan-500/10 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-xl rounded-2xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">AI Summary</p>
          <h3 className="text-xl font-bold">
            {result.module_name || "Module"} · <span className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 dark:from-indigo-300 dark:to-fuchsia-300 bg-clip-text text-transparent">{result.screen_name || "Screen"}</span>
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{result.context_summary}</p>
        </div>
        <Badge className={`bg-gradient-to-r ${riskColor} text-white border-0 shadow`}>
          Risk: {s.risk_level}
        </Badge>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
        <StatTile icon={<ListChecks className="h-4 w-4" />} label="Fields Identified" value={s.fields_identified} color="from-indigo-500 to-blue-500" />
        <StatTile icon={<Database className="h-4 w-4" />} label="Datasets" value={s.datasets_generated} color="from-fuchsia-500 to-pink-500" />
        <StatTile icon={<Target className="h-4 w-4" />} label="Coverage" value={`${s.coverage_overall}%`} color="from-emerald-500 to-green-500" />
        <StatTile icon={<Brain className="h-4 w-4" />} label="Confidence" value={`${s.confidence}%`} color="from-cyan-500 to-sky-500" />
        <StatTile icon={<ShieldCheck className="h-4 w-4" />} label="Context" value={result.context_used ? "Project" : "Generic"} color="from-purple-500 to-fuchsia-500" />
      </div>
      {(result.insights?.suggested_fields?.length || 0) > 0 && (
        <div className="mt-4 flex items-center justify-between gap-3 flex-wrap rounded-xl bg-white/40 dark:bg-white/[0.03] border border-white/20 dark:border-white/10 px-3 py-2">
          <div className="text-xs text-muted-foreground">
            <Lightbulb className="inline h-3.5 w-3.5 text-amber-500 mr-1" />
            Suggested additional fields: <span className="text-foreground">{result.insights.suggested_fields.join(", ")}</span>
          </div>
          <Button size="sm" onClick={onGenerateMore} className="bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white">
            Generate More
          </Button>
        </div>
      )}
    </Card>
  );
}

function StatTile({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: React.ReactNode; color: string }) {
  return (
    <div className="rounded-2xl p-3 bg-white/60 dark:bg-white/[0.04] backdrop-blur-md border border-white/20 dark:border-white/10 shadow-sm">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
        <div className={`h-6 w-6 rounded-lg bg-gradient-to-br ${color} text-white grid place-items-center shadow`}>{icon}</div>
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1.5 text-xl font-bold">{value}</div>
    </div>
  );
}

function CoverageCard({ coverage }: { coverage: TDResult["coverage"] }) {
  const items: Array<{ label: string; val: number; color: string }> = [
    { label: "Functional",  val: coverage.functional,   color: "from-indigo-500 to-blue-500" },
    { label: "Validation",  val: coverage.validation,   color: "from-fuchsia-500 to-pink-500" },
    { label: "Boundary",    val: coverage.boundary,     color: "from-orange-500 to-amber-500" },
    { label: "Security",    val: coverage.security,     color: "from-purple-500 to-fuchsia-500" },
    { label: "Data Quality",val: coverage.data_quality, color: "from-emerald-500 to-green-500" },
  ];
  return (
    <Card className="p-4 bg-white/60 dark:bg-white/[0.04] backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl shadow">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold flex items-center gap-2"><Target className="h-4 w-4 text-emerald-500" />Coverage Analysis</h4>
        <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white border-0">{coverage.overall}%</Badge>
      </div>
      <div className="space-y-2.5">
        {items.map(it => (
          <div key={it.label}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">{it.label}</span>
              <span className="font-medium">{it.val}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/40 dark:bg-white/10 overflow-hidden">
              <div className={`h-full bg-gradient-to-r ${it.color} transition-all`} style={{ width: `${Math.max(0, Math.min(100, it.val))}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ConfidenceCard({ score, reasons }: { score: number; reasons: string[] }) {
  return (
    <Card className="p-4 bg-white/60 dark:bg-white/[0.04] backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl shadow">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold flex items-center gap-2"><Brain className="h-4 w-4 text-cyan-500" />AI Confidence</h4>
        <Badge className="bg-gradient-to-r from-cyan-500 to-sky-500 text-white border-0">{score}%</Badge>
      </div>
      <Progress value={score} className="h-2" />
      <div className="mt-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground mb-1">Based on:</p>
        <ul className="space-y-1">
          {(reasons.length ? reasons : ["Module / Screen heuristics"]).map((r, i) => (
            <li key={i} className="flex items-start gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" /><span>{r}</span></li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

function ContextCard({ result }: { result: TDResult }) {
  return (
    <Card className="p-4 bg-white/60 dark:bg-white/[0.04] backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl shadow">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-fuchsia-500" />Context</h4>
        <Badge variant="outline" className={result.context_used
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"}>
          {result.context_used ? "Project-aware" : "Generic"}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{result.context_summary}</p>
      {result.insights?.fields_identified?.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Inferred Fields</p>
          <div className="flex flex-wrap gap-1">
            {result.insights.fields_identified.slice(0, 12).map(f => (
              <Badge key={f} variant="outline" className="text-[10px] bg-indigo-500/10 border-indigo-500/30 text-indigo-700 dark:text-indigo-300">{f}</Badge>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function InsightsPanel({ insights }: { insights: TDResult["insights"] }) {
  const sections: Array<{ label: string; items: string[]; icon: React.ReactNode; color: string }> = [
    { label: "Business Rules",        items: insights?.business_rules || [],        icon: <ShieldCheck className="h-4 w-4" />, color: "from-purple-500 to-fuchsia-500" },
    { label: "Validation Rules",      items: insights?.validation_rules || [],      icon: <CheckCircle2 className="h-4 w-4" />, color: "from-emerald-500 to-green-500" },
    { label: "Missing Requirements",  items: insights?.missing_requirements || [],  icon: <AlertTriangle className="h-4 w-4" />, color: "from-amber-500 to-orange-500" },
  ];
  return (
    <Card className="p-4 bg-white/60 dark:bg-white/[0.04] backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl shadow">
      <h4 className="font-semibold flex items-center gap-2 mb-3"><Brain className="h-4 w-4 text-indigo-500" />AI Insights</h4>
      <div className="space-y-3">
        {sections.map(sec => (
          <div key={sec.label}>
            <div className="flex items-center gap-2 text-xs font-medium mb-1.5">
              <span className={`h-5 w-5 rounded-md bg-gradient-to-br ${sec.color} text-white grid place-items-center`}>{sec.icon}</span>
              {sec.label}
              <span className="text-muted-foreground">({sec.items.length})</span>
            </div>
            {sec.items.length === 0 ? (
              <p className="text-xs text-muted-foreground pl-7">—</p>
            ) : (
              <ul className="text-xs space-y-1 pl-7 list-disc marker:text-muted-foreground">
                {sec.items.map((it, i) => <li key={i}>{it}</li>)}
              </ul>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

function RecommendationsPanel({ recommendations, suggested, onGenerateMore, screen }: {
  recommendations: string[]; suggested: string[]; onGenerateMore: () => void; screen: string;
}) {
  return (
    <Card className="p-4 bg-gradient-to-br from-amber-500/[0.08] via-fuchsia-500/[0.06] to-indigo-500/[0.08] backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl shadow">
      <h4 className="font-semibold flex items-center gap-2 mb-3"><Lightbulb className="h-4 w-4 text-amber-500" />Smart Recommendations</h4>
      {suggested.length > 0 && (
        <div className="rounded-xl p-3 bg-white/50 dark:bg-white/[0.04] border border-white/20 dark:border-white/10 mb-3">
          <p className="text-xs">Detected <strong>{screen || "screen"}</strong>. Recommended additional fields:</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {suggested.map(f => (
              <Badge key={f} className="bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white border-0 text-[10px]">{f}</Badge>
            ))}
          </div>
          <Button size="sm" onClick={onGenerateMore} className="mt-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
            Generate additional data
          </Button>
        </div>
      )}
      {recommendations.length === 0 && suggested.length === 0 ? (
        <p className="text-xs text-muted-foreground">No additional recommendations — coverage looks complete.</p>
      ) : (
        <ul className="text-xs space-y-1.5">
          {recommendations.map((r, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-fuchsia-500 mt-0.5 shrink-0" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ============== Helpers ============== */

function FilterChip({ label, active, onClick, cls }: { label: string; active: boolean; onClick: () => void; cls?: string }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-2.5 py-1 rounded-full border transition ${active ? (cls || "bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white border-transparent") : "bg-white/40 dark:bg-white/[0.04] border-white/20 dark:border-white/10 text-muted-foreground hover:text-foreground"}`}
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
function renderMarkdown(r: TDResult): string {
  const lines: string[] = [];
  lines.push(`# ${r.module_name || "Module"} — ${r.screen_name || "Screen"}`);
  lines.push("");
  lines.push(`> ${r.context_summary}`);
  lines.push("");
  lines.push(`**Fields:** ${r.ai_summary.fields_identified} · **Datasets:** ${r.ai_summary.datasets_generated} · **Coverage:** ${r.ai_summary.coverage_overall}% · **Confidence:** ${r.ai_summary.confidence}% · **Risk:** ${r.ai_summary.risk_level}`);
  lines.push("");
  if (r.insights?.business_rules?.length) {
    lines.push("## Business Rules");
    r.insights.business_rules.forEach(b => lines.push(`- ${b}`));
    lines.push("");
  }
  for (const f of r.fields) {
    lines.push(`## ${f.name}${f.mandatory ? " *" : ""}`);
    lines.push(`- **Validation:** ${f.validation}`);
    lines.push(`- **Objective:** ${f.testing_objective}`);
    lines.push("");
    lines.push("| Category | Type | Value | Expected | Why |");
    lines.push("|---|---|---|---|---|");
    for (const d of f.datasets) {
      lines.push(`| ${d.category} | ${d.testing_type} | \`${(d.value || "").replace(/\|/g, "\\|")}\` | ${d.expected_result.replace(/\|/g, "\\|")} | ${d.reasoning.replace(/\|/g, "\\|")} |`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
function renderPdfHtml(r: TDResult) {
  const rows = flattenRows(r.fields).map(row => `
    <tr>${["Field","Validation","Category","TestingType","Value","ExpectedResult","Reasoning"].map(k => `<td>${escapeHtml(String((row as any)[k] ?? ""))}</td>`).join("")}</tr>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"/><title>Test Data — ${escapeHtml(r.screen_name || "")}</title>
    <style>body{font-family:system-ui,sans-serif;padding:24px;color:#111}h1{margin:0 0 4px}p{color:#555;margin:0 0 16px}
    .kpi{display:flex;gap:12px;margin:0 0 16px;flex-wrap:wrap}.kpi span{background:#eef2ff;padding:6px 10px;border-radius:8px;font-size:12px}
    table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ddd;padding:6px;text-align:left;vertical-align:top}
    th{background:#f3f4f6}</style></head><body>
    <h1>${escapeHtml(r.module_name || "")} — ${escapeHtml(r.screen_name || "")}</h1>
    <p>${escapeHtml(r.context_summary || "")}</p>
    <div class="kpi">
      <span>Fields: ${r.ai_summary.fields_identified}</span>
      <span>Datasets: ${r.ai_summary.datasets_generated}</span>
      <span>Coverage: ${r.ai_summary.coverage_overall}%</span>
      <span>Confidence: ${r.ai_summary.confidence}%</span>
      <span>Risk: ${escapeHtml(r.ai_summary.risk_level)}</span>
    </div>
    <table><thead><tr><th>Field</th><th>Validation</th><th>Category</th><th>Testing Type</th><th>Value</th><th>Expected Result</th><th>Reasoning</th></tr></thead>
    <tbody>${rows}</tbody></table></body></html>`;
}
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

export default TestDataGeneratorModule;
