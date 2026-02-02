// Automation tools history storage utility

export type AutomationToolType = 'scenario' | 'xpath' | 'testcase';

export interface HistoryEntry {
  id: string;
  toolType: AutomationToolType;
  title: string;
  summary: string;
  timestamp: Date;
  metadata?: {
    framework?: string;
    workspace?: string;
    module?: string;
    platform?: string;
  };
}

const STORAGE_KEY = 'automation_tools_history';
const MAX_HISTORY_ITEMS = 50;

export const automationHistoryService = {
  getHistory(): HistoryEntry[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      
      const parsed = JSON.parse(stored);
      return parsed.map((entry: HistoryEntry) => ({
        ...entry,
        timestamp: new Date(entry.timestamp),
      }));
    } catch (error) {
      console.error('Error reading automation history:', error);
      return [];
    }
  },

  getHistoryByTool(toolType: AutomationToolType): HistoryEntry[] {
    return this.getHistory().filter(entry => entry.toolType === toolType);
  },

  addEntry(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): HistoryEntry {
    const newEntry: HistoryEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    const history = this.getHistory();
    
    // Add to beginning (most recent first)
    history.unshift(newEntry);
    
    // Keep only the most recent items
    const trimmedHistory = history.slice(0, MAX_HISTORY_ITEMS);
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedHistory));
    } catch (error) {
      console.error('Error saving automation history:', error);
    }

    return newEntry;
  },

  deleteEntry(id: string): void {
    const history = this.getHistory().filter(entry => entry.id !== id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Error deleting history entry:', error);
    }
  },

  clearHistory(toolType?: AutomationToolType): void {
    if (toolType) {
      const history = this.getHistory().filter(entry => entry.toolType !== toolType);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  },

  formatTimestamp(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit',
    });
  },

  getToolLabel(toolType: AutomationToolType): string {
    const labels: Record<AutomationToolType, string> = {
      scenario: '🧩 Logic Scenario',
      xpath: '🧬 XPath Generator',
      testcase: '📋 Test Case',
    };
    return labels[toolType];
  },

  getToolIcon(toolType: AutomationToolType): string {
    const icons: Record<AutomationToolType, string> = {
      scenario: '🧩',
      xpath: '🧬',
      testcase: '📋',
    };
    return icons[toolType];
  },
};
