import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders, validateAuth, unauthorizedResponse } from "../_shared/auth.ts";

const QUESTIONS_PER_DAY = 10;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await validateAuth(req);
  if (!auth.user) return unauthorizedResponse(auth.error || "Unauthorized");
  const userId = auth.user.id;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const today = new Date().toISOString().slice(0, 10);

    // Existing assignment for today?
    const { data: existing } = await supabase
      .from("qa_daily_assignments")
      .select("question_ids")
      .eq("user_id", userId)
      .eq("challenge_date", today)
      .maybeSingle();

    let questionIds: string[];

    if (existing?.question_ids?.length) {
      questionIds = existing.question_ids as string[];
    } else {
      // Get all question IDs the user has already answered
      const { data: answered } = await supabase
        .from("qa_answers")
        .select("question_id")
        .eq("user_id", userId);
      const seen = new Set((answered || []).map((a: any) => a.question_id));

      // Pull a random pool of unseen questions
      const { data: pool } = await supabase
        .from("qa_questions")
        .select("id")
        .limit(2000);

      let candidates = (pool || []).map((q: any) => q.id).filter((id: string) => !seen.has(id));
      // If user has exhausted bank, reset and reuse
      if (candidates.length < QUESTIONS_PER_DAY) {
        candidates = (pool || []).map((q: any) => q.id);
      }
      // Shuffle
      for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      }
      questionIds = candidates.slice(0, QUESTIONS_PER_DAY);

      if (questionIds.length === 0) {
        return new Response(JSON.stringify({ error: "Question bank is empty. Please seed questions first." }), {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("qa_daily_assignments").insert({
        user_id: userId,
        challenge_date: today,
        question_ids: questionIds,
      });
    }

    const { data: questions } = await supabase
      .from("qa_questions")
      .select("id, category, difficulty, question, option_a, option_b, option_c, option_d")
      .in("id", questionIds);

    // Preserve assignment order
    const ordered = questionIds
      .map((id) => (questions || []).find((q: any) => q.id === id))
      .filter(Boolean);

    // Has the user already completed today's attempt?
    const { data: attempt } = await supabase
      .from("qa_attempts")
      .select("id, score, total, time_seconds, completed")
      .eq("user_id", userId)
      .eq("challenge_date", today)
      .eq("completed", true)
      .maybeSingle();

    return new Response(
      JSON.stringify({ date: today, questions: ordered, completedAttempt: attempt || null }),
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
