import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateAuth, corsHeaders, unauthorizedResponse } from "../_shared/auth.ts";
import { routeAIRequest } from "../_shared/hiveMindRouter.ts";

interface FileEntry {
  path: string;
  content: string;
}

interface AnalyzeRequest {
  sourceType: 'snippet' | 'files' | 'github' | 'gitlab';
  sourceLabel?: string;
  language?: string;
  framework?: string;
  code?: string;
  files?: FileEntry[];
  repoUrl?: string;
  branch?: string;
  githubToken?: string;
  gitlabToken?: string;
  confidenceThreshold?: number; // 0-100, default 80 — findings below this confidence are dropped
}


const SYSTEM_PROMPT = `You are Hive Code Analyzer — an elite AI code reviewer for QA automation, SDET, API testing, mobile automation, web automation, and software engineering.

You review source code and produce an enterprise-grade JSON report. You behave like SonarQube + DeepSource + Codacy + a senior code reviewer combined, specialized for Selenium, Appium, Playwright, Cypress, TestNG, JUnit, Cucumber, Rest Assured, Postman, Robot Framework.

You MUST respond with ONLY a single JSON object (no markdown fences, no commentary) matching:

{
  "language": string,                        // detected language
  "framework": string | null,                // detected framework if any
  "summary": string,                         // 3-5 sentence executive summary
  "overallScore": number,                    // 0-100
  "subScores": {
    "readability": number,                   // 0-100
    "maintainability": number,
    "stability": number,
    "performance": number,
    "security": number,
    "automationBestPractice": number,
    "scalability": number
  },
  "automationStability": {
    "score": number,                         // 0-100
    "risk": "low" | "medium" | "high",
    "reasons": string[]                      // e.g. "Thread.sleep", "Dynamic XPath", "Missing Explicit Wait"
  },
  "issues": [
    {
      "line": number,                        // 1-indexed line number, best effort
      "endLine": number | null,
      "severity": "critical" | "high" | "medium" | "low",
      "type": string,                        // e.g. "Broad Exception Handling", "Weak Assertion"
      "title": string,                       // 3-8 words
      "problem": string,                     // 1-2 sentences explaining WHAT is wrong with this exact snippet (no fix here)
      "suggestion": string,                  // 1-2 sentences describing the ACTION the developer should take (different wording from problem)
      "codeBefore": string,                  // the EXACT offending snippet copied verbatim from the source (1-6 lines)
      "codeAfter": string,                   // the IMPROVED replacement — MUST be syntactically different from codeBefore and actually implement the fix
      "evidence": string,                    // ONE line copied CHARACTER-FOR-CHARACTER from the source that proves this issue exists
      "confidence": number,                  // 0-100 — how certain you are this issue truly exists in THIS exact code
      "explanation": string,                 // WHY it is wrong, risk, impact
      "bestPractice": string                 // industry best practice in 1 sentence
    }
  ],
  "securityFindings": [
    { "title": string, "severity": "critical"|"high"|"medium"|"low", "line": number|null, "description": string, "fix": string, "evidence": string, "confidence": number }
  ],
  "performanceFindings": [
    { "title": string, "severity": "critical"|"high"|"medium"|"low", "line": number|null, "description": string, "fix": string, "evidence": string, "confidence": number }
  ],
  "testAutomationFindings": [
    { "title": string, "severity": "critical"|"high"|"medium"|"low", "line": number|null, "description": string, "fix": string, "evidence": string, "confidence": number }
  ],
  "refactors": {
    "refactored": { "code": string, "changes": string[], "benefits": string[] },
    "optimized":  { "code": string, "changes": string[], "benefits": string[] },
    "enterprise": { "code": string, "changes": string[], "benefits": string[] }
  },
  "expectedImprovements": string[]           // bullet list of overall expected gains
}

ZERO-HALLUCINATION VERIFICATION ENGINE (most important rules):
- You are a STATIC ANALYSIS ENGINE, not a creative writer. Report ONLY what is literally present in the supplied source code.
- Before emitting ANY issue or finding, locate the exact offending code in the source. Copy one real source line verbatim into "evidence" and the snippet into "codeBefore". If you cannot quote the exact source line, DO NOT emit the finding.
- NEVER report "Hardcoded Wait" / sleep issues unless the source literally contains Thread.sleep, time.sleep, sleep(, waitForTimeout, setTimeout or another fixed delay.
- NEVER report XPath issues unless the source actually contains an XPath (By.xpath, "//...").
- NEVER report CSS selector issues unless the source actually contains CSS selectors (By.cssSelector, querySelector, $("...")).
- NEVER invent SQL queries, API calls, HTTP requests, crypto usage, or secrets that are not literally in the code.
- ZERO findings for a category is a valid, correct result. ACCURACY IS MORE IMPORTANT THAN THE NUMBER OF FINDINGS.
- A server-side verifier discards any finding whose evidence does not appear in the source — fabricated findings are wasted output.
- Every issue and finding MUST include "confidence" (0-100). Only emit findings you are at least 80% confident genuinely exist in this exact code.

CATEGORY ANALYSIS (only for code that is actually present):
- SECURITY (securityFindings): hardcoded passwords/API keys/tokens, sensitive-data logging, SQL injection, insecure HTTP, weak crypto, unsafe file handling — ONLY when literally present.
- PERFORMANCE (performanceFindings): real fixed delays, redundant loops, repeated API/DB calls, inefficient collections, excessive DOM lookups, blocking I/O — ONLY when literally present.
- AUTOMATION (testAutomationFindings) — Selenium/Appium/Playwright/Cypress intelligence. Analyze ONLY aspects visible in the code: assertion quality (wrong assert direction, misleading assertion messages, missing assertions), locator stability, exception-handling breadth (e.g. catch (Throwable e) → catch (NoSuchElementException e) — improves debugging and avoids masking unrelated failures), explicit wait usage, Page Object Model compliance, logging, error recovery, maintainability.
- If a category genuinely has nothing to flag, return an EMPTY array. Never pad categories.

REFACTORS:
- Produce up to THREE variants ("refactored"=clean & readable, "optimized"=best performance, "enterprise"=production-grade with logging, error handling, POM, retries, config-driven). Each must compile/run in the detected language.
- Even SMALL improvements count: better variable naming (e.g. Boolean news → boolean isNewsDisplayed), narrower exception types (catch (Throwable) → catch (NoSuchElementException)), proper logging (System.out.println → logger.error), clearer assertions, explicit waits, comments, formatting, and structure are all valid refactors. Do NOT skip a variant just because the change is small.
- Each variant should differ from the ORIGINAL and ideally from other variants, but a minor naming/logging/exception improvement is acceptable. Only leave a variant's code as "" if the original truly already follows best practices for that level — and then list in changes[] why no improvement was needed.
- Each non-empty variant MUST list specific changes[] and benefits[].

OUTPUT QUALITY:
- Limit issues[] to the 25 most impactful. severityCount fields are recomputed server-side.
- For EVERY issue, codeAfter MUST differ from codeBefore (it must actually fix the bug). problem and suggestion MUST be written as distinct sentences. Never copy the same string into both.
- Be concrete, never write "investigate further" or "check this".`;

