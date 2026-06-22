## Goal
Force GitHub connections through `api.github.com` and prove it with logs, so a GitHub URL can never hit GitLab's `/api/v4/user`.

## Root cause
Backend currently auto‑detects the provider from the URL host only. There is no explicit signal from the UI and no log line confirming which branch ran, so a stale deployment, a typo'd host, or an SSRF‑guard re‑throw can silently fall into the GitLab branch — producing the exact error you saw: "Please enter the GitLab root URL" (that string only exists in the GitLab 404 path inside `supabase/functions/gitlab-connect/index.ts`).

## Changes

### 1. `src/components/gitlab/GitLabConnectionGate.tsx`
- Pass the selected provider explicitly on submit: `connect(baseUrl, token, provider)`.
- On submit, if `provider === 'github'` and the URL host is not a GitHub host, normalize `baseUrl` to `https://github.com` before calling.

### 2. `src/hooks/useGitLabConnection.ts`
- Update `connect(base_url, token, provider?)` to forward `provider` in the invoke body.

### 3. `supabase/functions/gitlab-connect/index.ts` — provider‑first routing
- Read `provider` from the request body. If present (`'github' | 'gitlab'`), it wins. Otherwise fall back to host detection.
- If `provider === 'github'` but the URL host is a GitLab host (or vice versa), return a clear 200 error: "Provider/URL mismatch — selected GitHub but URL is …".
- For GitHub: always call `https://api.github.com/user` for `github.com` / `www.github.com` / `api.github.com`; use `https://{host}/api/v3/user` only for enterprise hosts. Never call `gitlabFetch` / `gitlabApiUrl` in this branch.
- Add explicit debug logs BEFORE the network call:
  ```
  console.log('[connect] Provider:', provider);
  console.log('[connect] Endpoint:', apiUrl);
  console.log('[connect] Connection Type:', provider === 'github' ? 'GitHub PAT (Bearer)' : 'GitLab PAT (PRIVATE-TOKEN)');
  ```
- GitHub headers: `Authorization: Bearer <token>`, `Accept: application/vnd.github+json`, `X-GitHub-Api-Version: 2022-11-28`.
- GitLab headers (unchanged): `PRIVATE-TOKEN: <token>`, URL `${base}/api/v4/user` via `gitlabFetch`.
- Persist `provider` alongside the connection row (use existing columns; no schema change — `provider` is already returned in the response).

### 4. Verification
- Use `supabase--curl_edge_functions` to POST to `/gitlab-connect` with `{ provider: 'github', base_url: 'https://github.com', token: '<dummy>' }` and confirm logs show `Endpoint: https://api.github.com/user` and a 401 from GitHub (not a 404 from GitLab).
- Repeat with `{ provider: 'gitlab', base_url: 'https://gitlab.com', token: '<dummy>' }` and confirm logs show `/api/v4/user`.

## Out of scope
- No schema migration. No changes to repo/branch/workflow fetch endpoints in this round — once `gitlab-connect` is correctly routed, those flows (which use the stored `base_url`) can be split next. I'll note follow‑ups for `gitlab-sync` / `hive-code-analyzer` to branch on host the same way.