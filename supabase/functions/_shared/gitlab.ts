import { assertSafeExternalUrl } from "./ssrfGuard.ts";

export interface GitLabConn {
  base_url: string;
  encrypted_token: string;
}

export class GitLabConnectionError extends Error {
  status = 400;
}

export function sanitizeBaseUrl(raw: string): string {
  const cleaned = (raw || "https://gitlab.com").trim();
  if (!cleaned) throw new Error("Enter a valid GitLab URL.");
  const withScheme = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
  const u = assertSafeExternalUrl(withScheme);

  // Reduce to origin only — users often paste page URLs like:
  // /dashboard/projects, /groups/<group>, /-/projects, or URLs with query/hash.
  // GitLab's REST API must always be built from <origin>/api/v4/*.
  return `${u.protocol}//${u.host}`;
}

export function gitlabApiUrl(baseUrl: string, path: string): string {
  const base = sanitizeBaseUrl(baseUrl);
  const cleanPath = `/${path}`
    .replace(/^\/+/g, "/")
    .replace(/^\/api\/v4\/?/i, "/");
  return `${base}/api/v4${cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`}`;
}

export function toGitLabConnectionError(error: unknown, baseUrl?: string): GitLabConnectionError {
  const message = error instanceof Error ? error.message : String(error || "Unknown error");
  const normalized = baseUrl ? sanitizeBaseUrl(baseUrl) : "the GitLab URL";
  const lower = message.toLowerCase();
  const friendly = lower.includes("dns error") || lower.includes("failed to lookup") || lower.includes("name or service not known")
    ? `We could not resolve ${normalized}. Enter the public GitLab root URL, or allow Lovable Cloud to reach this self-hosted GitLab host through DNS/firewall rules.`
    : lower.includes("connection refused") || lower.includes("connect") || lower.includes("timed out")
      ? `We could not reach ${normalized}. Confirm this is the GitLab root URL and that the host is accessible from Lovable Cloud.`
      : `Unable to connect to ${normalized}. Confirm this is a valid GitLab root URL.`;

  return new GitLabConnectionError(friendly);
}

export async function gitlabFetch(
  conn: GitLabConn,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const url = gitlabApiUrl(conn.base_url, path);
  const headers = new Headers(init.headers || {});
  headers.set("PRIVATE-TOKEN", conn.encrypted_token);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  try {
    return await fetch(url, { ...init, headers });
  } catch (error) {
    throw toGitLabConnectionError(error, conn.base_url);
  }
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