const EXT_LANG: Record<string, string> = {
  java: 'Java', py: 'Python', js: 'JavaScript', mjs: 'JavaScript', cjs: 'JavaScript',
  ts: 'TypeScript', tsx: 'TypeScript', cs: 'C#', kt: 'Kotlin', kts: 'Kotlin',
  swift: 'Swift', sql: 'SQL', sh: 'Shell', bash: 'Shell', robot: 'Robot Framework',
};

function detectLanguage(files: FileEntry[]): string {
  const counts: Record<string, number> = {};
  for (const f of files) {
    const ext = f.path.split('.').pop()?.toLowerCase() ?? '';
    const lang = EXT_LANG[ext];
    if (lang) counts[lang] = (counts[lang] ?? 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Unknown';
}

const REPO_FILE_EXTS = new Set(Object.keys(EXT_LANG));
const MAX_REPO_FILES = 25;
const MAX_TOTAL_CHARS = 180_000;

async function fetchGitHubRepo(repoUrl: string, token?: string, branch?: string): Promise<FileEntry[]> {
  const m = repoUrl.match(/github\.com\/([^/]+)\/([^/.]+)(?:\.git)?(?:\/tree\/([^/]+))?/i);
  if (!m) throw new Error('Invalid GitHub URL');
  const [, owner, repo, urlBranch] = m;
  const ref = branch || urlBranch || 'HEAD';
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'hive-code-analyzer',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Get default branch sha if needed
  let sha = ref;
  if (ref === 'HEAD') {
    const r = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (!r.ok) throw new Error(`GitHub: ${r.status} ${await r.text()}`);
    const info = await r.json();
    sha = info.default_branch;
  }

  const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`, { headers });
  if (!treeRes.ok) throw new Error(`GitHub tree: ${treeRes.status} ${await treeRes.text()}`);
  const tree = await treeRes.json();

  const candidates = (tree.tree || [])
    .filter((n: any) => n.type === 'blob' && REPO_FILE_EXTS.has(String(n.path).split('.').pop()?.toLowerCase() ?? ''))
    .slice(0, MAX_REPO_FILES);

  const out: FileEntry[] = [];
  let total = 0;
  for (const node of candidates) {
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${sha}/${node.path}`;
    try {
      const fr = await fetch(rawUrl, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!fr.ok) continue;
      const content = await fr.text();
      if (total + content.length > MAX_TOTAL_CHARS) break;
      total += content.length;
      out.push({ path: node.path, content });
    } catch { /* skip */ }
  }
  return out;
}

async function fetchGitLabRepo(repoUrl: string, token?: string, branch?: string): Promise<FileEntry[]> {
  const u = new URL(repoUrl);
  const host = u.host;
  const projectPath = u.pathname.replace(/^\//, '').replace(/\.git$/, '').replace(/\/-\/tree\/.+$/, '');
  const branchMatch = u.pathname.match(/\/-\/tree\/([^/]+)/);
  const ref = branch || branchMatch?.[1] || 'HEAD';
  const headers: Record<string, string> = { 'User-Agent': 'hive-code-analyzer' };
  if (token) headers['PRIVATE-TOKEN'] = token;
  const apiBase = `https://${host}/api/v4`;
  const encodedId = encodeURIComponent(projectPath);

  let sha = ref;
  if (ref === 'HEAD') {
    const r = await fetch(`${apiBase}/projects/${encodedId}`, { headers });
    if (!r.ok) throw new Error(`GitLab: ${r.status} ${await r.text()}`);
    const info = await r.json();
    sha = info.default_branch;
  }

  const treeRes = await fetch(`${apiBase}/projects/${encodedId}/repository/tree?recursive=true&per_page=100&ref=${encodeURIComponent(sha)}`, { headers });
  if (!treeRes.ok) throw new Error(`GitLab tree: ${treeRes.status} ${await treeRes.text()}`);
  const tree = await treeRes.json();
  const candidates = (tree || [])
    .filter((n: any) => n.type === 'blob' && REPO_FILE_EXTS.has(String(n.path).split('.').pop()?.toLowerCase() ?? ''))
    .slice(0, MAX_REPO_FILES);

  const out: FileEntry[] = [];
  let total = 0;
  for (const node of candidates) {
    const fileUrl = `${apiBase}/projects/${encodedId}/repository/files/${encodeURIComponent(node.path)}/raw?ref=${encodeURIComponent(sha)}`;
    try {
      const fr = await fetch(fileUrl, { headers });
      if (!fr.ok) continue;
      const content = await fr.text();
      if (total + content.length > MAX_TOTAL_CHARS) break;
      total += content.length;
      out.push({ path: node.path, content });
    } catch { /* skip */ }
  }
  return out;
}

function bundleFiles(files: FileEntry[]): string {
  return files.map(f => `\n===== FILE: ${f.path} =====\n${f.content}`).join('\n');
}

/**
 * Robustly extract a JSON object from an AI response. Strips markdown fences,
 * trims surrounding prose, and — if the JSON is truncated mid-stream — closes
 * any open strings/arrays/objects so we still get a usable (partial) report.
 */
function extractJSON(raw: string): any {
  let s = (raw || '').trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  const start = s.indexOf('{');
  if (start === -1) throw new Error('No JSON object found');
  s = s.slice(start);

  // First attempt: parse as-is.
  try { return JSON.parse(s); } catch { /* fallthrough to repair */ }

  // Repair: walk the string, track brace/bracket/string state, then close opens.
  let inStr = false, esc = false;
  const stack: string[] = [];
  let lastValidEnd = -1;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === '{' || c === '[') stack.push(c);
    else if (c === '}' || c === ']') { stack.pop(); if (stack.length === 0) lastValidEnd = i; }
  }

  // If the stream ended cleanly at some top-level close, use that.
  if (lastValidEnd > 0 && !inStr && stack.length === 0) {
    try { return JSON.parse(s.slice(0, lastValidEnd + 1)); } catch { /* keep going */ }
  }

  // Otherwise close open string + remove trailing partial token + close braces.
  let repaired = s;
  if (inStr) repaired += '"';
  // Iteratively strip dangling partial key/value/comma at the tail until stable.
  for (let n = 0; n < 6; n++) {
    const before = repaired;
    repaired = repaired
      .replace(/"[^"]*$/, '')          // partial unterminated key/value (after close)
      .replace(/:\s*$/, ': null')      // key with no value
      .replace(/,\s*$/, '')            // trailing comma
      .replace(/\s+$/, '');            // trailing whitespace
    if (repaired === before) break;
  }
  for (let i = stack.length - 1; i >= 0; i--) {
    repaired += stack[i] === '{' ? '}' : ']';
  }
  return JSON.parse(repaired);
}
/**
 * Fallback section extractor for AI responses that aren't valid JSON
 * (plain text, markdown, mixed output from smaller/custom models).
 * Splits content by category headings and turns each section into findings
 * so the UI always renders meaningful tabs instead of a blank screen.
 */
