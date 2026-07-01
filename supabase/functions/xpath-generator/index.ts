import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { routeAIRequest } from "../_shared/hiveMindRouter.ts";
import {
  analyzeCatalog,
  buildAppTree,
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

function extractAIText(data: any): string {
  return data?.choices?.[0]?.message?.content ||
    data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || "").join("") ||
    data?.content?.map?.((p: any) => p?.text || "").join("") ||
    data?.text ||
    "";
}

function stripFence(text: string, lang = "html"): string {
  return (text || "").trim().replace(new RegExp(`^\\`\\`\\`(?:${lang})?`, "i"), "").replace(/```$/, "").trim();
}

async function reconstructDomFromScreenshots(
  authHeader: string,
  platform: Platform,
  appModule: string,
  query: string,
  screenshots: { name: string; dataUrl: string }[],
): Promise<string | null> {
  const messages = [
    {
      role: "system",
      content:
        "You are a UI-to-HTML reconstruction engine. Given one or more UI screenshots, output ONLY a plausible semantic HTML skeleton that mirrors the visible interactive elements. " +
        "Use realistic id/data-testid/aria-label/name attributes derived from visible text. Include every visible button, link, input, dropdown, checkbox, radio, tab, and label. " +
        "Wrap each screen in <section data-screen=\"<screen name>\">. Output ONLY the raw HTML — no markdown, no commentary, no code fences.",
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `Target platform: ${platform}. Module: ${appModule}. User query: ${query}. Produce a complete HTML skeleton I can parse to generate locators.`,
        },
        ...screenshots.slice(0, 4).map((s) => ({
          type: "image_url",
          image_url: { url: s.dataUrl },
        })),
      ],
    },
  ];

  const routed = await routeAIRequest(authHeader, messages, false, { defaultModel: "google/gemini-3-flash-preview" });
  if (routed.ok) {
    const data = await routed.json().catch(() => null);
    const text = stripFence(extractAIText(data));
    if (text && text.includes("<")) return text;
  } else {
    console.warn("xpath-generator: routed screenshot reconstruction failed", routed.status);
  }

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableKey) return null;

  const fallback = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": lovableKey,
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages,
      stream: false,
    }),
  });
  if (!fallback.ok) {
    console.warn("xpath-generator: Lovable screenshot reconstruction failed", fallback.status);
    return null;
  }
  const data = await fallback.json().catch(() => null);
  const text = stripFence(extractAIText(data));
  return text && text.includes("<") ? text : null;
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

  const system = `You are the TestZone Enterprise XPath Intelligence Engine.

You are NOT a chatbot. You are NOT a generic AI assistant. You are an Appium Inspector + UIAutomator Viewer + Xcode Accessibility Inspector + DOM Intelligence engine.

MANDATORY RULES — NEVER:
- Guess locators. Invent locators. Hallucinate elements.
- Generate fake confidence scores. Generate XPath without evidence.
- Return unrelated elements.

If an element does not exist in the candidates, return ELEMENT NOT FOUND for it (do NOT fabricate one). The deterministic pipeline already filters; you only score what you are given.

YOUR ONLY JOB — RANK, EXPLAIN, FLAG:
- Rank candidates by true relevance to the user query (text, resource-id, content-desc, accessibility-id, label, name, hint, placeholder, class, screen).
- Refine base_confidence (0-100) using evidence already in the candidate: uniqueness, accessibility availability, resource-id stability, DOM validation, hierarchy.
- One concise sentence of reasoning per candidate (stability, uniqueness, dynamic id, index-based, accessible, duplicated, weak selector, etc).
- Demote chrome/container elements (action_bar_root, containerMainActivity, topBar, content, anchor, decor_content_parent) unless they truly represent the query (>90% relevance).

LOCATOR PRIORITY (already encoded deterministically, used for explanation only):
1. Accessibility ID  2. Resource ID  3. Relative XPath  4. Android UIAutomator
5. iOS Predicate  6. iOS Class Chain  7. CSS Selector. Never prioritize Absolute XPath.

NEVER:
- Create new locator strings, xpaths, resource ids, or attributes.
- Raise confidence for an element that does not match the query.
- Output prose, markdown, code fences, or commentary.

Output: a JSON array ONLY — [{"id": number, "confidence": number, "reasoning": string}]. Include every candidate id exactly once. No other text.`;

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
      context: {
        domSnapshot?: string | null;
        environment?: string;
        pastedDom?: string | null;
        sourceFilesText?: string | null;
        sourceFileNames?: string[];
        screenshots?: { name: string; dataUrl: string }[];
      };
    } = body;

    console.log("xpath-generator request:", {
      workspaceId,
      appModule,
      platform,
      env: context?.environment,
      pastedLen: context?.pastedDom?.length || 0,
      srcLen: context?.sourceFilesText?.length || 0,
      shots: context?.screenshots?.length || 0,
    });

    const { data: workspace } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", workspaceId)
      .eq("owner_id", user.id)
      .single();
    if (!workspace) return json({ error: "Workspace not found or access denied" }, 403);

    // Resolve DOM source in priority order: pasted → uploaded source → env snapshot
    let dom: string | null = context?.pastedDom?.trim() || context?.sourceFilesText?.trim() || context?.domSnapshot || null;
    let domSource: "pasted" | "uploaded" | "environment" | "screenshots" | "none" =
      context?.pastedDom?.trim() ? "pasted" :
      context?.sourceFilesText?.trim() ? "uploaded" :
      context?.domSnapshot ? "environment" : "none";

    // Fallback: reconstruct an HTML skeleton from screenshots via multimodal AI
    if (!dom && context?.screenshots && context.screenshots.length > 0) {
      console.log("xpath-generator: reconstructing DOM from", context.screenshots.length, "screenshot(s)");
      try {
        const reconstructed = await reconstructDomFromScreenshots(authHeader, platform, appModule, query, context.screenshots);
        if (reconstructed) {
          dom = reconstructed;
          domSource = "screenshots";
        }
      } catch (e) {
        console.warn("xpath-generator: vision reconstruction exception", e);
      }
    }

    if (!dom || !dom.trim()) {
      return errorPayload(
        "DOM_NOT_LOADED",
        "No DOM is available. Paste HTML/DOM, upload a page-source file, add screenshots, or upload a build in the workspace Environments tab.",
      );
    }
    if (dom.length > 4_000_000) {
      return errorPayload("UNSUPPORTED_FORMAT", "DOM snapshot exceeds 4MB processing limit.");
    }

    // Web platform → analyzer uses HTML rules
    const analyzerPlatform: Platform = platform === "web" ? "web" : platform;

    let catalog;
    try {
      catalog = analyzeCatalog(dom, analyzerPlatform);
    } catch (e) {
      console.error("xpath-generator: parse failure", e);
      return errorPayload("INVALID_APP_SOURCE", "The DOM/app source could not be parsed.");
    }

    if (catalog.totalNodes === 0) {
      return errorPayload("INVALID_APP_SOURCE", "The DOM parser found no elements.");
    }

    const filter = parseQuery(query);
    const candidateNodes = selectCandidates(catalog.nodes, filter, filter.wantsAll ? 24 : 8);

    const appTree = buildAppTree(catalog);

    if (candidateNodes.length === 0) {
      return json({
        elements: [],
        risks: catalog.risks,
        screens: catalog.screens,
        totalNodes: catalog.totalNodes,
        appTree,
        domSource,
        error_code: "ELEMENT_NOT_FOUND",
        message: `No "${query}" found in the ${domSource === "screenshots" ? "screenshot-reconstructed" : domSource} DOM. Scanned ${catalog.totalNodes.toLocaleString()} nodes across ${catalog.screens.length} screen(s). Try a different keyword, or browse the Application Tree below.`,
      });
    }

    const elements = buildElementAnalyses(catalog, candidateNodes);

    // AI ranking is best-effort — never inflates confidence beyond uniqueness math.
    let ranking = new Map<number, AIRanking>();
    try {
      ranking = await rankWithAI(authHeader, query, analyzerPlatform, elements);
    } catch (e) {
      console.warn("xpath-generator: ranking skipped", e);
    }

    const enriched = elements.map((el) => {
      const r = ranking.get(el.id);
      return {
        ...el,
        reasoning: r?.reasoning || el.reasoning,
      };
    }).sort((a, b) => b.confidence - a.confidence);

    return json({
      elements: enriched,
      risks: catalog.risks,
      screens: catalog.screens,
      totalNodes: catalog.totalNodes,
      appTree,
      module: appModule,
      platform: analyzerPlatform,
      domSource,
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
