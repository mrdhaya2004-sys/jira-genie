import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { routeAIRequest } from "../_shared/hiveMindRouter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  workspaceId?: string | null;
  query: string;
  screenName?: string;
  moduleName?: string;
  fields?: Array<{ name: string; type?: string; validation?: string; mandatory?: boolean }>;
  context?: { workspaceBrain?: string };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: RequestBody = await req.json();
    const { workspaceId, query, screenName, moduleName, fields, context } = body;

    if (!query || query.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Please describe the screen or feature you want test data for." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (workspaceId) {
      const { data: ws } = await supabaseClient
        .from("workspaces").select("id").eq("id", workspaceId).eq("owner_id", user.id).single();
      if (!ws) {
        return new Response(JSON.stringify({ error: "Workspace not found or access denied" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const brain = (context?.workspaceBrain || "").trim();
    const hasBrain = brain.length > 20;
    const fieldsBlock = fields && fields.length
      ? fields.map(f => `- ${f.name}${f.type ? ` (${f.type})` : ""}${f.mandatory ? " [mandatory]" : ""}${f.validation ? ` — ${f.validation}` : ""}`).join("\n")
      : "";

    const systemPrompt = `You are a SENIOR QA INTELLIGENCE ENGINE. You read project requirements first, INFER fields the user did not mention, identify business + validation rules, and design enterprise-grade test data — never random values.

## FIELD DETECTION ENGINE
Before generating data, infer ALL plausible fields for the screen/module — not just what the user wrote.
Example — module "LOGIN" → infer: Email, Password, Phone Number, Country, OTP, Username.
Example — "5 logins different country" → infer intent = Login Validation Testing → fields Email, Password, Country, Phone Number.

## CATEGORIES (cover ALL relevant)
positive | negative | boundary | edge | invalid_format | security | special_character | null_empty | exploratory

## TESTING TYPE
functional | validation | boundary | negative | security | exploratory

## SECURITY DATA (always include for text inputs)
SQL Injection (' OR 1=1 --, admin'--, '; DROP TABLE users;--), XSS (<script>alert(1)</script>, <img src=x onerror=alert(1)>), HTML injection, command injection, path traversal.

## BOUNDARY DATA — MEANINGFUL ONLY
Use field-type aware boundaries. Country → "U", "US", "USA", "IN", "SG", "Very Long Country Name". NEVER "1234567890" for a country.

## BUSINESS RULES
Auto-detect: Email must contain @, Password min 8 chars + complexity, Country must match ISO code, Phone E.164, Age 0-150, etc.

## OUTPUT — STRICT
Return EXACTLY ONE \`\`\`json ... \`\`\` code block. No other text.
Schema:
{
  "context_used": boolean,
  "context_summary": string,
  "module_name": string,
  "screen_name": string,
  "ai_summary": {
    "fields_identified": number,
    "datasets_generated": number,
    "coverage_overall": number,        // 0-100
    "confidence": number,              // 0-100
    "risk_level": "Low"|"Medium"|"High"
  },
  "confidence": {
    "score": number,                   // 0-100
    "reasons": string[]                // e.g. "Based on User Story", "Screen Name", "Knowledge Hub"
  },
  "coverage": {
    "functional": number,
    "validation": number,
    "boundary": number,
    "security": number,
    "data_quality": number,
    "overall": number
  },
  "insights": {
    "fields_identified": string[],
    "business_rules": string[],
    "validation_rules": string[],
    "missing_requirements": string[],
    "suggested_fields": string[]
  },
  "recommendations": string[],
  "fields": [
    {
      "name": string,
      "validation": string,
      "mandatory": boolean,
      "input_type": string,
      "data_format": string,
      "testing_objective": string,
      "expected_behavior": string,
      "datasets": [
        {
          "category": "positive"|"negative"|"boundary"|"edge"|"invalid_format"|"security"|"special_character"|"null_empty"|"exploratory",
          "testing_type": "functional"|"validation"|"boundary"|"negative"|"security"|"exploratory",
          "value": string,
          "expected_result": string,
          "reasoning": string
        }
      ]
    }
  ],
  "notes": string
}

Rules:
- INFER missing fields proactively — never return a single-field plan for a multi-field screen.
- Every field MUST have at least: 1 positive, 1 negative, 1 boundary, 1 null_empty. Add security/special_character/invalid_format/edge/exploratory where relevant.
- "value" is the literal string (escape quotes). For null use "null", for empty use "".
- Boundaries must be field-aware and realistic (see above).
- Coverage % must reflect honest assessment, not always 100.
- Confidence reasons must cite the actual sources used (User Story / Screen Name / Knowledge Hub / Module Name / Generic Heuristics).
- If context is missing, set context_used=false, lower confidence, and list what's missing in insights.missing_requirements.

${hasBrain ? `## PROJECT CONTEXT (workspace brain — REAL data)\n${brain.slice(0, 12000)}` : "## PROJECT CONTEXT\n(none provided — infer from screen/module name; set context_used=false; populate missing_requirements)"}

${fieldsBlock ? `## USER-PROVIDED FIELDS\n${fieldsBlock}` : ""}
${screenName ? `\n## SCREEN NAME: ${screenName}` : ""}
${moduleName ? `\n## MODULE NAME: ${moduleName}` : ""}`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: query },
    ];

    const response = await routeAIRequest(authHeader, messages, false);
    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      return new Response(errText || JSON.stringify({ error: "AI request failed" }), {
        status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await response.json().catch(() => null);
    const raw = json?.choices?.[0]?.message?.content
      ?? json?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).join("")
      ?? "";

    let parsed: any = null;
    const fence = raw.match(/```json\s*([\s\S]*?)```/i) || raw.match(/```\s*([\s\S]*?)```/);
    const candidate = fence ? fence[1] : raw;
    const s = candidate.indexOf("{");
    const e = candidate.lastIndexOf("}");
    if (s !== -1 && e > s) {
      try { parsed = JSON.parse(candidate.slice(s, e + 1)); } catch (_) { /* ignore */ }
    }

    if (!parsed || !Array.isArray(parsed.fields)) {
      return new Response(JSON.stringify({
        error: "The AI response could not be parsed. Try rephrasing or providing more context.",
        raw: raw.slice(0, 1000),
      }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Compute fallbacks so the UI always has numbers
    const totalDatasets = parsed.fields.reduce((n: number, f: any) => n + (f.datasets?.length || 0), 0);
    parsed.ai_summary = parsed.ai_summary || {};
    parsed.ai_summary.fields_identified = parsed.ai_summary.fields_identified ?? parsed.fields.length;
    parsed.ai_summary.datasets_generated = parsed.ai_summary.datasets_generated ?? totalDatasets;
    parsed.ai_summary.coverage_overall = parsed.ai_summary.coverage_overall ?? parsed.coverage?.overall ?? 80;
    parsed.ai_summary.confidence = parsed.ai_summary.confidence ?? parsed.confidence?.score ?? (hasBrain ? 85 : 60);
    parsed.ai_summary.risk_level = parsed.ai_summary.risk_level || (parsed.ai_summary.coverage_overall >= 85 ? "Low" : parsed.ai_summary.coverage_overall >= 65 ? "Medium" : "High");
    parsed.confidence = parsed.confidence || { score: parsed.ai_summary.confidence, reasons: hasBrain ? ["Workspace Knowledge Hub"] : ["Module / Screen heuristics"] };
    parsed.coverage = parsed.coverage || { functional: 80, validation: 80, boundary: 75, security: 70, data_quality: 80, overall: parsed.ai_summary.coverage_overall };
    parsed.insights = parsed.insights || { fields_identified: parsed.fields.map((f: any) => f.name), business_rules: [], validation_rules: [], missing_requirements: [], suggested_fields: [] };
    parsed.recommendations = parsed.recommendations || [];

    return new Response(JSON.stringify({ result: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("test-data-generator error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
