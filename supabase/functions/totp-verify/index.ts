import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { decodeBase32 } from "https://deno.land/std@0.224.0/encoding/base32.ts";

async function generateTOTP(secret: string, timeStep: number = 0): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const counter = Math.floor(now / 30) + timeStep;
  
  const counterBytes = new Uint8Array(8);
  let tmp = counter;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = tmp & 0xff;
    tmp = Math.floor(tmp / 256);
  }

  const keyBytes = decodeBase32(secret);
  const key = await crypto.subtle.importKey(
    "raw", keyBytes, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, counterBytes));
  
  const offset = sig[sig.length - 1] & 0xf;
  const code = ((sig[offset] & 0x7f) << 24 |
    (sig[offset + 1] & 0xff) << 16 |
    (sig[offset + 2] & 0xff) << 8 |
    (sig[offset + 3] & 0xff)) % 1000000;
  
  return code.toString().padStart(6, "0");
}

async function verifyTOTP(secret: string, otp: string): Promise<boolean> {
  // Check current and ±1 time step for clock drift tolerance
  for (const step of [-1, 0, 1]) {
    const expected = await generateTOTP(secret, step);
    if (expected === otp) return true;
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { otp, action } = await req.json();
    if (!otp || typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
      return new Response(JSON.stringify({ error: "Valid 6-digit OTP is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const emailLower = (user.email ?? "").toLowerCase();

    // Rate limit: max 5 failed attempts per user in last 15 minutes
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count: failCount } = await serviceClient
      .from("totp_attempts")
      .select("*", { count: "exact", head: true })
      .eq("email_lower", emailLower)
      .eq("succeeded", false)
      .gte("attempted_at", since);

    if ((failCount ?? 0) >= 5) {
      return new Response(JSON.stringify({ error: "Too many failed attempts. Try again in 15 minutes." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: totpRecord, error: fetchError } = await serviceClient
      .from("user_totp")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (fetchError || !totpRecord) {
      return new Response(JSON.stringify({ error: "2FA not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isValid = await verifyTOTP(totpRecord.totp_secret, otp);

    // Record attempt (and apply consistent slowdown on failure)
    await serviceClient.from("totp_attempts").insert({ email_lower: emailLower, succeeded: isValid });

    if (!isValid) {
      await new Promise((r) => setTimeout(r, 800));
      return new Response(JSON.stringify({ error: "Invalid OTP. Please try again.", valid: false }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If enabling 2FA
    if (action === "enable") {
      await serviceClient
        .from("user_totp")
        .update({ is_enabled: true, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
    }

    // If disabling 2FA
    if (action === "disable") {
      await serviceClient
        .from("user_totp")
        .delete()
        .eq("user_id", user.id);
    }

    return new Response(JSON.stringify({ valid: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
