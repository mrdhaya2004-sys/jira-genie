import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

// Check if a user has 2FA enabled (by email, no auth needed - used during login)
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const emailLower = email.toLowerCase();

    // Rate limit enumeration: cap at 20 lookups per email per minute
    const since = new Date(Date.now() - 60 * 1000).toISOString();
    const { count: recentCount } = await serviceClient
      .from("totp_attempts")
      .select("*", { count: "exact", head: true })
      .eq("email_lower", emailLower)
      .gte("attempted_at", since);

    if ((recentCount ?? 0) >= 20) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again shortly." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Uniform delay to slow timing-based enumeration
    await new Promise((r) => setTimeout(r, 200));

    const { data: { users } } = await serviceClient.auth.admin.listUsers();
    const targetUser = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!targetUser) {
      // Don't reveal if user exists
      return new Response(JSON.stringify({ enabled: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: totpRecord } = await serviceClient
      .from("user_totp")
      .select("is_enabled")
      .eq("user_id", targetUser.id)
      .eq("is_enabled", true)
      .maybeSingle();

    return new Response(JSON.stringify({ enabled: !!totpRecord }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
