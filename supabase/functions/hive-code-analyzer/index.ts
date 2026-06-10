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
      "type": string,                        // e.g. "Hardcoded Wait", "Flaky Locator", "Null Pointer Risk"
      "title": string,                       // 3-8 words
      "problem": string,                     // 1-2 sentences explaining what is wrong
      "suggestion": string,                  // actionable fix
      "codeBefore": string,                  // the offending snippet (1-6 lines)
      "codeAfter": string,                   // improved replacement
      "explanation": string,                 // WHY it is wrong, risk, impact
      "bestPractice": string                 // industry best practice in 1 sentence
    }
  ],
  "securityFindings": [
    { "title": string, "severity": "critical"|"high"|"medium"|"low", "line": number|null, "description": string, "fix": string }
  ],
  "performanceFindings": [
    { "title": string, "severity": "critical"|"high"|"medium"|"low", "line": number|null, "description": string, "fix": string }
  ],
  "testAutomationFindings": [
    { "title": string, "severity": "critical"|"high"|"medium"|"low", "line": number|null, "description": string, "fix": string }
  ],
  "refactors": {
    "refactored": { "code": string, "changes": string[], "benefits": string[] },
    "optimized":  { "code": string, "changes": string[], "benefits": string[] },
    "enterprise": { "code": string, "changes": string[], "benefits": string[] }
  },
  "expectedImprovements": string[]           // bullet list of overall expected gains
}

RULES:
- Every issue MUST tie to a real line and a real snippet from the supplied code. Never invent code.
- You MUST independently analyze and produce dedicated findings for FOUR categories: securityFindings, performanceFindings, testAutomationFindings, AND refactors. Do NOT leave any of these empty unless the code is genuinely clean for that category.
- SECURITY (securityFindings): scan for hardcoded passwords, API keys, tokens, secrets, auth/authorization issues, sensitive data exposure, SQL injection, unsafe file handling, logging confidential info, insecure HTTP, weak crypto. Provide score-driving findings with risk explanation + concrete fix.
- PERFORMANCE (performanceFindings): scan for Thread.sleep/time.sleep/waitForTimeout, redundant loops, repeated API/DB calls, inefficient collections, excessive DOM lookups, memory leaks, duplicate processing, blocking I/O. Each finding must name the bottleneck and the optimization.
- AUTOMATION (testAutomationFindings): scan locator quality, XPath stability (flag //*[contains], absolute XPaths, index-based locators), explicit wait usage, Page Object Model compliance, reusability, maintainability, framework structure, assertion quality, flaky-test risks.
- REFACTORS: ALWAYS produce all THREE variants ("refactored"=clean & readable, "optimized"=best performance, "enterprise"=production-grade with logging, error handling, POM, retries, config-driven). All three MUST compile/run in the detected language and MUST be different from each other and meaningfully improved over the original. Each variant MUST list specific changes[] and benefits[].
- If a category genuinely has nothing to flag, return an EMPTY array (the UI will display "No significant X Issues Found"). Never invent issues that aren't in the code.
- Limit issues[] to the 25 most impactful. severityCount fields will be recomputed; you do not need to count them.
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
    try {
      parsed = extractJSON(content);
    } catch (e) {
      console.error('Failed to parse AI JSON', e, 'finish_reason=', finishReason, content.slice(0, 500));
      const truncated = finishReason === 'length' || finishReason === 'max_tokens';
      const msg = truncated
        ? 'AI response was truncated (output token limit reached). Switch to a larger model (e.g. Gemini 2.5 Pro or GPT-5) in AI Configuration, or analyze a smaller code snippet.'
        : 'AI returned malformed JSON. Your configured model may be too small for structured reports — try a stronger model (Gemini 2.5 Pro, GPT-5, Claude Sonnet).';
      return new Response(JSON.stringify({ error: msg }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Recompute severity counts
    const issues = Array.isArray(parsed.issues) ? parsed.issues : [];
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
      },
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('hive-code-analyzer error', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
