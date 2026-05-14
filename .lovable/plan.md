# AI Defect Analyzer Module

A new module in Test Zone that ingests automation execution reports and uses AI to analyze failures, root causes, XPath issues, and stability — wrapped in the existing iOS 26 glassmorphism design system.

## Scope

Add a new sidebar entry **AI Defect Analyzer** that opens a chat-style module mirroring the look & feel of XPath Generator / Test Case Generator. The module guides the user through:

1. **Select Hive Mind Workspace** (reuse existing workspace picker pattern from `useWorkspaces` + chat options).
2. **Upload report** — supports `.html`, `.json`, `.log`, `.txt`, `.zip` (folder), and multi-file via drag-and-drop.
3. **Select Execution OS** — Android / iOS / Web (chat option chips).
4. **Execute & Analyze** primary CTA → streaming AI analysis.
5. **Results dashboard** with glass cards: stats, scenario breakdown, root cause distribution, XPath recommendations.

## File plan

```
src/types/defectAnalyzer.ts                               // types
src/hooks/useDefectAnalyzer.ts                            // state machine + edge fn calls
src/components/defect/DefectAnalyzerModule.tsx            // main module shell (chat layout)
src/components/defect/DefectChatMessage.tsx               // message renderer
src/components/defect/DefectChatInput.tsx                 // upload + OS selector + execute
src/components/defect/DefectReportUploader.tsx            // drag/drop + parse
src/components/defect/DefectAnalysisDashboard.tsx        // stats + cards
src/components/defect/DefectScenarioCard.tsx              // per-scenario glass card
src/components/defect/XPathFixCard.tsx                    // old vs new XPath
supabase/functions/defect-analyzer/index.ts               // AI gateway call
supabase/functions/defect-xpath-regenerate/index.ts       // (or reuse xpath-generator)
src/pages/DashboardPage.tsx                               // register module
src/components/dashboard/DashboardSidebar.tsx             // sidebar entry
```

## Technical details

- **Module type**: Add `'defect-analyzer'` to `ActiveModule` in `DashboardPage.tsx`. Sidebar gets new icon (`Bug` or `ShieldAlert` from lucide).
- **State machine** (`useDefectAnalyzer`): phases `workspace_selection → report_upload → os_selection → ready → analyzing → results`.
- **Report parsing** (client-side first pass):
  - HTML: parse with `DOMParser`, extract test names + status + error blocks.
  - JSON: try common shapes (Mocha, Cypress, Playwright, Cucumber, TestNG).
  - Logs/txt: raw text passed to AI.
  - ZIP: use `JSZip` (already common); list, then read text-like entries.
  - Send a normalized digest (truncated) to the edge function — never raw 20MB blobs.
- **Edge function `defect-analyzer`**:
  - `verify_jwt = false` + manual `validateAuth` (per project rule).
  - Calls Lovable AI Gateway with `google/gemini-2.5-pro` (large context, multi-file reasoning).
  - Returns structured JSON: `{ summary, scenarios[], rootCauses[], xpathIssues[], confidence, stabilityScore }`.
  - Uses `tool_choice` JSON schema so the response is reliably structured.
- **XPath intelligence**: when the analyzer flags `xpathIssues`, the module surfaces a "Regenerate with Hive Mind" CTA that calls the existing `xpath-generator` edge function with the workspace context (no duplicate function needed).
- **Auto-scroll**: reuse `useAutoScroll` hook for the chat surface, matching other modules.
- **UI tokens**: only `glass-effect`, `glass-card`, `glass-primary` button variant, semantic tokens (`primary`, `muted`, `success`, `destructive`, `warning`). No raw colors.
- **Visuals**:
  - Scanning animation — pulsing radial glow over uploaded report card while `analyzing`.
  - Streaming "AI is analyzing..." typing indicator (reuse `TypingIndicator`).
  - Stat tiles with `animate-float` on hover, soft `glow-pulse` on the AI confidence badge.
- **Validations**:
  - No workspace → toast + chat system message.
  - Unsupported file → inline message listing accepted formats.
  - Parse failure → AI recovery prompt: "Couldn't parse this report — paste the failure log instead."

## Dashboard cards rendered

- Stat row: Total / Passed / Failed / Stability Score / AI Confidence.
- Root Cause Distribution: horizontal bars (use `Progress` component).
- Most Failed Module: highlighted glass card.
- Scenario list: `DefectScenarioCard` per failure with status pill, reason, root cause, suggested fix.
- XPath section: `XPathFixCard` showing old vs new XPath in side-by-side `<pre>` blocks with copy buttons.

## Out of scope (this iteration)

- Persisting analyses to a `defect_reports` table — kept ephemeral. Easy to add later if requested.
- Cross-report pattern learning (mentioned as "Advanced AI") — added as a placeholder section labeled "Coming soon" so the UI hints at the roadmap without faking data.
