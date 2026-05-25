// Shared SSRF guard for user-supplied URLs used in server-side fetch().
// Blocks loopback, link-local, RFC1918 private ranges, and non-http(s) schemes.

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/i,
  /^fd[0-9a-f]{2}:/i,
  /^fe80:/i,
  /\.internal$/i,
  /\.local$/i,
];

export interface SafeUrlOptions {
  /** Optional hostname allowlist (suffix match, e.g. ".openai.azure.com"). */
  allowedHostSuffixes?: string[];
}

export function assertSafeExternalUrl(rawUrl: string, opts: SafeUrlOptions = {}): URL {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL");
  }

  if (u.protocol !== "https:" && u.protocol !== "http:") {
    throw new Error("Only http(s) URLs are allowed");
  }
  // Disallow plain HTTP except to public hosts is still risky — require HTTPS.
  if (u.protocol !== "https:") {
    throw new Error("Only HTTPS URLs are allowed");
  }

  const host = u.hostname.toLowerCase();
  if (!host) throw new Error("URL must include a hostname");

  for (const re of PRIVATE_HOST_PATTERNS) {
    if (re.test(host)) {
      throw new Error("URL host is not allowed");
    }
  }

  if (opts.allowedHostSuffixes && opts.allowedHostSuffixes.length > 0) {
    const ok = opts.allowedHostSuffixes.some((s) =>
      host === s.replace(/^\./, "") || host.endsWith(s.startsWith(".") ? s : `.${s}`)
    );
    if (!ok) throw new Error("URL host is not in the allowlist");
  }

  return u;
}

export function allowedSuffixesForProvider(provider: string): string[] | undefined {
  switch (provider) {
    case "azure_openai":
      return [".openai.azure.com", ".azure-api.net", ".cognitiveservices.azure.com"];
    case "custom":
    case "local_llm":
      return undefined; // any public host
    default:
      return undefined;
  }
}
