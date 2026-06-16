import { createContext, useCallback, useContext, useEffect, useRef } from "react";
import { useLocation, useNavigate, type NavigateOptions } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";

/**
 * Centralized navigation stack.
 *
 * Single source of truth for back navigation across:
 *  - Browser back button / mobile browser swipe
 *  - Android hardware back + gesture back (Capacitor)
 *  - iOS swipe-back gesture (WKWebView – uses browser history)
 *  - In-app header back buttons (call `navigateBack()`)
 *
 * Tracks an internal stack of visited routes so we can deterministically
 * fall back to a logical parent when the browser history is empty
 * (deep links, push notifications, shared URLs).
 */

type ParentResolver = (pathname: string) => string;

interface NavigationStackContextValue {
  stack: string[];
  navigateBack: () => void;
  canGoBack: () => boolean;
}

const NavigationStackContext = createContext<NavigationStackContextValue | null>(null);

/** Logical parent fallback for deep-link entry points. */
const defaultParentResolver: ParentResolver = (pathname) => {
  if (pathname.startsWith("/auth")) return "/auth/login";
  // Strip the last path segment as a sane parent (e.g. /a/b/c -> /a/b).
  const trimmed = pathname.replace(/\/+$/, "");
  const idx = trimmed.lastIndexOf("/");
  if (idx > 0) return trimmed.slice(0, idx) || "/";
  return "/";
};

export const NavigationStackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const stackRef = useRef<string[]>([]);
  const lastKeyRef = useRef<string | null>(null);

  // Maintain an in-memory stack that mirrors the browser history actions.
  useEffect(() => {
    const path = location.pathname + location.search + location.hash;
    const action = (window.history.state?.idx ?? null) as number | null;

    // POP (browser/native back): drop top of stack.
    if (lastKeyRef.current && location.key !== lastKeyRef.current && action !== null) {
      const top = stackRef.current[stackRef.current.length - 1];
      if (top !== path) {
        // Detect POP vs PUSH by comparing — if path already exists earlier, treat as pop.
        const existingIdx = stackRef.current.lastIndexOf(path);
        if (existingIdx >= 0 && existingIdx < stackRef.current.length - 1) {
          stackRef.current = stackRef.current.slice(0, existingIdx + 1);
        } else {
          stackRef.current.push(path);
        }
      }
    } else if (stackRef.current[stackRef.current.length - 1] !== path) {
      stackRef.current.push(path);
    }

    lastKeyRef.current = location.key;

    // Cap stack to avoid unbounded growth.
    if (stackRef.current.length > 50) {
      stackRef.current = stackRef.current.slice(-50);
    }

    // Analytics hook (best-effort, non-blocking).
    try {
      window.dispatchEvent(
        new CustomEvent("navigation:visit", {
          detail: { path, stackSize: stackRef.current.length },
        }),
      );
    } catch {
      /* no-op */
    }
  }, [location]);

  const canGoBack = useCallback(() => {
    return stackRef.current.length > 1 || window.history.length > 1;
  }, []);

  const navigateBack = useCallback(() => {
    const from = location.pathname + location.search + location.hash;
    const hasInternalHistory = stackRef.current.length > 1;
    const hasBrowserHistory = window.history.length > 1;

    try {
      window.dispatchEvent(
        new CustomEvent("navigation:back", {
          detail: { from, trigger: "navigateBack" },
        }),
      );
    } catch {
      /* no-op */
    }

    if (hasInternalHistory || hasBrowserHistory) {
      navigate(-1);
      return;
    }

    // Deep-link / fresh entry fallback — go to logical parent, never crash.
    const parent = defaultParentResolver(location.pathname);
    navigate(parent, { replace: true } as NavigateOptions);
  }, [location, navigate]);

  // Wire Capacitor hardware/gesture back button (Android) to the same handler.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cleanup: (() => void) | undefined;
    CapacitorApp.addListener("backButton", ({ canGoBack: nativeCanGoBack }) => {
      if (nativeCanGoBack || stackRef.current.length > 1 || window.history.length > 1) {
        navigateBack();
      } else {
        // Top of stack on Android — exit the app (matches platform expectation).
        CapacitorApp.exitApp();
      }
    }).then((handle) => {
      cleanup = () => handle.remove();
    });

    return () => {
      cleanup?.();
    };
  }, [navigateBack]);

  const value: NavigationStackContextValue = {
    stack: stackRef.current,
    navigateBack,
    canGoBack,
  };

  return (
    <NavigationStackContext.Provider value={value}>{children}</NavigationStackContext.Provider>
  );
};

/**
 * Hook used by every back button (header back, iOS-style chevron, modals, etc.).
 * Guarantees identical behavior across web, Android hardware back, and iOS swipe.
 */
export const useNavigationStack = (): NavigationStackContextValue => {
  const ctx = useContext(NavigationStackContext);
  if (!ctx) {
    throw new Error("useNavigationStack must be used inside <NavigationStackProvider>");
  }
  return ctx;
};
