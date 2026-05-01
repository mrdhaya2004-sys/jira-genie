import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders, validateAuth, unauthorizedResponse } from "../_shared/auth.ts";

interface SubmittedAnswer {
  question_id: string;
  selected_option: string | null;
}

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
    const { answers, time_seconds } = await req.json() as {
      answers: SubmittedAnswer[];
      time_seconds: number;
    };

    if (!Array.isArray(answers) || answers.length === 0) {
      return new Response(JSON.stringify({ error: "No answers provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date().toISOString().slice(0, 10);
    const ids = answers.map((a) => a.question_id);

    const { data: questions } = await supabase
      .from("qa_questions")
      .select("id, category, correct_option, explanation, option_a, option_b, option_c, option_d, question")
      .in("id", ids);

    const qMap = new Map((questions || []).map((q: any) => [q.id, q]));

    let score = 0;
    const detailed = answers.map((a) => {
      const q: any = qMap.get(a.question_id);
      const isCorrect = !!q && a.selected_option === q.correct_option;
      if (isCorrect) score++;
      return {
        question_id: a.question_id,
        selected_option: a.selected_option,
        is_correct: isCorrect,
        category: q?.category || "General",
        correct_option: q?.correct_option,
        explanation: q?.explanation,
      };
    });

    const { data: attempt, error: attemptErr } = await supabase
      .from("qa_attempts")
      .insert({
        user_id: userId,
        challenge_date: today,
        score,
        total: answers.length,
        time_seconds: Math.max(0, Math.floor(time_seconds || 0)),
        completed: true,
      })
      .select("id")
      .single();

    if (attemptErr || !attempt) throw attemptErr || new Error("Failed to record attempt");

    const answerRows = detailed.map((d) => ({
      attempt_id: attempt.id,
      user_id: userId,
      question_id: d.question_id,
      category: d.category,
      selected_option: d.selected_option,
      is_correct: d.is_correct,
    }));
    await supabase.from("qa_answers").insert(answerRows);

    return new Response(
      JSON.stringify({ attempt_id: attempt.id, score, total: answers.length, time_seconds, results: detailed }),
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
