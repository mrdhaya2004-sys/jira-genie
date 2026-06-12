## Hive Code Analyzer — iOS 26 Liquid Glass Redesign

The user has given a very specific design direction (iOS 26 / Apple Intelligence / Xcode / Linear) with detailed section-by-section requirements. Implementing directly across the module's existing files — no new routes, no backend changes.

### Visual language (added once, reused everywhere)
- New CSS layer in `src/index.css` scoped via a `.hca` wrapper class on the module root so it does not bleed into other modules:
  - `--hca-glass-bg`, `--hca-glass-border`, `--hca-glow`, `--hca-spring` tokens for light + dark
  - `.hca-glass` (frosted, layered blur, soft inner highlight), `.hca-surface` (deep charcoal / white glass), `.hca-ring` (score ring), `.hca-chip`, `.hca-segmented` (iOS segmented control)
  - Spring-style keyframes: `hca-rise`, `hca-shimmer`, `hca-pulse-soft`, `hca-ring-fill`
- All colors stay on semantic HSL tokens — no hardcoded hex in components.

### Header (`HiveCodeAnalyzerModule.tsx`)
- Replace flat header with a liquid-glass bar: app icon tile with animated glow ring, title + new subtitle "AI-Powered Code Quality & Stability Analysis", animated status dot (Idle / Analyzing pulse / Healthy), quick-stats chips when a result exists (Quality, Security, Automation) using soft gradient pills.

### Analysis dashboard (`AnalysisDashboard.tsx`)
- Convert score grid to glass metric cards with animated SVG score rings (stroke-dashoffset spring fill), soft category gradients, delta label, and skeleton loader during analyze.
- Top "AI Insights" panel (new sub-component inside the file): Most Critical Risk, Best Improvement Opportunity, Stability Prediction, Automation Maturity — derived from existing `result` fields, no new data.
- "Analysis Timeline" strip below: Uploaded → Analyzing → Review → Refactor → Completed with spring stagger animation. Driven purely from `isAnalyzing` + `result` state.

### Tabs
- Replace shadcn `TabsList` with an iOS-26 segmented control (`hca-segmented`): pill background slides under the active tab using a translate-x transform with spring easing. Keep Radix Tabs semantics for a11y, restyle the trigger.

### Issue cards (`IssueCard.tsx`)
- Convert to interactive collapsible cards (closed by default, expand on click): severity badge, line chip, type chip, impact + confidence rings on the header row.
- Split-view Problem vs Suggested Fix using a 2-column grid with synced line gutters and a subtle diff highlight (added-line = emerald wash, removed-line = rose wash). Per-pane copy button, expand-to-fullscreen dialog (shadcn Dialog) for large snippets.

### Refactor panel (`RefactorPanel.tsx`)
- Replace inner Tabs with iOS segmented control: Refactored / Optimized / Enterprise. Smooth crossfade + slight scale-in on switch. Keep existing copy / download.

### Findings panel (`FindingsPanel.tsx`)
- Restyle to match glass cards, soft severity chips, confidence ring, evidence collapsible.

### Code input (`CodeInputPanel.tsx`)
- Light glass surface, softer shadows, restyled drag-drop dashed area, segmented source-type selector. No logic changes.

### Dark + Light modes
- Both modes share token names. Dark: deep charcoal (`hsl(220 18% 8%)` surface), subtle accent glows. Light: paper-white glass with soft elevation. No pure black, no pure white.

### Performance + a11y
- Use `transform` + `opacity` only for animations.
- Respect `prefers-reduced-motion` — disable rise/shimmer/pulse.
- Skeleton loaders on dashboard + tabs during `isAnalyzing`.
- All interactive elements remain keyboard-focusable; Radix primitives kept.

### Files to touch
- `src/index.css` — add `.hca-*` design layer
- `src/components/codeanalyzer/HiveCodeAnalyzerModule.tsx`
- `src/components/codeanalyzer/AnalysisDashboard.tsx`
- `src/components/codeanalyzer/IssueCard.tsx`
- `src/components/codeanalyzer/RefactorPanel.tsx`
- `src/components/codeanalyzer/FindingsPanel.tsx`
- `src/components/codeanalyzer/CodeInputPanel.tsx`
- New: `src/components/codeanalyzer/ScoreRing.tsx`, `AIInsightsPanel.tsx`, `AnalysisTimeline.tsx`, `SegmentedControl.tsx`

### Out of scope
- No backend / edge function changes.
- No new analysis fields — AI insights + timeline derive from the existing `AnalysisResult` shape.
- No changes to other modules.

Confirm and I will build it end-to-end.