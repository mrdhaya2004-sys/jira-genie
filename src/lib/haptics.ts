/**
 * Light haptic-like feedback utility.
 * Uses the Web Vibration API when available (mobile devices).
 * Silently no-ops on unsupported platforms (e.g., iOS Safari, desktop).
 *
 * Respects user preference for reduced motion and can be disabled globally
 * via `localStorage.setItem('tz-haptics', 'off')`.
 */

type HapticPattern = "tap" | "toggle" | "success" | "warning" | "error";

const PATTERNS: Record<HapticPattern, number | number[]> = {
  tap: 8,          // primary button press
  toggle: 12,      // switch / checkbox flip
  success: [10, 40, 18], // form submit success
  warning: [14, 30, 14],
  error: [30, 40, 30],
};

let cachedEnabled: boolean | null = null;

function isEnabled(): boolean {
  if (cachedEnabled !== null) return cachedEnabled;
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem("tz-haptics") === "off") {
      cachedEnabled = false;
      return false;
    }
  } catch {
    /* ignore */
  }
  const reduced =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  cachedEnabled = !reduced && typeof navigator !== "undefined" && "vibrate" in navigator;
  return cachedEnabled;
}

export function haptic(pattern: HapticPattern = "tap"): void {
  if (!isEnabled()) return;
  try {
    (navigator as Navigator & { vibrate: (p: number | number[]) => boolean }).vibrate(
      PATTERNS[pattern],
    );
  } catch {
    /* ignore */
  }
}

export function setHapticsEnabled(enabled: boolean): void {
  cachedEnabled = enabled;
  try {
    localStorage.setItem("tz-haptics", enabled ? "on" : "off");
  } catch {
    /* ignore */
  }
}
