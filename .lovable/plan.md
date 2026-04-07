

# Wire Up "Help" Dropdown Item to Help & Support Chat

## Problem
The "Help" item in the profile dropdown menu (line 168-171 of `DashboardHeader.tsx`) has no `onClick` handler, so clicking it does nothing.

## Solution
Add state to control the `HelpChatDialog` and wire it to the Help menu item — same pattern as `ChangePasswordDialog`.

## Changes

**`src/components/dashboard/DashboardHeader.tsx`**
1. Import `HelpChatDialog` from `@/components/help/HelpChatDialog`
2. Add `const [helpChatOpen, setHelpChatOpen] = useState(false);` state
3. Add `onClick={() => setHelpChatOpen(true)}` to the Help `DropdownMenuItem`
4. Render `<HelpChatDialog open={helpChatOpen} onOpenChange={setHelpChatOpen} />` alongside the existing `ChangePasswordDialog`

No other files need changes — the `HelpChatDialog` component already exists and is fully functional.

