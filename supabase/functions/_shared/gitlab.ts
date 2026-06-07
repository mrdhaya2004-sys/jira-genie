import { assertSafeExternalUrl } from "./ssrfGuard.ts";

export interface GitLabConn {
  base_url: string;
  encrypted_token: string;
}

export function sanitizeBaseUrl(raw: string): string {
  const cleaned = (raw || "https://gitlab.com").trim().replace(/\/+$/, "");
  const withScheme = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
  const u = assertSafeExternalUrl(withScheme);
  // Reduce to origin — users often paste a full dashboard URL (e.g. /dashboard/projects).
  // The GitLab API lives at <origin>/api/v4, so strip any path/query/hash.
  return `${u.protocol}//${u.host}`;
}

export async function gitlabFetch(
  conn: GitLabConn,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const base = sanitizeBaseUrl(conn.base_url);
  const url = `${base}/api/v4${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init.headers || {});
  headers.set("PRIVATE-TOKEN", conn.encrypted_token);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return await fetch(url, { ...init, headers });
}

export function statusBucket(status: string): "pending" | "running" | "success" | "failed" | "canceled" | "skipped" {
  switch (status) {
    case "created":
    case "waiting_for_resource":
    case "preparing":
    case "pending":
    case "scheduled":
    case "manual":
      return "pending";
    case "running":
      return "running";
    case "success":
      return "success";
    case "failed":
      return "failed";
    case "canceled":
      return "canceled";
    case "skipped":
      return "skipped";
    default:
      return "pending";
  }
}

export function isTerminal(status: string): boolean {
  return ["success", "failed", "canceled", "skipped"].includes(statusBucket(status));
}
