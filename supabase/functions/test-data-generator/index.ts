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

    const systemPrompt = `You are a Senior QA Engineer who reads project requirements FIRST and then designs intelligent, business-aware test data — never random values.

Your job: produce a context-aware test data plan for the screen / module described by the user.

## CATEGORIES (cover ALL when relevant)
- positive          — valid, happy-path values
- negative          — invalid inputs that should be rejected
- boundary          — min/max values, length limits
- edge              — rare or extreme conditions
- invalid_format    — wrong format (e.g. bad email pattern)
- security          — XSS, SQLi, command injection payloads
- special_character — unicode, emoji, accents, RTL
- null_empty        — null, empty string, whitespace-only

## TESTING TYPE (one per dataset)
functional | validation | boundary | negative | security | exploratory

## OUTPUT — STRICT
Return EXACTLY ONE \`\`\`json ... \`\`\` code block. No other text.
Schema:
{
  "context_used": boolean,
  "context_summary": string,        // 1–2 sentences. If no project context, say so.
  "module_name": string,
  "screen_name": string,
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
          "category": "positive"|"negative"|"boundary"|"edge"|"invalid_format"|"security"|"special_character"|"null_empty",
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
- Every field MUST have at least one positive, one negative, one boundary, one null_empty dataset. Add edge/security/special_character where it makes sense.
- "value" must be the literal test value as a string (escape quotes). For empty/null use "" or "null".
- Ground field labels and validations in the project context below when present. Do NOT invent UI labels not in context.
- If no context AND no fields provided AND screen name is generic, still produce a sensible generic plan but set context_used=false and explain in notes.

${hasBrain ? `## PROJECT CONTEXT (workspace brain — REAL data)\n${brain.slice(0, 12000)}` : "## PROJECT CONTEXT\n(none provided — generate generic but professional test data and clearly mark context_used=false)"}

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

    // Extract JSON object from response
    let parsed: any = null;
    const fence = raw.match(/```json\s*([\s\S]*?)```/i) || raw.match(/```\s*([\s\S]*?)```/);
    const candidate = fence ? fence[1] : raw;
    const s = candidate.indexOf("{");
    const e = candidate.lastIndexOf("}");
    if (s !== -1 && e > s) {
      try {
        parsed = JSON.parse(candidate.slice(s, e + 1));
      } catch (_) { /* ignore */ }
    }

    if (!parsed || !Array.isArray(parsed.fields)) {
      return new Response(JSON.stringify({
        error: "The AI response could not be parsed. Try rephrasing or providing more context.",
        raw: raw.slice(0, 1000),
      }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

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
