export type XPathFlowPhase =
  | 'workspace_selection'
  | 'module_selection'
  | 'platform_selection'
  | 'ready_for_query'
  | 'generating'
  | 'xpath_generated';

export type Platform = 'android' | 'ios';

export type ElementType =
  | 'button' | 'input' | 'dropdown' | 'checkbox' | 'radio' | 'link'
  | 'text' | 'image' | 'table' | 'list' | 'nav' | 'dialog' | 'tab'
  | 'card' | 'form' | 'container' | 'accessibility' | 'unknown';

export interface LocatorSet {
  primary_xpath: string;
  alternative_xpath: string | null;
  dynamic_xpath: string | null;
  absolute_xpath: string;
  css: string | null;
  accessibility_id: string | null;
  android: {
    uiautomator: string | null;
    resource_id: string | null;
    content_desc: string | null;
  } | null;
  ios: {
    predicate: string | null;
    class_chain: string | null;
    accessibility_identifier: string | null;
  } | null;
}

export interface HierarchyNodeRef {
  id: number;
  tag: string;
  name: string;
  element_type?: ElementType;
}

export interface HierarchyInfo {
  parent: HierarchyNodeRef | null;
  siblings: HierarchyNodeRef[];
  children: HierarchyNodeRef[];
}

export interface ElementAnalysis {
  id: number;
  screen: string;
  element_name: string;
  element_type: ElementType;
  tag: string;
  attributes_summary: string;
  attributes?: Record<string, string>;
  hierarchy?: HierarchyInfo;
  locators: LocatorSet;
  confidence: number;
  uniqueness?: number;
  stability: 'high' | 'medium' | 'low';
  reasoning: string;
}

export interface AppTreeElement {
  id: number;
  name: string;
  tag: string;
  element_type: ElementType;
}
export interface AppTreeScreen {
  screen: string;
  total: number;
  interactive: AppTreeElement[];
}

export interface DomRisk {
  kind: 'duplicate_id' | 'dynamic_id' | 'missing_accessibility' | 'weak_selector' | 'index_only';
  message: string;
  count?: number;
  examples?: string[];
}

export interface XPathAnalysisResult {
  elements: ElementAnalysis[];
  risks: DomRisk[];
  screens: string[];
  totalNodes: number;
  module?: string;
  platform?: Platform;
}

export interface XPathChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  type?: 'text' | 'workspace_select' | 'module_select' | 'platform_select' | 'xpath_result' | 'xpath_structured';
  options?: XPathChatOption[];
  xpaths?: GeneratedXPath[];
  analysis?: XPathAnalysisResult;
  timestamp: string;
}

export interface XPathChatOption {
  id: string;
  label: string;
  value: string;
  icon?: string;
  description?: string;
}

export type XPathType =
  | 'absolute' | 'relative' | 'chained' | 'following' | 'following-sibling'
  | 'preceding' | 'preceding-sibling';

export interface GeneratedXPath {
  type: XPathType;
  xpath: string;
  recommended?: boolean;
  explanation?: string;
}

export interface XPathGenerationRequest {
  workspaceId: string;
  module: string;
  platform: Platform;
  query: string;
  context: {
    userStories: string;
    hasApk: boolean;
    hasIpa: boolean;
    appFiles: { name: string; type: string }[];
  };
}

export const XPATH_TYPE_LABELS: Record<XPathType, { label: string; description: string }> = {
  absolute: { label: 'Absolute XPath', description: 'Full path from root to element' },
  relative: { label: 'Relative XPath', description: 'Uses unique attributes for stable locating' },
  chained: { label: 'Chained XPath', description: 'Combines multiple conditions' },
  following: { label: 'Following XPath', description: 'Locates elements after current node' },
  'following-sibling': { label: 'Following-Sibling XPath', description: 'Locates sibling elements after current node' },
  preceding: { label: 'Preceding XPath', description: 'Locates elements before current node' },
  'preceding-sibling': { label: 'Preceding-Sibling XPath', description: 'Locates sibling elements before current node' },
};

export const PLATFORM_OPTIONS = [
  { id: 'android', label: 'Android', icon: '🤖', description: 'resource-id, content-desc, text attributes' },
  { id: 'ios', label: 'iOS', icon: '🍎', description: 'name, label, value, type attributes' },
] as const;
