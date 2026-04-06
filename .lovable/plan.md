
# Fix 2FA Login Flow - Plan

## Problem
When 2FA is enabled, the login flow breaks because:
1. The code signs the user in FIRST, then checks if 2FA is enabled
2. The `SIGNED_IN` auth event triggers navigation to the dashboard before the code can sign out and show the OTP screen
3. This creates a race condition where the user gets briefly authenticated then signed out, causing a broken experience

## Root Cause
In `LoginForm.tsx`, `handleSubmit` calls `signIn()` (line 80) before checking `totpData?.enabled` (line 92). The auth state listener in `AuthContext` reacts to `SIGNED_IN` immediately, potentially navigating away.

## Solution
Restructure the login flow to check 2FA status BEFORE authenticating:

### Step 1: Fix `LoginForm.tsx` handleSubmit logic
- Call `totp-check` first (already done)
- If 2FA is enabled, do NOT call `signIn()` yet — store credentials and show OTP screen
- Only call `signIn()` after OTP verification succeeds
- Store the pending password in a ref (not state, to avoid re-renders)

### Step 2: Fix `handle2FAVerified` 
- After OTP is verified via `totp-login-verify`, call `signIn()` with the stored credentials
- Navigate to dashboard on success

### Step 3: Fix `totp-login-verify` edge function
- The function currently uses `listUsers()` to find the user by email, which is inefficient
- The CORS import path is inconsistent (mixing v2.49.4 and v2.95.0) — standardize it
- The `corsHeaders` import from `@supabase/supabase-js@2.95.0/cors` is used across all TOTP functions — keep consistent

### Updated Login Flow
```text
1. User enters email + password
2. Call totp-check → { enabled: true/false }
3a. If 2FA disabled → signIn() → navigate to dashboard
3b. If 2FA enabled → store credentials → show OTP screen
4. User enters OTP → call totp-login-verify
5. If valid → signIn() with stored credentials → navigate to dashboard
```

## Files to Change

1. **`src/components/auth/LoginForm.tsx`**
   - Reorder: check 2FA before calling `signIn()`
   - Store password in useRef for re-use after OTP
   - Only authenticate after 2FA verification passes

2. **`supabase/functions/totp-login-verify/index.ts`**
   - Keep as-is (already validates OTP without requiring auth)
   - Minor: ensure consistent CORS headers

No database changes needed. No new files needed.

## Technical Details

The key change in `handleSubmit`:
```typescript
// BEFORE (broken):
const { error } = await signIn(email, password);  // triggers SIGNED_IN
if (totpData?.enabled) await supabase.auth.signOut(); // too late

// AFTER (fixed):
if (totpData?.enabled) {
  // Don't sign in yet - show OTP screen first
  pendingPasswordRef.current = password;
  setPendingEmail(email);
  setShow2FA(true);
  return;
}
const { error } = await signIn(email, password); // only if no 2FA
```

And in `handle2FAVerified`:
```typescript
const { error } = await signIn(pendingEmail, pendingPasswordRef.current);
// Navigate on success
```
