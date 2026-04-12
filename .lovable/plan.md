

# Modern UI Redesign Plan

## Overview
Transform the Test Zone dashboard into a modern, polished SaaS UI with updated visual patterns inspired by tools like Linear, Vercel, and Slack. Focus on improved card styles, subtle animations, refined typography, better color usage, and a more cohesive visual language across all modules.

## Changes

### 1. CSS Variables & Global Styles (`src/index.css`)
- Refine light theme: softer background (`210 40% 97.5%`), crisper card whites, subtler borders
- Add new CSS variables: `--glass-bg`, `--glass-border` for frosted-glass effects
- Add smooth page transition animation (`fade-in-page`)
- Add subtle gradient accent backgrounds for module headers
- Improve scrollbar styling with rounded corners and smoother hover transitions
- Add a `.card-hover` utility class for lift-on-hover cards with shadow transition

### 2. Sidebar Redesign (`DashboardSidebar.tsx`)
- Add a subtle gradient accent line or dot indicator for the active item (instead of just background change)
- Improve section separator with a subtle label badge style
- Add hover micro-animation (slight translateX on nav items)
- Refine the user profile card at the bottom with a subtle border and improved avatar ring
- Add a subtle sidebar top gradient overlay for depth

### 3. Header Enhancement (`DashboardHeader.tsx`)
- Add subtle bottom border gradient (primary color fading out)
- Improve notification bell with a pulsing dot animation for unread
- Refine avatar dropdown with better spacing and icon alignment
- Add breadcrumb-style module name display

### 4. Module Headers (All modules)
- Standardize module header pattern: icon with gradient background circle, title, subtitle, and optional action buttons
- Add subtle entrance animation (`animate-fade-in`) when switching modules

### 5. Card System Refresh
- Update `Card` component styling in global CSS: softer shadow, subtle border, hover lift effect
- Add gradient accent border on focused/important cards
- Improve empty states with illustrated icons and better spacing

### 6. Mentions Panel (`MentionsPanel.tsx`)
- Add staggered entrance animation for mention cards
- Improve unread indicator with a glowing dot instead of left border
- Add subtle hover card expansion effect

### 7. Account Settings (`AccountSettingsModule.tsx`)
- Improve section navigation with active indicator pill animation
- Add card section headers with subtle gradient backgrounds
- Improve toggle and select control alignment and spacing
- Add save confirmation animation (checkmark pulse)

### 8. Tailwind Config Updates (`tailwind.config.ts`)
- Add new keyframes: `fade-in-page`, `slide-up-subtle`, `pulse-dot`
- Add corresponding animation utilities
- Add new box-shadow variants for cards

### 9. Dashboard Page (`DashboardPage.tsx`)
- Wrap module content area with entrance animation on module switch
- Add subtle background pattern/noise texture to main content area

## Technical Approach
- All changes are CSS/Tailwind class-level modifications — no structural refactoring
- No new dependencies required
- Animations use CSS transforms and opacity for GPU-accelerated performance
- Changes are backward-compatible with existing dark mode theme

## Files to Modify
1. `src/index.css` — New utilities, animations, refined variables
2. `tailwind.config.ts` — New keyframes and animation utilities
3. `src/components/dashboard/DashboardSidebar.tsx` — Visual refinements
4. `src/components/dashboard/DashboardHeader.tsx` — Header polish
5. `src/components/dashboard/MentionsPanel.tsx` — Card animations and indicators
6. `src/components/settings/AccountSettingsModule.tsx` — Section nav and card styling
7. `src/pages/DashboardPage.tsx` — Module transition animations
8. `src/components/jira/JiraTicketRaiserModule.tsx` — Standardized header
9. `src/components/testcase/TestCaseGeneratorModule.tsx` — Standardized header
10. `src/components/workspace/WorkspaceEmptyState.tsx` — Improved empty state

