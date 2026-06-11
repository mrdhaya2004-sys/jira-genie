import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { AnalysisResult } from '@/types/codeAnalyzer';

export interface AnalyzeInput {
  sourceType: 'snippet' | 'files' | 'github' | 'gitlab';
  sourceLabel?: string;
  language?: string;
  framework?: string;
  code?: string;
  files?: { path: string; content: string }[];
  repoUrl?: string;
  branch?: string;
  githubToken?: string;

  gitlabToken?: string;
  /** 0-100 — findings below this confidence are filtered server-side (default 80) */
  confidenceThreshold?: number;
}


export function useCodeAnalyzer() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const analyze = useCallback(async (input: AnalyzeInput) => {
    setIsAnalyzing(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('hive-code-analyzer', { body: input });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult({ ...data.analysis, analysisId: data.analysisId } as AnalysisResult);
      toast({ title: 'Analysis complete', description: `Overall score: ${data.analysis.overallScore}/100` });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Analysis failed';
      toast({ title: 'Analysis failed', description: message, variant: 'destructive' });
    } finally {
      setIsAnalyzing(false);
    }
  }, [toast]);

  const reset = useCallback(() => setResult(null), []);

  return { result, isAnalyzing, analyze, reset };
}
