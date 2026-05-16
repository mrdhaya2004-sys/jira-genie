import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { parseReportFiles } from '@/lib/reportParser';
import type {
  DefectChatMessage,
  DefectFlowPhase,
  ExecutionOS,
  DefectAnalysisResult,
  ReportFileSummary,
} from '@/types/defectAnalyzer';
import { EXECUTION_OS_OPTIONS } from '@/types/defectAnalyzer';
import type { Workspace } from '@/types/workspace';

interface UseDefectAnalyzerOptions {
  workspaces: Workspace[];
  isLoadingWorkspaces?: boolean;
}

export const useDefectAnalyzer = ({ workspaces, isLoadingWorkspaces = false }: UseDefectAnalyzerOptions) => {
  const [messages, setMessages] = useState<DefectChatMessage[]>([]);
  const [phase, setPhase] = useState<DefectFlowPhase>('workspace_selection');
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [reportDigest, setReportDigest] = useState<string>('');
  const [reportSummaries, setReportSummaries] = useState<ReportFileSummary[]>([]);
  const [parseMetrics, setParseMetrics] = useState<{ parsingCompletion: number; logCoverage: number; rawBytes: number; digestBytes: number; failureLinesCaptured: number } | null>(null);
  const [selectedOs, setSelectedOs] = useState<ExecutionOS | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<DefectAnalysisResult | null>(null);
  const { toast } = useToast();

  const addMessage = useCallback((m: Omit<DefectChatMessage, 'id' | 'timestamp'>) => {
    const msg: DefectChatMessage = { ...m, id: crypto.randomUUID(), timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, msg]);
    return msg;
  }, []);

  // Initial greeting
  useEffect(() => {
    if (isLoadingWorkspaces) return;
    if (messages.length > 0) return;

    if (workspaces.length === 0) {
      addMessage({
        role: 'assistant',
        content:
          "Hi! 🛡️ I'm your **AI Defect Analyzer**. I dissect automation execution reports and surface failure root causes, flaky tests, and XPath fixes.\n\n⚠️ **No workspaces found.** Create one in **Hive AI – Core Workspace** to get started.",
        type: 'text',
      });
      return;
    }

    addMessage({
      role: 'assistant',
      content:
        "Hi! 🛡️ I'm your **AI Defect Analyzer**. Upload an automation execution report and I'll analyze failures, root causes, flaky tests and XPath issues.\n\n**Pick a Hive Mind workspace to start:**",
      type: 'workspace_select',
      options: workspaces.map((w) => ({ id: w.id, label: w.name, value: w.id, description: w.description || undefined })),
    });
  }, [workspaces, isLoadingWorkspaces, messages.length, addMessage]);

  const handleWorkspaceSelect = useCallback(
    (id: string, name: string) => {
      const ws = workspaces.find((w) => w.id === id);
      if (!ws) return;
      setSelectedWorkspace(ws);
      addMessage({ role: 'user', content: `Selected workspace: **${name}**`, type: 'text' });
      setPhase('report_upload');
      setTimeout(() => {
        addMessage({
          role: 'assistant',
          content:
            "Workspace locked in. 📁\n\n**Upload your automation execution report.**\nSupported: `.html`, `.json`, `.log`, `.txt`, `.xml`, `.zip` (folder).\n\nDrag & drop multiple files in the panel below.",
          type: 'text',
        });
      }, 300);
    },
    [workspaces, addMessage],
  );

  const [isParsing, setIsParsing] = useState(false);

  const handleFilesAccepted = useCallback(
    async (
      files: File[],
      setProgress?: (cb: (items: any[]) => any[]) => void,
    ) => {
      const totalMb = files.reduce((s, f) => s + f.size, 0) / (1024 * 1024);
      const isHuge = totalMb > 50;
      const started: Record<string, number> = {};
      try {
        setIsParsing(true);
        if (isHuge) {
          toast({
            title: 'Large report detected',
            description: `Parsing ${totalMb.toFixed(1)}MB — extracting failure-relevant sections...`,
          });
        }

        // Mark all as uploading at 0%
        setProgress?.((items) =>
          items.map((it) => {
            if (files.some((f) => f === it.file)) {
              started[it.id] = performance.now();
              return { ...it, state: 'uploading', uploadedBytes: 0, errorMessage: undefined };
            }
            return it;
          }),
        );

        const { digest, summaries, metrics } = await parseReportFiles(files, ({ fileName, fileBytes, fileTotal }) => {
          setProgress?.((items) =>
            items.map((it) => {
              if (it.file.name !== fileName) return it;
              const startedAt = started[it.id] || performance.now();
              const elapsed = Math.max(0.001, (performance.now() - startedAt) / 1000);
              const speed = fileBytes / elapsed;
              const remaining = Math.max(0, fileTotal - fileBytes);
              const eta = speed > 0 ? remaining / speed : 0;
              const done = fileBytes >= fileTotal;
              return {
                ...it,
                state: done ? 'processing' : 'uploading',
                uploadedBytes: fileBytes,
                totalBytes: fileTotal,
                speedBps: speed,
                etaSeconds: eta,
              };
            }),
          );
        });
        setParseMetrics(metrics);

        // Mark all as completed
        setProgress?.((items) =>
          items.map((it) =>
            files.some((f) => f === it.file)
              ? { ...it, state: 'completed', uploadedBytes: it.totalBytes, etaSeconds: 0 }
              : it,
          ),
        );

        if (!digest.trim()) {
          toast({
            title: 'No readable content',
            description: 'These files contain no text the analyzer can read.',
            variant: 'destructive',
          });
          return;
        }
        setReportDigest(digest);
        setReportSummaries(summaries);
        addMessage({
          role: 'user',
          content: `Uploaded **${summaries.length}** report file${summaries.length > 1 ? 's' : ''}${
            isHuge ? ` (${totalMb.toFixed(1)}MB — smart-extracted)` : ''
          }.`,
          type: 'report_uploaded',
          reportSummary: summaries,
        });
        setPhase('os_selection');
        setTimeout(() => {
          addMessage({
            role: 'assistant',
            content: 'Got it. ✅\n\n**Which execution OS produced this report?**',
            type: 'os_select',
            options: EXECUTION_OS_OPTIONS,
          });
        }, 300);
      } catch (e) {
        console.error(e);
        setProgress?.((items) =>
          items.map((it) =>
            files.some((f) => f === it.file) && it.state !== 'completed'
              ? { ...it, state: 'failed', errorMessage: e instanceof Error ? e.message : 'Parse failed' }
              : it,
          ),
        );
        toast({
          title: 'Could not read report',
          description:
            e instanceof Error
              ? `${e.message}. For files > 500MB, try splitting them or uploading only the failure logs.`
              : 'Unknown parse error',
          variant: 'destructive',
        });
        throw e;
      } finally {
        setIsParsing(false);
      }
    },
    [addMessage, toast],
  );

  const handleOsSelect = useCallback(
    (os: ExecutionOS) => {
      setSelectedOs(os);
      const opt = EXECUTION_OS_OPTIONS.find((o) => o.value === os);
      addMessage({ role: 'user', content: `Execution OS: **${opt?.icon} ${opt?.label}**`, type: 'text' });
      setPhase('ready');
      setTimeout(() => {
        addMessage({
          role: 'assistant',
          content:
            "All set. 🚀 Click **Execute & Analyze** below and I'll start dissecting the report — failures, root causes, XPath fixes, stability score and recommendations.",
          type: 'text',
        });
      }, 300);
    },
    [addMessage],
  );

  const executeAnalysis = useCallback(async () => {
    if (!selectedWorkspace || !selectedOs || !reportDigest) {
      toast({ title: 'Missing setup', description: 'Workspace, report and OS are required.', variant: 'destructive' });
      return;
    }
    setPhase('analyzing');
    setIsAnalyzing(true);
    addMessage({ role: 'user', content: '⚡ **Execute & Analyze**', type: 'text' });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Please log in again.');

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/defect-analyzer`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            workspaceId: selectedWorkspace.id,
            workspaceName: selectedWorkspace.name,
            os: selectedOs,
            reportSummaries,
            reportDigest,
            parseMetrics,
          }),
        },
      );

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data?.error || 'Analysis failed');
      }
      const result = data.analysis as DefectAnalysisResult;
      setAnalysis(result);
      addMessage({
        role: 'assistant',
        content: result.summary || 'Analysis complete.',
        type: 'analysis_result',
        analysis: result,
      });
      setPhase('results');
    } catch (e) {
      console.error(e);
      toast({
        title: 'Analysis failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
      addMessage({
        role: 'assistant',
        content:
          "❌ I couldn't analyze that report.\n\n**Recovery suggestions:**\n• Try uploading a smaller portion of the report\n• Paste the raw failure log as a `.txt` file\n• Make sure the file is text-based (not a screenshot)",
        type: 'text',
      });
      setPhase('ready');
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedWorkspace, selectedOs, reportDigest, reportSummaries, parseMetrics, addMessage, toast]);

  const resetFlow = useCallback(() => {
    setMessages([]);
    setPhase('workspace_selection');
    setSelectedWorkspace(null);
    setReportDigest('');
    setReportSummaries([]);
    setParseMetrics(null);
    setSelectedOs(null);
    setAnalysis(null);
  }, []);

  return {
    messages,
    phase,
    selectedWorkspace,
    selectedOs,
    reportSummaries,
    isAnalyzing,
    isParsing,
    analysis,
    handleWorkspaceSelect,
    handleFilesAccepted,
    handleOsSelect,
    executeAnalysis,
    resetFlow,
  };
};
