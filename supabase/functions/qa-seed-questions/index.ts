import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders, validateAuth, unauthorizedResponse } from "../_shared/auth.ts";

const CATEGORIES = [
  "Manual Testing",
  "Test Automation",
  "API Testing",
  "Performance Testing",
  "Security Testing",
  "Mobile Testing",
  "Agile & SDLC",
  "Defect Management",
  "Selenium",
  "Cypress",
  "Playwright",
  "Postman",
  "JIRA & Tools",
  "Test Design Techniques",
  "CI/CD",
];

const DIFFICULTIES = ["easy", "medium", "hard"];
const BATCH_SIZE = 25; // questions per AI call

interface GeneratedQuestion {
  category: string;
  difficulty: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "A" | "B" | "C" | "D";
  explanation: string;
}

async function generateBatch(category: string, difficulty: string, count: number): Promise<GeneratedQuestion[]> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "You are an expert QA exam author. Generate unique, high-quality multiple-choice questions for software testing professionals. Each question must have exactly 4 plausible options, one correct answer, and a concise but informative explanation. Avoid duplicates and trivial wording.",
        },
        {
          role: "user",
          content: `Generate ${count} unique multiple-choice questions for category "${category}" at "${difficulty}" difficulty.`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "submit_questions",
            description: "Return generated MCQ questions",
            parameters: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question: { type: "string" },
                      option_a: { type: "string" },
                      option_b: { type: "string" },
                      option_c: { type: "string" },
                      option_d: { type: "string" },
                      correct_option: { type: "string", enum: ["A", "B", "C", "D"] },
                      explanation: { type: "string" },
                    },
                    required: ["question", "option_a", "option_b", "option_c", "option_d", "correct_option", "explanation"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["questions"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "submit_questions" } },
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`AI gateway ${resp.status}: ${txt}`);
  }
  const data = await resp.json();
  const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("AI returned no tool call");
  const parsed = JSON.parse(args);
  return (parsed.questions || []).map((q: any) => ({
    ...q,
    category,
    difficulty,
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await validateAuth(req);
  if (!auth.user) return unauthorizedResponse(auth.error || "Unauthorized");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Authorization: only organization admins may seed questions
  const { data: adminRows, error: adminErr } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", auth.user.id)
    .eq("role", "admin")
    .limit(1);
  if (adminErr || !adminRows || adminRows.length === 0) {
    return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const target: number = Math.min(Math.max(body.target ?? 200, 25), 500); // questions per call

    // Current count
    const { count: currentCount } = await supabase
      .from("qa_questions")
      .select("*", { count: "exact", head: true });

    let inserted = 0;
    const errors: string[] = [];

    // Distribute target across categories x difficulties
    const combos: { category: string; difficulty: string }[] = [];
    for (const c of CATEGORIES) for (const d of DIFFICULTIES) combos.push({ category: c, difficulty: d });

    const perCombo = Math.max(1, Math.ceil(target / combos.length));
    let remaining = target;

    for (const combo of combos) {
      if (remaining <= 0) break;
      const want = Math.min(BATCH_SIZE, perCombo, remaining);
      try {
        const generated = await generateBatch(combo.category, combo.difficulty, want);
        if (generated.length) {
          const { error: insErr, count } = await supabase
            .from("qa_questions")
            .insert(generated, { count: "exact" });
          if (insErr) errors.push(`${combo.category}/${combo.difficulty}: ${insErr.message}`);
          else inserted += count || generated.length;
          remaining -= generated.length;
        }
      } catch (e) {
        errors.push(`${combo.category}/${combo.difficulty}: ${e instanceof Error ? e.message : "err"}`);
      }
      // Light delay to respect rate limits
      await new Promise((r) => setTimeout(r, 400));
    }

    const { count: newCount } = await supabase
      .from("qa_questions")
      .select("*", { count: "exact", head: true });

    return new Response(
      JSON.stringify({
        previousCount: currentCount || 0,
        newCount: newCount || 0,
        inserted,
        errors: errors.slice(0, 10),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
