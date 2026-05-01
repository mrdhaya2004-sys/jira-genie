import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders, validateAuth, unauthorizedResponse } from "../_shared/auth.ts";

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
    const { data: attempts } = await supabase
      .from("qa_attempts")
      .select("score, total, time_seconds, challenge_date, completed")
      .eq("user_id", userId)
      .eq("completed", true)
      .order("challenge_date", { ascending: false })
      .limit(60);

    const { data: answers } = await supabase
      .from("qa_answers")
      .select("category, is_correct")
      .eq("user_id", userId);

    // Per-category accuracy
    const catMap = new Map<string, { correct: number; total: number }>();
    for (const a of answers || []) {
      const cur = catMap.get(a.category) || { correct: 0, total: 0 };
      cur.total++;
      if (a.is_correct) cur.correct++;
      catMap.set(a.category, cur);
    }
    const categories = Array.from(catMap.entries())
      .map(([category, v]) => ({
        category,
        correct: v.correct,
        total: v.total,
        accuracy: v.total ? Math.round((v.correct / v.total) * 100) : 0,
      }))
      .sort((a, b) => a.accuracy - b.accuracy);

    const weakAreas = categories.filter((c) => c.total >= 3 && c.accuracy < 60).slice(0, 4);
    const strongAreas = [...categories].sort((a, b) => b.accuracy - a.accuracy).filter((c) => c.total >= 3 && c.accuracy >= 80).slice(0, 3);

    // Streak (consecutive days ending today or yesterday)
    const dates = new Set((attempts || []).map((a: any) => a.challenge_date));
    let streak = 0;
    const d = new Date();
    while (true) {
      const key = d.toISOString().slice(0, 10);
      if (dates.has(key)) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else if (streak === 0) {
        // allow starting from yesterday
        d.setDate(d.getDate() - 1);
        const y = d.toISOString().slice(0, 10);
        if (dates.has(y)) {
          streak++;
          d.setDate(d.getDate() - 1);
        } else break;
      } else break;
    }

    const totalAttempts = (attempts || []).length;
    const avgScore = totalAttempts
      ? Math.round(((attempts || []).reduce((s: number, a: any) => s + a.score, 0) / totalAttempts) * 10) / 10
      : 0;
    const bestScore = (attempts || []).reduce((m: number, a: any) => Math.max(m, a.score), 0);

    return new Response(
      JSON.stringify({
        totalAttempts,
        avgScore,
        bestScore,
        streak,
        recent: (attempts || []).slice(0, 7),
        categories,
        weakAreas,
        strongAreas,
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
