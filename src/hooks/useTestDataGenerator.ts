import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type TDCategory =
  | "positive" | "negative" | "boundary" | "edge"
  | "invalid_format" | "security" | "special_character" | "null_empty";

export type TDTestingType =
  | "functional" | "validation" | "boundary" | "negative" | "security" | "exploratory";

export interface TDDataset {
  category: TDCategory;
  testing_type: TDTestingType;
  value: string;
  expected_result: string;
  reasoning: string;
}

export interface TDField {
  name: string;
  validation: string;
  mandatory: boolean;
  input_type: string;
  data_format: string;
  testing_objective: string;
  expected_behavior: string;
  datasets: TDDataset[];
}

export interface TDResult {
  context_used: boolean;
  context_summary: string;
  module_name: string;
  screen_name: string;
  fields: TDField[];
  notes?: string;
}

export interface TDInputField {
  name: string;
  type?: string;
  validation?: string;
  mandatory?: boolean;
}

export interface TDGenerateArgs {
  workspaceId?: string | null;
  query: string;
  screenName?: string;
  moduleName?: string;
  fields?: TDInputField[];
}

export function useTestDataGenerator() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TDResult | null>(null);
  const [lastArgs, setLastArgs] = useState<TDGenerateArgs | null>(null);

  const fetchWorkspaceBrain = useCallback(async (workspaceId: string): Promise<string> => {
    const { data, error } = await supabase
      .from("workspace_files")
      .select("file_name, file_type, content_extracted, metadata")
      .eq("workspace_id", workspaceId);
    if (error || !data) return "";
    const parts: string[] = [];
    for (const f of data) {
      const ex = typeof f.content_extracted === "string" ? f.content_extracted.trim() : "";
      if (ex) parts.push(`### ${String(f.file_type || "DOC").toUpperCase()} — ${f.file_name}\n${ex}`);
      else if (f.metadata && typeof f.metadata === "object" && Object.keys(f.metadata).length) {
        parts.push(`### METADATA — ${f.file_name}\n${JSON.stringify(f.metadata).slice(0, 2000)}`);
      }
    }
    return parts.join("\n\n").slice(0, 14000);
  }, []);

  const generate = useCallback(async (args: TDGenerateArgs) => {
    setIsLoading(true);
    setLastArgs(args);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Please sign in to generate test data.");

      const workspaceBrain = args.workspaceId ? await fetchWorkspaceBrain(args.workspaceId) : "";

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-data-generator`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            workspaceId: args.workspaceId || null,
            query: args.query,
            screenName: args.screenName,
            moduleName: args.moduleName,
            fields: args.fields,
            context: { workspaceBrain },
          }),
        },
      );

      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const msg = json?.error || json?.message || `Request failed (${resp.status})`;
        throw new Error(msg);
      }
      if (!json?.result) throw new Error("AI returned an empty result.");
      setResult(json.result as TDResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate test data";
      toast({ title: "Test Data Generator", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [fetchWorkspaceBrain, toast]);

  const reset = useCallback(() => {
    setResult(null);
    setLastArgs(null);
  }, []);

  return { generate, reset, isLoading, result, lastArgs };
}
