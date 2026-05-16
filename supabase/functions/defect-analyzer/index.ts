import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateAuth, corsHeaders, unauthorizedResponse } from "../_shared/auth.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface ScreenshotPayload {
  index: number;
  name: string;
  sourceFile: string;
  dataUrl: string;
  width: number;
  height: number;
  context?: string;
}

interface DefectRequest {
  workspaceId: string;
  workspaceName?: string;
  os: 'android' | 'ios' | 'web';
  reportSummaries: { name: string; size: number; kind: string }[];
  reportDigest: string;
  parseMetrics?: {
    parsingCompletion: number;
    logCoverage: number;
    rawBytes: number;
    digestBytes: number;
    failureLinesCaptured: number;
  };
  screenshots?: ScreenshotPayload[];
}

const SYSTEM_PROMPT = `You are an elite QA Defect Analyst AI for an enterprise SaaS test platform.
You receive raw automation execution reports (HTML/JSON/log/text/stack traces) and produce
HIGHLY ACCURATE, EVIDENCE-BACKED root-cause analysis for EVERY failed scenario.

ACCURACY IS NON-NEGOTIABLE. You MUST:
- READ the report carefully before concluding anything.
- Quote ONLY scenarios, error messages, stack traces, selectors and HTTP codes that are LITERALLY present in the report. Never invent scenario names, modules, error classes, line numbers, or selectors.
- If the report does not clearly establish a root cause, set "confidence" LOW (<= 40) and write in "lowConfidenceReason" exactly what evidence was missing (e.g. "no stack trace present", "scenario name not found in logs", "report truncated before failure point").
- NEVER write generic placeholder text like "check the issue", "investigate further", "verify the test" without specifics tied to the actual log.
- If you cannot find ANY failed scenarios in the report, return scenarios=[] and explain in summary.

You MUST respond with ONLY a single JSON object (no markdown fences, no commentary) matching this schema:

{
  "summary": string,                          // 2-4 sentence executive summary grounded in the actual report
  "totalScenarios": number,                   // count actually observed in the report (do not guess)
  "passed": number,
  "failed": number,
  "skipped": number,
  "blocked": number,                          // scenarios that could not run due to setup/dependency failure
  "stabilityScore": number,                   // 0-100
  "confidence": number,                       // 0-100 overall analysis confidence
  "mostFailedModule": string | null,
  "impactedModules": string[],                // distinct modules/features impacted by failures
  "flakyCount": number,
  "rootCauseDistribution": [
    { "label": string, "count": number, "percentage": number }
  ],
  "scenarios": [
    {
      "name": string,                          // EXACT name as it appears in the report
      "status": "passed" | "failed" | "skipped" | "blocked" | "flaky" | "unknown",
      "module": string | null,
      "verifiedInLogs": boolean,               // true ONLY if the scenario name appears verbatim in the report content
      "failureType":
        "xpath_locator" | "assertion" | "timeout" | "element_not_interactable" |
        "element_not_found" | "api_failure" | "network" | "data_mismatch" |
        "environment" | "app_crash" | "unexpected_popup" | "session_expired" |
        "dependency" | "slow_loading" | "validation" | "permission" | "flaky" |
        "build_mismatch" | "configuration" | "authentication" | "ui_change" | "unknown",
      "failureTypeLabel": string | null,
      "layer": "ui" | "api" | "network" | "data" | "environment" | "framework" | "auth" | "unknown",
      "failureReason": string | null,          // 1-sentence factual summary of WHAT failed (quote evidence)
      "rootCause": string | null,              // WHY it failed, grounded in evidence
      "detailedExplanation": string | null,    // 2-4 sentence human-readable cause-and-effect
      "technicalInsight": string | null,       // concrete: selectors, status codes, timing numbers, assertion diffs from the log
      "impactedFlow": string | null,           // which user/business flow is broken (only if derivable from the log)
      "suggestedFix": string | null,           // SPECIFIC, actionable, tied to the actual error
      "preventionRecommendation": string | null,
      "confidence": number,                    // 0-100 per-scenario diagnosis confidence
      "lowConfidenceReason": string | null,    // REQUIRED whenever confidence < 60
      "executionSequence": string[] | null,    // ordered list of the last 3-8 steps before the failure, if present
      "errorSnippet": string | null,           // verbatim raw error excerpt (<= 400 chars). DO NOT paraphrase.
      "stackTrace": string | null,             // verbatim trimmed stack trace if present (<= 800 chars)
      "durationMs": number | null,
      "tags": string[],
      "isFlaky": boolean,
      "screenshotAnalysis": [
        {
          "screenshotIndex": number,             // index into the provided SCREENSHOTS list (0-based)
          "visualObservation": string,           // 1-3 sentence description of what is on the screen
          "detectedIssue": string | null,        // concrete UI issue: error toast text, missing element, blank screen, overlay, etc.
          "visibleText": string | null,          // notable text the AI reads from the screen (errors, banners, dialog titles)
          "blockingOverlay": string | null,      // describe overlay/popup blocking interaction if present
          "confidence": number                   // 0-100 per-screenshot confidence
        }
      ] | null
    }
  ],
  "xpathIssues": [
    {
      "scenario": string | null,
      "oldXpath": string,                      // must be quoted from the report
      "proposedXpath": string | null,
      "reason": string,
      "confidence": number
    }
  ],
  "recommendations": string[]                  // 3-7 specific, actionable, evidence-backed stabilization actions
}

DEEP ANALYSIS RULES:
- Parse stack traces, HTTP codes, error class names, timeout values, assertion diffs, locator strings, popup/dialog mentions, build/version mismatches, auth/session expiry markers.
- Failure-type signals:
  * NoSuchElement / ElementNotFound / StaleElementReference / InvalidSelector → xpath_locator or element_not_found
  * ElementNotInteractable / ElementClickIntercepted / overlay blocking → element_not_interactable or unexpected_popup
  * TimeoutException / wait timed out → timeout (slow_loading if page-load)
  * AssertionError / expected vs actual → assertion or data_mismatch
  * HTTP 4xx/5xx, fetch failed, ECONNREFUSED, DNS, SSL → api_failure or network
  * 401 / 403 / token expired → authentication or session_expired or permission
  * App crashed / SIGSEGV / ANR → app_crash
  * Missing env var / wrong baseUrl → configuration or environment
  * APK/IPA build mismatch → build_mismatch
  * Intermittent pass/fail or retry markers → flaky, set isFlaky=true
  * UI snapshot diff / new modal → ui_change
- "blocked" = could not execute (e.g. previous step failed, hook failed, setup error, app didn't launch). Not the same as "failed".
- For xpath_locator / element_not_found, ALSO add to xpathIssues with a stable proposed XPath (prefer resource-id / accessibility-id / data-testid).
- detailedExplanation = prose. technicalInsight = concrete technical observations from the log.
- suggestedFix MUST be a specific action, e.g. "Replace XPath '//button[3]' with resource-id 'btn_submit'", "Add explicit wait up to 15s for 'login_btn'", "Verify /api/login returns 200 (currently 503)".
- preventionRecommendation = forward-looking practice.
- stabilityScore = round(100 * passed / max(totalScenarios,1)); subtract up to 15 points for high flakyCount.
- ANTI-HALLUCINATION: If the digest is sparse, return fewer but accurate scenarios with low confidence rather than fabricating detail. Always set verifiedInLogs=true ONLY when the exact scenario name string appears in the report content.

SCREENSHOT INTELLIGENCE (when SCREENSHOTS are attached):
- You will receive 1-8 images labeled with their index, file name and source. Look at each image carefully.
- For each FAILED, BLOCKED or FLAKY scenario, if any screenshot is clearly related (matches by name, sequence, on-screen text, or timing), populate "screenshotAnalysis" with one entry per related image.
- visualObservation: describe what the user would see on the screen in plain language (which screen, layout state, key elements visible).
- detectedIssue: name the concrete visual problem — e.g. "Error toast: 'Invalid username or password'", "App displayed blank white screen", "Native permission dialog blocked the Continue button", "Loader spinner stuck", "Session expired modal", "Form field highlighted red with validation message X".
- visibleText: extract notable on-screen text verbatim (error banners, toasts, dialog titles, validation strings). Do NOT invent text not visible in the image.
- blockingOverlay: only when a popup/modal/permission/cookie banner is clearly intercepting the action under test.
- confidence: lower it when the screenshot is blurry, partially rendered, or the link to the scenario is uncertain.
- If a screenshot adds new evidence (e.g. visible error text), use it to refine rootCause/suggestedFix even when the logs are sparse. Quote the screen text in technicalInsight.
- If NO screenshot is related to a scenario, omit screenshotAnalysis (null). Never fabricate analysis for images that are unrelated.
- If screenshots are absent entirely, behave exactly as before (log-only analysis).
- NEVER include markdown, NEVER wrap in code fences. Output raw JSON ONLY.`;

