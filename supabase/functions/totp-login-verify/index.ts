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
    const { email, otp } = await req.json();
    
    if (!email || !otp || !/^\d{6}$/.test(otp)) {
      return new Response(JSON.stringify({ error: "Email and valid 6-digit OTP are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Look up user by email
    const { data: { users }, error: listError } = await serviceClient.auth.admin.listUsers();
    if (listError) {
      return new Response(JSON.stringify({ error: "Internal error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailLower = email.toLowerCase();

    // Rate limit: max 5 failed attempts per email in last 15 minutes
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

    // Slow down enumeration
    await new Promise((r) => setTimeout(r, 800));

    const targetUser = users?.find(u => u.email?.toLowerCase() === emailLower);
    if (!targetUser) {
      await serviceClient.from("totp_attempts").insert({ email_lower: emailLower, succeeded: false });
      return new Response(JSON.stringify({ error: "Invalid code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: totpRecord, error: fetchError } = await serviceClient
      .from("user_totp")
      .select("totp_secret, is_enabled")
      .eq("user_id", targetUser.id)
      .eq("is_enabled", true)
      .single();

    if (fetchError || !totpRecord) {
      await serviceClient.from("totp_attempts").insert({ email_lower: emailLower, succeeded: false });
      return new Response(JSON.stringify({ error: "2FA not enabled for this user" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isValid = await verifyTOTP(totpRecord.totp_secret, otp);
    await serviceClient.from("totp_attempts").insert({ email_lower: emailLower, succeeded: isValid });

    return new Response(JSON.stringify({ valid: isValid }), {
      status: isValid ? 200 : 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
