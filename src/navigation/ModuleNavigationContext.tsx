import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ActiveModule } from '@/pages/DashboardPage';

const MODULE_LABELS: Record<ActiveModule, string> = {
  'intelligence-hub': 'Dashboard',
  'mentions': 'Mentions',
  'chat': 'Chat',
  'tickets': 'My Tickets',
  'history': 'History',
  'agentic-ai': 'Hive AI',
  'jira-ticket-raiser': 'Jira Ticket Raiser',
  'logic-scenario-creator': 'Scenario Creator',
  'test-case-generator': 'Test Case Generator',
  'test-data-generator': 'Test Data Generator',
  'xpath-generator': 'XPath Generator',
  'defect-analyzer': 'AI Defect Analyzer',
  'gitlab-execution': 'GitLab AI',
  'code-analyzer': 'Hive Code Analyzer',
  'ai-settings': 'AI Configuration',
  'profile': 'Profile',
  'account-settings': 'Account Settings',
  'about': 'About Us',
  'founder': 'Founder',
  'help-support': 'Help & Support',
};

export const getModuleLabel = (m: ActiveModule) => MODULE_LABELS[m] ?? m;

const FALLBACK: ActiveModule = 'intelligence-hub';

interface ModuleNavigationContextValue {
  activeModule: ActiveModule;
  stack: ActiveModule[];
  canGoBack: boolean;
  goTo: (module: ActiveModule) => void;
  goBack: () => void;
  /** Replace current entry (used for internal redirects that should not stack). */
  replace: (module: ActiveModule) => void;
}

const Ctx = createContext<ModuleNavigationContextValue | null>(null);

interface ProviderProps {
  initialModule?: ActiveModule;
  onModuleChange?: (module: ActiveModule) => void;
  children: React.ReactNode;
}

export const ModuleNavigationProvider: React.FC<ProviderProps> = ({
  initialModule = FALLBACK,
  onModuleChange,
  children,
}) => {
  const [stack, setStack] = useState<ActiveModule[]>([initialModule]);
  const activeModule = stack[stack.length - 1];
  const changeRef = useRef(onModuleChange);
  changeRef.current = onModuleChange;

  useEffect(() => {
    changeRef.current?.(activeModule);
  }, [activeModule]);

  const goTo = useCallback((module: ActiveModule) => {
    setStack((prev) => {
      if (prev[prev.length - 1] === module) return prev;
      // Collapse duplicates: if returning to a module already in the stack,
      // truncate to that occurrence (breadcrumb-style).
      const existingIdx = prev.lastIndexOf(module);
      if (existingIdx >= 0) return prev.slice(0, existingIdx + 1);
      const next = [...prev, module];
      return next.length > 25 ? next.slice(-25) : next;
    });
  }, []);

  const replace = useCallback((module: ActiveModule) => {
    setStack((prev) => {
      if (prev[prev.length - 1] === module) return prev;
      const next = prev.slice(0, -1);
      next.push(module);
      return next;
    });
  }, []);

  const goBack = useCallback(() => {
    setStack((prev) => {
      if (prev.length > 1) return prev.slice(0, -1);
      return prev[0] === FALLBACK ? prev : [FALLBACK];
    });
  }, []);

  // Global keyboard shortcut: Alt+Left = back.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'ArrowLeft') {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
        e.preventDefault();
        goBack();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goBack]);

  const value = useMemo<ModuleNavigationContextValue>(
    () => ({
      activeModule,
      stack,
      canGoBack: stack.length > 1,
      goTo,
      goBack,
      replace,
    }),
    [activeModule, stack, goTo, goBack, replace],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useModuleNavigation = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useModuleNavigation must be used inside <ModuleNavigationProvider>');
  return ctx;
};

/** Safe variant that returns null when used outside the provider. */
export const useOptionalModuleNavigation = () => useContext(Ctx);