function buildFallbackReport(raw: string, language: string, framework?: string, sourceCode = ''): any {
  const text = (raw || '').replace(/```[\s\S]*?```/g, (m) => m).trim();

  // Section detection: match headings like "Security:", "## Security", "**Security**"
  const sectionNames = ['issues', 'security', 'performance', 'automation', 'refactor'];
  const sectionMap: Record<string, string> = {};
  const re = new RegExp(
    `(?:^|\\n)\\s*(?:#{1,6}\\s*|\\*\\*\\s*)?(${sectionNames.join('|')})(?:\\s*\\*\\*)?\\s*[:\\-]?\\s*\\n`,
    'gi',
  );
  const matches: { name: string; start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    matches.push({ name: m[1].toLowerCase(), start: m.index + m[0].length, end: text.length });
  }
  for (let i = 0; i < matches.length; i++) {
    if (i + 1 < matches.length) matches[i].end = matches[i + 1].start - 1;
    sectionMap[matches[i].name] = (sectionMap[matches[i].name] || '') + '\n' + text.slice(matches[i].start, matches[i].end);
  }

  const toFindings = (block?: string) => {
    if (!block) return [];
    const lines = block.split(/\n+/).map(l => l.replace(/^[\s\-\*\d\.\)]+/, '').trim()).filter(l => l.length > 8);
    return lines.slice(0, 15).map((line) => {
      const lower = line.toLowerCase();
      const severity = /critical|severe|fatal|injection|hardcoded|secret|password|api[ _-]?key/.test(lower)
        ? 'critical' : /high|risk|vulnerab/.test(lower) ? 'high'
        : /medium|moderate/.test(lower) ? 'medium' : 'low';
      const colonIdx = line.indexOf(':');
      const title = colonIdx > 0 && colonIdx < 80 ? line.slice(0, colonIdx).trim() : line.slice(0, 80).trim();
      const description = colonIdx > 0 ? line.slice(colonIdx + 1).trim() : line;
      return { title, severity, line: null, description, fix: '' };
    });
  };

  const issuesBlock = sectionMap['issues'];
  const issues = toFindings(issuesBlock).map((f) => ({
    line: null, endLine: null, severity: f.severity, type: 'Finding',
    title: f.title, problem: f.description, suggestion: '',
    codeBefore: '', codeAfter: '', explanation: f.description, bestPractice: '',
  }));

  const refactorBlock = sectionMap['refactor'] || '';
  const codeMatch = refactorBlock.match(/```[a-z]*\n([\s\S]*?)```/i);
  const refactored = codeMatch ? { code: codeMatch[1].trim(), changes: ['See AI response'], benefits: ['Improved readability'] } : undefined;

  const summary = text.slice(0, 600).replace(/\s+/g, ' ').trim();

  // Heuristic scoring from source code — never default to a flat 50/50.
  const src = sourceCode || '';
  const lc = src.toLowerCase();
  const penalty = (cond: boolean, n: number) => (cond ? n : 0);
  const securityPenalty =
    penalty(/password\s*=\s*["'][^"']+["']/i.test(src), 25) +
    penalty(/api[_-]?key\s*=\s*["'][^"']+["']/i.test(src), 25) +
    penalty(/http:\/\//.test(lc), 10);
  const perfPenalty =
    penalty(/thread\s*\.\s*sleep|time\s*\.\s*sleep|waitfortimeout|settimeout\s*\(\s*\d/i.test(src), 20) +
    penalty(/for\s*\([^)]*\)\s*\{[^}]*for\s*\(/.test(src), 10);
  const autoPenalty =
    penalty(/catch\s*\(\s*(throwable|exception|error)\s/i.test(src), 15) +
    penalty(/system\.out\.println|console\.log/i.test(src), 8) +
    penalty(/by\.xpath\(\s*["']\/\//i.test(src), 12);
  const clamp = (n: number) => Math.max(20, Math.min(95, n));
  const security = clamp(95 - securityPenalty);
  const performance = clamp(92 - perfPenalty);
  const automationBestPractice = clamp(90 - autoPenalty);
  const readability = clamp(85 - penalty(src.length > 4000, 10));
  const maintainability = clamp(82 - autoPenalty / 2);
  const stability = clamp(88 - perfPenalty / 2 - autoPenalty / 2);
  const scalability = clamp(80 - perfPenalty / 2);
  const overall = Math.round((readability + maintainability + stability + performance + security + automationBestPractice + scalability) / 7);
  const stabRisk: 'low' | 'medium' | 'high' = stability >= 80 ? 'low' : stability >= 60 ? 'medium' : 'high';

  return {
    language,
    framework: framework || null,
    summary: summary || 'AI returned an unstructured response. Showing best-effort sections.',
    overallScore: overall,
    subScores: { readability, maintainability, stability, performance, security, automationBestPractice, scalability },
    automationStability: { score: stability, risk: stabRisk, reasons: [] },
    issues,
    securityFindings: toFindings(sectionMap['security']),
    performanceFindings: toFindings(sectionMap['performance']),
    testAutomationFindings: toFindings(sectionMap['automation']),
    refactors: refactored ? { refactored } : {},
    expectedImprovements: [],
  };
}

// ===================== Code Verification Engine =====================
// Every AI finding must be traceable to the actual uploaded source code.
// Findings whose evidence/snippet does not exist in the source, whose claim
// type has no matching code pattern, or whose confidence is below the
// threshold are discarded server-side.

const normCode = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

/** True when the majority of non-trivial snippet lines literally exist in the source. */
function snippetInSource(snippet: string, normSource: string): boolean {
  const lines = String(snippet ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.replace(/[^a-zA-Z0-9]/g, '').length >= 4);
  if (lines.length === 0) return false;
  let hit = 0;
  for (const l of lines) if (normSource.includes(normCode(l))) hit++;
  return hit / lines.length >= 0.6;
}

/** Claim → required code pattern. If a finding makes the claim but the source
 *  has no matching code, the finding is a hallucination and gets dropped. */
const CLAIM_RULES: { claim: RegExp; evidence: RegExp }[] = [
  {
    claim: /hard.?coded\s+wait|thread\s*\.?\s*sleep|static\s+wait|fixed\s+(wait|delay)|implicit\s+sleep|sleep\s+statement/i,
    evidence: /thread\s*\.\s*sleep|time\s*\.\s*sleep|\bsleep\s*\(|waitfortimeout|settimeout\s*\(|\bwait\s*\(\s*\d|\bpause\s*\(\s*\d|delay\s*\(\s*\d/i,
  },
  { claim: /xpath/i, evidence: /xpath|\/\/[a-zA-Z*@]/i },
  { claim: /css\s*selector/i, evidence: /csss?elector|by\.css|queryselector|\$\(\s*['"`]/i },
  {
    claim: /sql\s*injection|\bsql\s*quer|raw\s+sql/i,
    evidence: /\bselect\b|\binsert\s+into\b|\bupdate\s+\w+\s+set\b|\bdelete\s+from\b|preparedstatement|createstatement|executequery|executeupdate|\bsql\b/i,
  },
  {
    claim: /\bapi\s*(call|request)|http\s*request|rest\s*(call|request)|network\s*call/i,
    evidence: /\bhttps?:|fetch\s*\(|axios|restassured|httpclient|urlconnection|requests\.|okhttp|webclient|resttemplate/i,
  },
  {
    claim: /hard.?coded\s+(password|secret|credential|key|token)|api\s*key|plaintext\s+password|exposed\s+(secret|credential)/i,
    evidence: /password|passwd|\bpwd\b|secret|token|api.?key|credential|bearer/i,
  },
  { claim: /implicit\s*wait/i, evidence: /implicitlywait|implicit_wait|implicitly_wait/i },
  { claim: /thread\s+safety|race\s+condition/i, evidence: /\bthread\b|runnable|executor|synchronized|async|await|promise|goroutine|mutex|lock/i },
];

function claimUnsupported(claimText: string, normSource: string): boolean {
  for (const rule of CLAIM_RULES) {
    if (rule.claim.test(claimText) && !rule.evidence.test(normSource)) return true;
  }
  return false;
}




serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const auth = await validateAuth(req);
    if (!auth.user) return unauthorizedResponse(auth.error || 'Unauthorized');
    const authHeader = req.headers.get('Authorization')!;

    const body = await req.json() as AnalyzeRequest;

    let files: FileEntry[] = [];
    let sourceLabel = body.sourceLabel || '';

    if (body.sourceType === 'snippet') {
      if (!body.code || body.code.trim().length === 0) {
        return new Response(JSON.stringify({ error: 'Empty code snippet' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      files = [{ path: `snippet.${(body.language || 'txt').toLowerCase()}`, content: body.code }];
      sourceLabel ||= 'Snippet';
    } else if (body.sourceType === 'files') {
      files = (body.files || []).filter(f => f.content?.length).slice(0, 20);
      if (files.length === 0) return new Response(JSON.stringify({ error: 'No files supplied' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      sourceLabel ||= `${files.length} files`;
    } else if (body.sourceType === 'github') {
      if (!body.repoUrl) return new Response(JSON.stringify({ error: 'Missing GitHub URL' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      files = await fetchGitHubRepo(body.repoUrl, body.githubToken, body.branch);
      if (files.length === 0) return new Response(JSON.stringify({ error: 'No supported source files found in repo' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      sourceLabel ||= body.repoUrl;
    } else if (body.sourceType === 'gitlab') {
      if (!body.repoUrl) return new Response(JSON.stringify({ error: 'Missing GitLab URL' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      files = await fetchGitLabRepo(body.repoUrl, body.gitlabToken, body.branch);
      if (files.length === 0) return new Response(JSON.stringify({ error: 'No supported source files found in repo' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      sourceLabel ||= body.repoUrl;
    }

    const detectedLang = body.language || detectLanguage(files);
    let bundle = bundleFiles(files);
    if (bundle.length > MAX_TOTAL_CHARS) {
      bundle = bundle.slice(0, MAX_TOTAL_CHARS) + `\n\n[...truncated ${bundle.length - MAX_TOTAL_CHARS} chars...]`;
    }

    const userPrompt = `Source type: ${body.sourceType}
Source: ${sourceLabel}
Hinted language: ${detectedLang}
Hinted framework: ${body.framework || 'auto-detect'}
File count: ${files.length}

=== CODE ===
${bundle}
=== END CODE ===

Produce the JSON report exactly per the system prompt. Tie EVERY issue to a real line + snippet from the code above.`;

    const aiResponse = await routeAIRequest(
      authHeader,
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: 'Respond with ONLY a single JSON object, no markdown fences, no commentary.\n\n' + userPrompt },
      ],
      false,
      {
        defaultModel: bundle.length > 40_000 ? 'google/gemini-2.5-pro' : 'google/gemini-3-flash-preview',
        // Deterministic static-analysis output — zero temperature prevents hallucinated findings.
        extraBody: { temperature: 0, top_p: 1 },
      },
    );

    if (!aiResponse.ok) {
      const txt = await aiResponse.text();
      console.error('AI gateway error', aiResponse.status, txt);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, please retry shortly.', code: 'AI_RATE_LIMITED' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted.', code: 'AI_CREDITS_EXHAUSTED' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ error: 'AI gateway error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const aiJson = await aiResponse.json();
    const content: string = aiJson.choices?.[0]?.message?.content ?? '';
    const finishReason = aiJson.choices?.[0]?.finish_reason || aiJson.choices?.[0]?.stop_reason;
    let parsed: any;
    let degradedNotice: string | undefined;
    try {
      parsed = extractJSON(content);
    } catch (e) {
      console.warn('Structured JSON parse failed, falling back to section extraction', e, 'finish_reason=', finishReason);
      parsed = buildFallbackReport(content, detectedLang, body.framework, files.map(f => f.content).join('\n'));
      degradedNotice = finishReason === 'length' || finishReason === 'max_tokens'
        ? 'Analysis completed with a condensed report — some sections were reconstructed from the raw response.'
        : 'Analysis completed with a condensed report — sections were reconstructed from the raw response.';
    }

    // ===== Code Verification Engine: drop hallucinated / unverified / low-confidence findings =====
    const confidenceThreshold = Math.min(100, Math.max(0, Number(body.confidenceThreshold) || 80));
    const sourceText = files.map(f => f.content).join('\n');
    const normSource = normCode(sourceText);
    let droppedCount = 0;

    const passesConfidence = (v: any) => {
      const conf = Number(v?.confidence);
      return !Number.isFinite(conf) || conf >= confidenceThreshold;
    };
    const verifyIssue = (i: any): boolean => {
      const claimText = `${i.type ?? ''} ${i.title ?? ''} ${i.problem ?? ''}`;
      if (claimUnsupported(claimText, normSource)) return false;
      const evidence = String(i.evidence || i.codeBefore || '');
      if (evidence.trim() && !snippetInSource(evidence, normSource)) return false;
      return passesConfidence(i);
    };
    const verifyFinding = (f: any): boolean => {
      const claimText = `${f.title ?? ''} ${f.description ?? ''}`;
      if (claimUnsupported(claimText, normSource)) return false;
      const evidence = String(f.evidence || '');
      if (evidence.trim() && !snippetInSource(evidence, normSource)) return false;
      return passesConfidence(f);
    };

    // Skip verification in degraded (unstructured) mode — those findings carry no evidence fields.
    if (!degradedNotice) {
      const allIssues = Array.isArray(parsed.issues) ? parsed.issues : [];
      parsed.issues = allIssues.filter(verifyIssue);
      droppedCount += allIssues.length - parsed.issues.length;
      for (const key of ['securityFindings', 'performanceFindings', 'testAutomationFindings'] as const) {
        const all = Array.isArray(parsed[key]) ? parsed[key] : [];
        parsed[key] = all.filter(verifyFinding);
        droppedCount += all.length - parsed[key].length;
      }
      if (droppedCount > 0) console.log(`Verification engine dropped ${droppedCount} unverified/low-confidence findings`);
    }

    // ===== Refactor validation: only discard variants that are byte-identical to the ORIGINAL.
    // Variants similar to each other are kept — small improvements (renaming, logging, exception narrowing) are valid.
    const refactorsObj = (parsed.refactors && typeof parsed.refactors === 'object') ? parsed.refactors : {};
    for (const v of ['refactored', 'optimized', 'enterprise']) {
      const code = String(refactorsObj[v]?.code ?? '');
      if (!code.trim()) { delete refactorsObj[v]; continue; }
      if (normCode(code) === normSource) {
        console.log(`Refactor variant "${v}" discarded — identical to original source`);
        delete refactorsObj[v];
      }
    }
    parsed.refactors = refactorsObj;

    const verificationNotice = droppedCount > 0
      ? `${droppedCount} unverified or low-confidence finding${droppedCount === 1 ? ' was' : 's were'} filtered out by the code verification engine (threshold ${confidenceThreshold}%).`
      : undefined;

    // Recompute severity counts + sanitize duplicate before/after & problem/suggestion
    const norm = (v: any) => String(v ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
    const rawIssues = Array.isArray(parsed.issues) ? parsed.issues : [];
    const issues = rawIssues.map((i: any) => {
      const before = String(i.codeBefore ?? '');
      const after = String(i.codeAfter ?? '');
      const problem = String(i.problem ?? '');
      const suggestion = String(i.suggestion ?? '');
      const dupCode = before && norm(before) === norm(after);
      const dupText = problem && norm(problem) === norm(suggestion);
      return {
        ...i,
        codeBefore: before,
        codeAfter: dupCode ? '' : after,
        problem,
        suggestion: dupText ? '' : suggestion,
        suggestionMissing: dupText || !suggestion.trim(),
        codeAfterMissing: dupCode || !after.trim(),
      };
    });

    const sevCounts = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const i of issues) {
      const s = String(i.severity || 'low').toLowerCase();
      if (s in sevCounts) (sevCounts as any)[s]++;
    }

    // Persist via service role (uses service to bypass RLS — user_id is set explicitly)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.49.4');
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: inserted, error: insErr } = await admin.from('code_analyses').insert({
      user_id: auth.user.id,
      source_type: body.sourceType,
      source_label: sourceLabel.slice(0, 500),
      language: parsed.language || detectedLang,
      framework: parsed.framework || body.framework || null,
      overall_score: Math.round(Number(parsed.overallScore) || 0),
      sub_scores: parsed.subScores || {},
      automation_stability: parsed.automationStability || {},
      summary: parsed.summary || '',
      critical_count: sevCounts.critical,
      high_count: sevCounts.high,
      medium_count: sevCounts.medium,
      low_count: sevCounts.low,
      security_findings: parsed.securityFindings || [],
      performance_findings: parsed.performanceFindings || [],
      test_automation_findings: parsed.testAutomationFindings || [],
      raw_code: bundle.slice(0, 200_000),
    }).select('id').single();

    if (insErr || !inserted) {
      console.error('Insert analysis failed', insErr);
      return new Response(JSON.stringify({ error: 'Failed to save analysis' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const analysisId = inserted.id;

    if (issues.length) {
      await admin.from('code_analysis_issues').insert(issues.slice(0, 50).map((i: any) => ({
        analysis_id: analysisId,
        user_id: auth.user!.id,
        line_number: Number(i.line) || null,
        end_line: Number(i.endLine) || null,
        severity: ['critical','high','medium','low'].includes(String(i.severity).toLowerCase()) ? String(i.severity).toLowerCase() : 'low',
        issue_type: String(i.type || '').slice(0, 100),
        title: String(i.title || '').slice(0, 200),
        problem: String(i.problem || '').slice(0, 2000),
        suggestion: String(i.suggestion || '').slice(0, 2000),
        code_before: String(i.codeBefore || '').slice(0, 4000),
        code_after: String(i.codeAfter || '').slice(0, 4000),
        explanation: String(i.explanation || '').slice(0, 2000),
        best_practice: String(i.bestPractice || '').slice(0, 1000),
      })));
    }

    const refactors = parsed.refactors || {};
    const variants = ['refactored', 'optimized', 'enterprise'] as const;
    const refactorRows = variants
      .filter(v => refactors[v]?.code)
      .map(v => ({
        analysis_id: analysisId,
        user_id: auth.user!.id,
        variant: v,
        code: String(refactors[v].code).slice(0, 200_000),
        changes: refactors[v].changes || [],
        benefits: refactors[v].benefits || [],
        expected_improvements: parsed.expectedImprovements || [],
      }));
    if (refactorRows.length) await admin.from('code_analysis_refactors').insert(refactorRows);

    return new Response(JSON.stringify({
      analysisId,
      analysis: {
        ...parsed,
        sevCounts,
        issues,
        degradedNotice,
        verificationNotice,
        confidenceThreshold,
      },
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('hive-code-analyzer error', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
