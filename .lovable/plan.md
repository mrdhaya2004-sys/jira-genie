## Hive Code Analyzer

An AI-powered code review module for QA Automation, SDET, API, mobile and web automation projects. Sits alongside existing modules (Test Case Generator, XPath Generator, Logic Scenario Creator, Defect Analyzer) in the sidebar and shares the same chat + card UI patterns.

### 1. Inputs
- Paste snippet (Monaco editor with language picker).
- Upload single / multiple files (drag-drop, up to 10 files, 2MB each).
- GitHub repo URL (public + optional PAT for private).
- GitLab repo URL (reuses existing `gitlab_connections` PAT when present, otherwise PAT input).
- Auto language + framework detection from file extension / imports; user can override.

Supported languages: Java, Python, JS, TS, C#, Kotlin, Swift, SQL, Shell.
Supported frameworks: Selenium, Appium, Playwright, Cypress, TestNG, JUnit, Cucumber, Rest Assured, Postman, Robot Framework.

### 2. Analysis pipeline (edge function `hive-code-analyzer`)
Single Lovable AI call (`google/gemini-3-flash-preview`, fallback `google/gemini-2.5-pro` for files >40KB) using structured output (Zod schema) returning:

```text
overallScore (0-100)
subScores: { readability, maintainability, stability, performance, security,
             automationBestPractice, scalability }
automationStability: { score, risk: low|medium|high, reasons[] }
issues[]: { line, endLine?, severity: critical|high|medium|low,
            type, title, problem, suggestion, codeBefore, codeAfter, explanation, bestPractice }
securityFindings[], performanceFindings[], testAutomationFindings[]
refactors: { refactored: code, optimized: code, enterprise: code,
             changes[], benefits[], expectedImprovements[] }
summary, criticalCount, highCount, mediumCount, lowCount
```

For repo inputs the edge function fetches up to 50 source files (filtered by extension), concatenates with file headers, and runs one analysis call per file in parallel (max 5 concurrent). Aggregated scores = weighted average.

### 3. UI components (`src/components/codeanalyzer/`)
- `HiveCodeAnalyzerModule.tsx` — module shell (matches existing module headers: h-12 frosted, glass-bg).
- `CodeInputPanel.tsx` — tabs: Snippet | Files | GitHub | GitLab. Monaco editor reused from scenario module.
- `AnalysisDashboard.tsx` — score gauges, issue counts, automation stability ring, severity breakdown.
- `LineByLineList.tsx` — virtualized list with severity badges; clicking jumps to highlighted line in Monaco viewer.
- `IssueCard.tsx` — problem / suggestion / before-after diff (uses CodeSnippet component).
- `RefactorPanel.tsx` — 3 tabs (Refactored / Optimized / Enterprise) with copy + download.
- `SecurityPanel.tsx`, `PerformancePanel.tsx`, `AutomationReviewPanel.tsx`.
- `ExportReportDialog.tsx` — PDF (jspdf+autotable), DOCX (docx lib), HTML (sanitized template).
- `AnalysisHistoryPanel.tsx` — past analyses from `code_analyses` table.

### 4. Database
New tables (RLS owner-only, GRANTs included):
- `code_analyses` — id, user_id, source_type (snippet|files|github|gitlab), language, framework, overall_score, sub_scores jsonb, automation_stability jsonb, summary, created_at.
- `code_analysis_issues` — analysis_id, line, severity, type, title, problem, suggestion, code_before, code_after, explanation.
- `code_analysis_refactors` — analysis_id, variant (refactored|optimized|enterprise), code, changes jsonb, benefits jsonb.

### 5. Edge function + secrets
- `supabase/functions/hive-code-analyzer/index.ts` (`verify_jwt = false`, manual `validateAuth`).
- Uses existing `LOVABLE_API_KEY`. No new secrets required.
- Optional GitHub PAT entered in UI is sent per-request (never stored).

### 6. Sidebar & routing
- Add nav entry "Hive Code Analyzer" in `DashboardSidebar` with `Code2` icon under the Automation group.
- Register module in `DashboardPage`.
- Update Hive AI assistant router to redirect "review my code / analyze code" intents to this module.

### 7. Out of scope (v1)
- Live GitHub PR comments.
- Background re-analysis on push.
- Multi-language repo-wide call-graph analysis.

### Delivery order
1. Migration + tables.
2. Edge function with structured output.
3. UI shell + snippet flow + dashboard.
4. File upload + GitHub/GitLab fetch.
5. Refactor / Security / Performance / Automation panels.
6. Export (PDF/DOCX/HTML) + history panel.
7. Sidebar nav + Hive AI routing.
