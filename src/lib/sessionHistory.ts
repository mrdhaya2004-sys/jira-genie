// Session history tracking - persists in sessionStorage, cleared on logout

const SESSION_KEY = 'testzone_session_history';
const SESSION_ID_KEY = 'testzone_session_id';

export interface SessionHistoryEntry {
  module: string;
  timestamp: string;
  label: string;
}

export const sessionHistoryService = {
  getSessionId(): string {
    let id = sessionStorage.getItem(SESSION_ID_KEY);
    if (!id) {
      id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      sessionStorage.setItem(SESSION_ID_KEY, id);
    }
    return id;
  },

  startSession(): string {
    const id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem(SESSION_ID_KEY, id);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify([]));
    return id;
  },

  getHistory(): SessionHistoryEntry[] {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  addModuleUsage(module: string, label: string): void {
    const history = this.getHistory();
    history.push({
      module,
      label,
      timestamp: new Date().toISOString(),
    });
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(history));
  },

  clearSession(): void {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_ID_KEY);
  },

  getModuleLabel(module: string): string {
    const labels: Record<string, string> = {
      'test-case-generator': 'Test Case Generator',
      'logic-scenario-creator': 'Logic Scenario Creator',
      'xpath-generator': 'XPath Generator',
      'jira-ticket-raiser': 'Jira Ticket Raiser',
      'agentic-ai': 'Agentic AI – Core Workspace',
    };
    return labels[module] || module;
  },
};
