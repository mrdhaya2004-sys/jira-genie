
# Enterprise XPath Generator – Hive Mind Workspace Integration

This upgrades the existing XPath Generator into an enterprise-grade analyzer that handles huge DOM/app-source snapshots, auto-classifies elements, and emits multi-platform locators with confidence scoring — all driven from the selected Hive Mind Workspace + Environment.

## Scope

Reuse existing pieces:
- `useEnvironmentContext` already loads env-scoped DOM + build files (no re-upload required).
- `XPathGeneratorModule` + `useXPathGenerator` already drive workspace/module/platform/env selection and history/episodic memory.
- `routeAIRequest` (custom NVIDIA provider) handles all AI traffic.

What changes is **how DOM is processed** before the AI sees it, and **what output the AI must return**.

## Flow

```
Workspace → Environment → Auto-load DOM + Build
        │
        ▼
[Chunk + Index + Classify DOM]  ← deterministic, in edge function
        │
        ▼
[Build compact element catalog]  ← screens/forms/buttons/inputs/…
        │
        ▼
User query ("Login button", "all elements on Dashboard", …)
        │
        ▼
[Locator Generation per element]  ← XPath/CSS/UIAutomator/Predicate/Class Chain
        │
        ▼
[Confidence + Stability + Risk scoring]
        │
        ▼
Streamed structured response to UI
```

## Files to change/create

**Edge functions**
- `supabase/functions/_shared/domAnalyzer.ts` (new) — DOM parser/chunker/classifier; locator generators per platform; scoring engine.
- `supabase/functions/xpath-generator/index.ts` (rewrite request handling) — load env DOM, run analyzer, build compact prompt, call `routeAIRequest`, stream back.

**Frontend**
- `src/types/xpath.ts` — extend `GeneratedXPath` with platform variants (css, uiautomator, resource_id, content_desc, predicate, class_chain, accessibility_id), `confidence`, `stability`, `reasoning`, plus `ElementAnalysis` and `DomRisk` types.
- `src/components/xpath/XPathChatMessage.tsx` — render new structured cards (Screen → Element → locator tabs + scores + risks).
- `src/components/xpath/XPathResultCard.tsx` (new) — per-element card with tabbed locators, copy buttons, confidence badge, risk chips.
- `src/components/xpath/DomIntelligencePanel.tsx` (new) — surfaces duplicate IDs, dynamic elements, missing a11y labels, weak selectors.
- `src/hooks/useXPathGenerator.ts` — parse new structured streaming payload (JSON lines or fenced JSON), map to typed `elements[]`, route specific error codes to friendly messages.
- `src/lib/xpathErrors.ts` (new) — error code → user-facing message map (DOM_NOT_LOADED, ELEMENT_NOT_FOUND, AI_TIMEOUT, INVALID_APP_SOURCE, UNSUPPORTED_FORMAT, WORKSPACE_DATA_MISSING).

## DOM processing strategy (50k+ lines)

In `domAnalyzer.ts` we never send the raw DOM to the AI. Instead:

1. **Parse** — tolerant line/tag walker that supports Appium-style XML (Android `hierarchy`/`android.widget.*`, iOS `XCUIElementType*`) and web HTML.
2. **Index** — assign each node a stable internal id, capture: tag, attributes, text, parent id, sibling index, depth, screen container (nearest screen/activity/view-controller ancestor).
3. **Classify** — rule-based: button / input / dropdown / checkbox / radio / link / table / list / nav / dialog / tab / card / a11y based on tag + attribute heuristics per platform.
4. **Chunk** — group nodes by screen container; each chunk capped (e.g. 150 elements / ~6k chars). Catalog is what we send to the AI, not raw XML.
5. **Score (deterministic, pre-AI)** — for each candidate locator we compute stability: unique `resource-id`/`name`/`data-testid` = high; text-only = medium; index-based or absolute = low. AI uses these scores; doesn't invent them.
6. **Risk pass** — detect duplicate ids, missing `content-desc`/`accessibility-id`, dynamic-looking values (UUID/hash/numeric suffix), index-only addressable nodes.

For queries like "Login button", we filter the catalog to the matching screen + classified type + fuzzy text match, then ask the AI only to (a) pick best matches, (b) explain reasoning, (c) format output. Locator strings themselves are generated deterministically in code so they're always valid.

For "all elements on Dashboard" we stream chunk-by-chunk (progressive analysis), emitting one element card per AI turn so the UI updates in real time.

## Locator generation (deterministic, per platform)

Per element we always produce:
- **Universal:** primary XPath (relative, attribute-based), alternative XPath, dynamic XPath (contains/starts-with for partial matches), CSS selector (web only).
- **Android:** UIAutomator (`new UiSelector().resourceId(...)`), resource-id, content-desc, accessibility id.
- **iOS:** predicate string (`name == 'Login'`), class chain (`**/XCUIElementTypeButton[\`name == "Login"\`]`), accessibility identifier.

Rules: never emit absolute XPath as primary; avoid `[n]` indices when a unique attribute exists; flag dynamic ids; prefer `resource-id` → `content-desc` → `text` → structural.

## AI output contract

Edge function streams **JSON lines**, each line = one element result:

```json
{"screen":"Login","element_name":"Login Button","element_type":"button",
 "locators":{"primary_xpath":"//*[@resource-id='com.app:id/login_btn']",
   "alternative_xpath":"//android.widget.Button[@text='Login']",
   "css":null,"android":{"uiautomator":"new UiSelector().resourceId(\"com.app:id/login_btn\")",
     "resource_id":"com.app:id/login_btn","content_desc":"Login"},
   "ios":null,"accessibility_id":"login_btn"},
 "confidence":94,"stability":"high","reasoning":"Stable resource-id, unique on screen, no dynamic suffix."}
```

Plus a trailing `{"type":"dom_intelligence", "risks":[...]}` summary line.

Frontend parses each line as it streams and renders one `XPathResultCard` per element.

## Error handling

Edge function returns typed errors (HTTP 200 with `{error_code, message}` payload or specific status):
- `DOM_NOT_LOADED` — no dom snapshot for env+platform.
- `WORKSPACE_DATA_MISSING` — workspace has no files.
- `INVALID_APP_SOURCE` / `UNSUPPORTED_FORMAT` — parser rejection.
- `ELEMENT_NOT_FOUND` — query had no matching candidates after classification.
- `AI_TIMEOUT` — upstream timeout/abort.

Frontend maps each to the friendly message specified by the user (never the generic "Sorry, I encountered an error").

## Performance

- Parsing/classification done in edge worker, O(n) over nodes, streamed.
- Catalog cached in memory per request; large DOMs processed in chunks streamed to AI.
- Frontend renders cards as they arrive (no waiting for full response).
- Realtime status messages ("Indexing DOM…", "Classifying 8 screens…", "Generating locators for Login…") sent as `{type:"status"}` lines before element data.

## Out of scope (this pass)

- Visual screen previews (would need rendered screenshots).
- Persisted element catalog across sessions (re-parsed per query for now).
- Web-platform DOM parsing beyond standard HTML (no shadow DOM traversal yet).

## Confirmation

This is a large change touching one edge function + analyzer + 4–5 frontend files. Confirm and I'll implement straight through.
