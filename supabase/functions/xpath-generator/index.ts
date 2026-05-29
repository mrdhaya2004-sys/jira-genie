import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveCustomConfig, routeAIRequest } from "../_shared/hiveMindRouter.ts";
import {
  analyzeCatalog,
  buildElementAnalyses,
  parseQuery,
  selectCandidates,
  type Platform,
  type ElementAnalysis,
} from "../_shared/domAnalyzer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorPayload(code: string, message: string, status = 200) {
  return json({ error_code: code, message }, status);
}

interface AIRanking {
  id: number;
  reasoning?: string;
  confidence?: number;
}

async function rankWithAI(
  authHeader: string,
  query: string,
  platform: Platform,
  elements: ElementAnalysis[],
): Promise<Map<number, AIRanking>> {
  if (elements.length === 0) return new Map();

  const compact = elements.map((e) => ({
    id: e.id,
    screen: e.screen,
    name: e.element_name,
    type: e.element_type,
    tag: e.tag,
    attrs: e.attributes_summary,
    primary: e.locators.primary_xpath,
    base_confidence: e.confidence,
  }));

  const system = `You are an expert mobile/web test-automation locator analyst. You receive a JSON array of element candidates already filtered from a large DOM. Your ONLY job is to rank them for the user query, refine confidence scores (0-100), and add a one-sentence "reasoning" explaining why each locator is or isn't ideal. DO NOT invent new locators. Respond with a JSON array of objects: [{"id": number, "confidence": number, "reasoning": string}]. Return ONLY the JSON array, no prose, no code fences.`;

  const user = `Platform: ${platform}\nUser query: ${query}\n\nCandidates:\n${JSON.stringify(compact)}`;

  try {
    const resp = await routeAIRequest(
      authHeader,
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      false,
    );

    if (!resp.ok) {
      console.warn("xpath-generator: AI ranking failed", resp.status);
      return new Map();
    }

    const data = await resp.json().catch(() => null);
    // routeAIRequest returns upstream non-stream body when stream=false
    let text: string =
      data?.choices?.[0]?.message?.content ||
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || "").join("") ||
      "";

    if (!text) {
      // routeAIRequest may have already normalized to SSE on non-ok; safety net
      return new Map();
    }

    text = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start < 0 || end < 0) return new Map();
    const parsed = JSON.parse(text.slice(start, end + 1));
    const map = new Map<number, AIRanking>();
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (typeof item?.id === "number") {
          map.set(item.id, {
            id: item.id,
            reasoning: typeof item.reasoning === "string" ? item.reasoning : undefined,
            confidence: typeof item.confidence === "number" ? Math.max(0, Math.min(100, item.confidence)) : undefined,
          });
        }
      }
    }
    return map;
  } catch (e) {
    console.warn("xpath-generator: AI ranking exception", e);
    return new Map();
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization header" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Invalid token" }, 401);

    const body = await req.json();
    const {
      workspaceId,
      module: appModule,
      platform,
      query,
      context,
    }: {
      workspaceId: string;
      module: string;
      platform: Platform;
      query: string;
      context: { domSnapshot?: string | null; environment?: string };
    } = body;

    console.log("xpath-generator request:", { workspaceId, appModule, platform, env: context?.environment });

    const { data: workspace } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", workspaceId)
      .eq("owner_id", user.id)
      .single();
    if (!workspace) return json({ error: "Workspace not found or access denied" }, 403);

    const dom = context?.domSnapshot;
    if (!dom || !dom.trim()) {
      return errorPayload(
        "DOM_NOT_LOADED",
        "No DOM snapshot is available for the selected environment & platform.",
      );
    }
    if (dom.length > 4_000_000) {
      return errorPayload("UNSUPPORTED_FORMAT", "DOM snapshot exceeds 4MB processing limit.");
    }

    let catalog;
    try {
      catalog = analyzeCatalog(dom, platform);
    } catch (e) {
      console.error("xpath-generator: parse failure", e);
      return errorPayload("INVALID_APP_SOURCE", "The DOM/app source could not be parsed.");
    }

    if (catalog.totalNodes === 0) {
      return errorPayload("INVALID_APP_SOURCE", "The DOM parser found no elements.");
    }

    const filter = parseQuery(query);
    const candidateNodes = selectCandidates(catalog.nodes, filter, filter.wantsAll ? 24 : 8);

    if (candidateNodes.length === 0) {
      return json({
        elements: [],
        risks: catalog.risks,
        screens: catalog.screens,
        totalNodes: catalog.totalNodes,
        error_code: "ELEMENT_NOT_FOUND",
        message: `No elements matching "${query}" were found across ${catalog.totalNodes} parsed nodes.`,
      });
    }

    const elements = buildElementAnalyses(catalog, candidateNodes);

    // Ask AI to refine ranking + reasoning (best-effort; deterministic locators stand on their own)
    let ranking = new Map<number, AIRanking>();
    try {
      ranking = await rankWithAI(authHeader, query, platform, elements);
    } catch (e) {
      console.warn("xpath-generator: ranking skipped", e);
    }

    const enriched = elements.map((el) => {
      const r = ranking.get(el.id);
      return {
        ...el,
        confidence: r?.confidence ?? el.confidence,
        reasoning: r?.reasoning || el.reasoning,
      };
    }).sort((a, b) => b.confidence - a.confidence);

    return json({
      elements: enriched,
      risks: catalog.risks,
      screens: catalog.screens,
      totalNodes: catalog.totalNodes,
      module: appModule,
      platform,
    });
  } catch (error) {
    console.error("xpath-generator error:", error);
    return errorPayload(
      "AI_PROVIDER_ERROR",
      error instanceof Error ? error.message : "Unknown error",
      500,
    );
  }
});
