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
(HTML/JSON/log/text/stack traces) and produce a precise, structured root cause analysis
for EVERY failed scenario — not only XPath issues.

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

      // Classification — REQUIRED for every failed/flaky scenario
      "failureType":
        "xpath_locator" | "assertion" | "timeout" | "element_not_interactable" |
        "element_not_found" | "api_failure" | "network" | "data_mismatch" |
        "environment" | "app_crash" | "unexpected_popup" | "session_expired" |
        "dependency" | "slow_loading" | "validation" | "permission" | "flaky" |
        "build_mismatch" | "configuration" | "authentication" | "ui_change" | "unknown",
      "failureTypeLabel": string | null,      // Human-readable label
      "layer": "ui" | "api" | "network" | "data" | "environment" | "framework" | "auth" | "unknown",

      // Analysis — REQUIRED for every failed/flaky scenario (write meaningful prose, not "N/A")
      "failureReason": string | null,         // 1-sentence summary of WHAT failed
      "rootCause": string | null,             // WHY it failed (the underlying cause)
      "detailedExplanation": string | null,   // 2-4 sentence deep-dive in human language
      "technicalInsight": string | null,      // QA-engineer-grade technical observation (selectors, timing, payloads, codes)
      "impactedFlow": string | null,          // Which user/business flow this breaks
      "suggestedFix": string | null,          // Concrete, actionable fix steps
      "preventionRecommendation": string | null, // How to prevent recurrence
      "confidence": number,                   // 0-100 confidence in this scenario diagnosis

      "errorSnippet": string | null,          // Short raw error excerpt (<= 400 chars)
      "stackTrace": string | null,            // Trimmed stack trace if present (<= 800 chars)
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

CRITICAL ANALYSIS RULES:
- Analyze EVERY failed and flaky scenario in depth — never leave failureType, rootCause, detailedExplanation, suggestedFix or preventionRecommendation empty for a failure. If unsure, use failureType "unknown" but still write a best-effort explanation and what to investigate.
- Read logs deeply: parse stack traces, HTTP status codes, error class names, timeout values, assertion diffs, locator strings, popup/dialog mentions, build/version mismatches, auth/session expiry markers.
- Map errors to failureType using these signals (non-exhaustive):
  * NoSuchElement / ElementNotFound / StaleElementReference / InvalidSelector → xpath_locator OR element_not_found
  * ElementNotInteractable / ElementClickIntercepted / overlay/modal blocking → element_not_interactable or unexpected_popup
  * TimeoutException / wait timed out / Navigation timeout → timeout (or slow_loading if page-load related)
  * AssertionError / expected vs actual / "to equal" / "to contain" → assertion or data_mismatch
  * HTTP 4xx/5xx, fetch failed, ECONNREFUSED, DNS, SSL → api_failure or network
  * 401 / 403 / token expired / login failed / unauthorized → authentication or session_expired or permission
  * App crashed / SIGSEGV / native crash / ANR / process died → app_crash
  * Missing env var / wrong baseUrl / config not found → configuration or environment
  * APK/IPA/build version mismatch, capability mismatch → build_mismatch
  * Intermittent pass/fail, retry markers, "passed on retry" → flaky (set isFlaky=true)
  * UI snapshot diff, layout shift, new modal, redesigned screen → ui_change
- For xpath_locator / element_not_found failures, also surface them in xpathIssues with a stabler proposed XPath (prefer relative + attribute-based: resource-id, content-desc, accessibility-id, name, label, data-testid).
- "layer" should reflect WHERE the failure surfaced (ui for selectors/visibility, api for backend calls, network for transport, data for assertion/data mismatch, environment for env/config, auth for login/token, framework for driver/runner issues).
- detailedExplanation MUST be human-readable prose explaining cause-and-effect; technicalInsight MUST contain concrete technical observations (selector strings, timing numbers, status codes, payload diffs).
- suggestedFix MUST be actionable steps (e.g. "Replace XPath with resource-id 'btn_submit'", "Add explicit wait for element visibility up to 15s", "Verify /api/login returns 200 before proceeding").
- preventionRecommendation MUST give a forward-looking practice (e.g. "Use stable test IDs from dev team", "Add health-check before suite", "Mock unstable third-party dependency").
- Identify flaky scenarios (intermittent or retry markers) and set isFlaky=true.
- Group root causes into clear buckets in rootCauseDistribution (e.g. "Locator/XPath", "Timeout/Waits", "Assertion/Data", "Network/API", "Auth/Session", "App Crash", "Environment/Config", "UI Change", "Flaky").
- Compute stabilityScore = round(100 * passed / max(totalScenarios,1)); reduce by up to 15 points if flakyCount is high.
- Per-scenario "confidence" reflects YOUR certainty in that diagnosis (lower it when logs are sparse).
- If parsing fails or input is unclear, still return valid JSON with empty arrays and overall confidence reflecting uncertainty.
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

    // Hard cap to keep prompt safe (raised — client now smart-extracts huge reports)
    const MAX_CHARS = 400_000;
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
