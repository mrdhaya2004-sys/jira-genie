/**
 * sanitizeText — guarantee no raw JSON ever lands in the UI.
 *
 * If a string is itself a JSON object/array, or contains a JSON fragment,
 * we either flatten it into a human-readable string or strip the fragment.
 * Used everywhere we render an AI-produced text field.
 */

const looksLikeJson = (s: string) => /^[\s\n]*[\{\[]/.test(s) && /[\}\]][\s\n]*$/.test(s);

function flattenObject(o: any, depth = 0): string {
  if (o == null) return '';
  if (typeof o === 'string' || typeof o === 'number' || typeof o === 'boolean') return String(o);
  if (Array.isArray(o)) return o.map((x) => flattenObject(x, depth + 1)).filter(Boolean).join(', ');
  if (typeof o === 'object') {
    // Prefer common message-shaped keys first.
    for (const key of ['message', 'description', 'text', 'value', 'summary', 'title', 'content']) {
      if (typeof o[key] === 'string') return o[key];
    }
    return Object.entries(o)
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => `${k.replace(/[_-]/g, ' ')}: ${flattenObject(v, depth + 1)}`)
      .join(' · ');
  }
  return '';
}

export function sanitizeText(input: unknown, fallback = ''): string {
  if (input == null) return fallback;
  if (typeof input === 'object') return flattenObject(input) || fallback;
  let s = String(input).trim();
  if (!s) return fallback;

  // If the whole string is JSON, parse it and flatten.
  if (looksLikeJson(s)) {
    try { return flattenObject(JSON.parse(s)) || fallback; } catch { /* fall through */ }
  }

  // Strip ```json ... ``` fenced blocks.
  s = s.replace(/```(?:json)?\s*([\s\S]*?)```/gi, (_, body) => {
    try { return flattenObject(JSON.parse(body)); } catch { return ''; }
  });

  // Strip leftover braces-only fragments like {"language":"java"}.
  s = s.replace(/\{[^{}\n]{2,400}\}/g, (m) => {
    try { return flattenObject(JSON.parse(m)); } catch { return ''; }
  });

  return s.trim() || fallback;
}

export function sanitizeStringArray(input: unknown): string[] {
  if (!input) return [];
  if (!Array.isArray(input)) return [sanitizeText(input)].filter(Boolean);
  return input.map((x) => sanitizeText(x)).filter((s) => s.length > 0);
}
