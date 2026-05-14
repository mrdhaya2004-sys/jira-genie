import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateAuth, corsHeaders, unauthorizedResponse } from "../_shared/auth.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface DefectRequest {
  workspaceId: string;
  workspaceName?: string;
  os: 'android' | 'ios' | 'web';
  reportSummaries: { name: string; size: number; kind: string }[];
  reportDigest: string; // pre-trimmed text payload from client
}

const SYSTEM_PROMPT = `You are an elite QA Defect Analyst AI. You receive raw automation execution reports
(HTML/JSON/log/text) and produce a precise, structured defect analysis.

You MUST respond with ONLY a single JSON object (no markdown fences, no commentary) matching this schema:

{
  "summary": string,                          // 2-4 sentence executive summary
  "totalScenarios": number,
  "passed": number,
  "failed": number,
  "skipped": number,
  "stabilityScore": number,                   // 0-100
  "confidence": number,                       // 0-100, your confidence in this analysis
  "mostFailedModule": string | null,
  "flakyCount": number,
  "rootCauseDistribution": [
    { "label": string, "count": number, "percentage": number }
  ],
  "scenarios": [
    {
      "name": string,
      "status": "passed" | "failed" | "skipped" | "flaky" | "unknown",
      "module": string | null,
      "failureReason": string | null,
      "rootCause": string | null,
      "suggestedFix": string | null,
      "errorSnippet": string | null,
      "durationMs": number | null,
      "tags": string[],
      "isFlaky": boolean
    }
  ],
  "xpathIssues": [
    {
      "scenario": string | null,
      "oldXpath": string,
      "proposedXpath": string | null,
      "reason": string,
      "confidence": number
    }
  ],
  "recommendations": string[]                 // 3-7 concrete stabilization actions
}

Rules:
- Detect XPath / locator / NoSuchElement / ElementNotFound / StaleElementReference failures and surface them in xpathIssues.
- For xpathIssues, propose a stabler XPath when possible (prefer relative, attribute-based: resource-id, content-desc, name, label, data-testid).
- Compute stabilityScore = round(100 * passed / max(totalScenarios,1)) unless flakiness lowers it.
- Identify flaky tests (intermittent or retry markers).
- Group root causes into clear buckets (e.g. "Locator/XPath", "Timeout/Waits", "Assertion mismatch", "Network/API", "Test data", "App crash", "Environment").
- If parsing fails or input is unclear, still return valid JSON with empty arrays and confidence reflecting uncertainty.
- NEVER include markdown, NEVER wrap in code fences. Output raw JSON only.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await validateAuth(req);
    if (!auth.user) return unauthorizedResponse(auth.error || 'Unauthorized');

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI gateway not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json() as DefectRequest;
    const { workspaceName, os, reportSummaries, reportDigest } = body;

    if (!reportDigest || reportDigest.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Empty report content" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Hard cap to keep prompt safe
    const MAX_CHARS = 180_000;
    const trimmedDigest = reportDigest.length > MAX_CHARS
      ? reportDigest.slice(0, MAX_CHARS) + `\n\n[...truncated ${reportDigest.length - MAX_CHARS} chars...]`
      : reportDigest;

    const userPrompt = `Workspace: ${workspaceName || 'unknown'}
Execution OS: ${os}
Files uploaded: ${reportSummaries.map(f => `${f.name} (${f.kind}, ${f.size}b)`).join(', ') || 'inline text'}

=== REPORT CONTENT ===
${trimmedDigest}
=== END REPORT ===

Analyze the above automation execution report and return the structured JSON defined in the system prompt.`;

    const aiResponse = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiResponse.ok) {
      const txt = await aiResponse.text();
      console.error('AI gateway error', aiResponse.status, txt);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResponse.json();
    const content: string = aiJson.choices?.[0]?.message?.content ?? '';

    let parsed: unknown;
    try {
      // Strip accidental code fences just in case
      const cleaned = content.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error('Failed to parse AI JSON', e, content.slice(0, 500));
      return new Response(JSON.stringify({
        error: "AI returned malformed JSON",
        recovery: "Try uploading a smaller portion of the report, or paste raw failure logs.",
      }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ analysis: parsed }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error('defect-analyzer error', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
