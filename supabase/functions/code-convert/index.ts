import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, fromLanguage, toLanguage } = await req.json();

    if (!code || !toLanguage) {
      return new Response(JSON.stringify({ error: "Missing code or target language" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Convert the following ${fromLanguage || "code"} code to ${toLanguage}. 
Rules:
- Preserve the exact same logic and functionality
- Use idiomatic patterns for the target language
- Include necessary imports/headers
- Return ONLY the converted code inside a single fenced code block, no explanation

\`\`\`${fromLanguage || ""}
${code}
\`\`\``;

    const res = await fetch("https://eykuzauxcxaaroadybst.supabase.co/functions/v1/proxy/ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a code conversion expert. Convert code between programming languages accurately. Return ONLY the converted code in a fenced code block, nothing else." },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
      }),
    });

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content || "";

    // Extract code from fenced block
    const match = raw.match(/```[\w]*\n([\s\S]*?)```/);
    const convertedCode = match ? match[1].trim() : raw.trim();

    return new Response(JSON.stringify({ convertedCode }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