// ---------- Validation layer ----------

function safeNumber(n: unknown, fallback = 0): number {
  if (typeof n === 'number' && Number.isFinite(n)) return n;
  return fallback;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Cross-checks the AI's output against the raw report to defend against hallucination.
 * - Downgrades per-scenario confidence when the scenario name is not in the report text.
 * - Sets verifiedInLogs honestly.
 * - Recomputes counts, stability score, root cause distribution.
 * - Produces an aggregate analysisReliability score.
 */
function validateAndEnrich(parsed: any, digest: string, parseMetrics?: DefectRequest['parseMetrics'], screenshotCount = 0) {
  if (!parsed || typeof parsed !== 'object') return parsed;
  const lowerDigest = (digest || '').toLowerCase();

  const scenarios: any[] = Array.isArray(parsed.scenarios) ? parsed.scenarios : [];
  let verifiedCount = 0;
  let confidenceSum = 0;
  let confidenceWeights = 0;
  const cleaned = scenarios.map((s) => {
    const name = typeof s?.name === 'string' ? s.name.trim() : '';
    const verified = name.length >= 3 && lowerDigest.includes(name.toLowerCase());
    let confidence = clamp(safeNumber(s?.confidence, 50), 0, 100);
    let lowConfidenceReason: string | null = s?.lowConfidenceReason ?? null;

    // If the AI claimed verifiedInLogs=true but we cannot find the name, downgrade and mark.
    if (!verified && (s?.status === 'failed' || s?.status === 'flaky' || s?.status === 'blocked')) {
      if (confidence > 45) confidence = 45;
      if (!lowConfidenceReason) {
        lowConfidenceReason =
          'Scenario name was not found verbatim in the uploaded report — diagnosis is inferred from partial context.';
      }
    }

    if (verified) verifiedCount++;
    if (s?.status === 'failed' || s?.status === 'flaky' || s?.status === 'blocked') {
      confidenceSum += confidence;
      confidenceWeights += 1;
    }

    // Sanitize screenshotAnalysis: drop entries with out-of-range indices or empty observations.
    let screenshotAnalysis: any[] | undefined;
    if (Array.isArray(s?.screenshotAnalysis) && screenshotCount > 0) {
      screenshotAnalysis = s.screenshotAnalysis
        .filter((sa: any) =>
          sa &&
          typeof sa.screenshotIndex === 'number' &&
          sa.screenshotIndex >= 0 &&
          sa.screenshotIndex < screenshotCount &&
          typeof sa.visualObservation === 'string' &&
          sa.visualObservation.trim().length > 0,
        )
        .map((sa: any) => ({
          screenshotIndex: sa.screenshotIndex,
          visualObservation: String(sa.visualObservation).slice(0, 800),
          detectedIssue: typeof sa.detectedIssue === 'string' ? sa.detectedIssue.slice(0, 400) : null,
          visibleText: typeof sa.visibleText === 'string' ? sa.visibleText.slice(0, 400) : null,
          blockingOverlay: typeof sa.blockingOverlay === 'string' ? sa.blockingOverlay.slice(0, 300) : null,
          confidence: clamp(safeNumber(sa.confidence, 60), 0, 100),
        }));
      if (screenshotAnalysis.length === 0) screenshotAnalysis = undefined;
    }

    return {
      ...s,
      name,
      verifiedInLogs: verified,
      confidence,
      lowConfidenceReason,
      ...(screenshotAnalysis ? { screenshotAnalysis } : {}),
    };
  });

  // Recount from the actual scenarios array — never trust AI counts blindly.
  const counts = { passed: 0, failed: 0, skipped: 0, blocked: 0, flaky: 0, unknown: 0 };
  for (const s of cleaned) {
    const st = String(s.status || 'unknown').toLowerCase();
    if (st in counts) (counts as any)[st]++;
    else counts.unknown++;
  }
  const total = cleaned.length || safeNumber(parsed.totalScenarios, 0);
  const stabilityScore = total > 0 ? Math.round((counts.passed / total) * 100) : 0;

  // Recompute root-cause distribution from actual failure types
  const rcMap = new Map<string, number>();
  for (const s of cleaned) {
    if (s.status === 'failed' || s.status === 'flaky' || s.status === 'blocked') {
      const label = s.failureTypeLabel || s.failureType || 'unknown';
      rcMap.set(label, (rcMap.get(label) || 0) + 1);
    }
  }
  const failureTotal = Array.from(rcMap.values()).reduce((a, b) => a + b, 0);
  const rootCauseDistribution = Array.from(rcMap.entries())
    .map(([label, count]) => ({
      label,
      count,
      percentage: failureTotal > 0 ? Math.round((count / failureTotal) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Overall analysis reliability: blends AI confidence on failures + verification rate + parsing completeness.
  const avgFailureConfidence = confidenceWeights > 0 ? confidenceSum / confidenceWeights : safeNumber(parsed.confidence, 50);
  const verificationRate = cleaned.length > 0 ? (verifiedCount / cleaned.length) * 100 : 0;
  const parsingCompletion = clamp(safeNumber(parseMetrics?.parsingCompletion, 100), 0, 100);
  const logCoverage = clamp(safeNumber(parseMetrics?.logCoverage, 100), 0, 100);
  const analysisReliability = Math.round(
    clamp(avgFailureConfidence * 0.45 + verificationRate * 0.35 + parsingCompletion * 0.15 + logCoverage * 0.05, 0, 100),
  );

  let reliabilityNotes: string | undefined;
  if (analysisReliability < 60) {
    const reasons: string[] = [];
    if (verificationRate < 60) reasons.push('many scenario names could not be matched in the raw logs');
    if (parsingCompletion < 80) reasons.push('only part of the report was parseable');
    if (avgFailureConfidence < 60) reasons.push('per-scenario AI confidence is low');
    reliabilityNotes = `Analysis confidence is LOW: ${reasons.join('; ') || 'insufficient execution data in the report'}.`;
  }

  return {
    ...parsed,
    scenarios: cleaned,
    passed: counts.passed,
    failed: counts.failed,
    skipped: counts.skipped,
    blocked: counts.blocked,
    flakyCount: counts.flaky,
    totalScenarios: total,
    stabilityScore,
    rootCauseDistribution,
    impactedModules: Array.isArray(parsed.impactedModules)
      ? parsed.impactedModules
      : Array.from(new Set(cleaned.filter((s) => s.status !== 'passed').map((s) => s.module).filter(Boolean))),
    reliability: {
      parsingCompletion,
      logCoverage,
      analysisReliability,
      notes: reliabilityNotes,
    },
    confidence: Math.round(avgFailureConfidence),
  };
}

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
    const { workspaceName, os, reportSummaries, reportDigest, parseMetrics, screenshots } = body;

    if (!reportDigest || reportDigest.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Empty report content" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const MAX_CHARS = 400_000;
    const trimmedDigest = reportDigest.length > MAX_CHARS
      ? reportDigest.slice(0, MAX_CHARS) + `\n\n[...truncated ${reportDigest.length - MAX_CHARS} chars...]`
      : reportDigest;

    // Cap screenshots defensively (client also caps at 8)
    const safeShots = Array.isArray(screenshots)
      ? screenshots.filter((s) => typeof s?.dataUrl === 'string' && s.dataUrl.startsWith('data:image/')).slice(0, 8)
      : [];

    const screenshotManifest = safeShots.length
      ? safeShots.map((s, i) =>
          `  [${i}] ${s.name}  (source: ${s.sourceFile}, ${s.width}x${s.height})${s.context ? ` — ${s.context}` : ''}`,
        ).join('\n')
      : '  (no screenshots attached — analyze logs only)';

    const userTextPrompt = `Workspace: ${workspaceName || 'unknown'}
Execution OS: ${os}
Files uploaded: ${reportSummaries.map(f => `${f.name} (${f.kind}, ${f.size}b)`).join(', ') || 'inline text'}
Parsing completion: ${parseMetrics?.parsingCompletion ?? 'unknown'}%
Log coverage: ${parseMetrics?.logCoverage ?? 'unknown'}%
Failure lines captured during smart-extraction: ${parseMetrics?.failureLinesCaptured ?? 'n/a'}

=== SCREENSHOTS ATTACHED (${safeShots.length}) ===
${screenshotManifest}
${safeShots.length ? 'The images follow this text block, in the same order as the manifest. Use screenshotIndex to reference them.' : ''}

=== REPORT CONTENT (analyze ONLY what is below — never invent) ===
${trimmedDigest}
=== END REPORT ===

Produce the structured JSON defined in the system prompt. Remember: every scenario name MUST appear verbatim in the report content above, or you must mark verifiedInLogs=false with a low confidence and an honest lowConfidenceReason. For each related screenshot, populate screenshotAnalysis with the correct screenshotIndex.`;

    // Build multimodal content: text first, then each screenshot as image_url.
    const userContent: any[] = [{ type: 'text', text: userTextPrompt }];
    for (const s of safeShots) {
      userContent.push({ type: 'image_url', image_url: { url: s.dataUrl } });
    }

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
          { role: 'user', content: safeShots.length > 0 ? userContent : userTextPrompt },
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

    let parsed: any;
    try {
      const cleaned = content.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error('Failed to parse AI JSON', e, content.slice(0, 500));
      return new Response(JSON.stringify({
        error: "AI returned malformed JSON",
        recovery: "Try uploading a smaller portion of the report, or paste raw failure logs.",
      }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validation + enrichment layer — defends against hallucination & recomputes truthful metrics.
    const validated = validateAndEnrich(parsed, trimmedDigest, parseMetrics, safeShots.length);

    return new Response(JSON.stringify({ analysis: validated }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error('defect-analyzer error', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
