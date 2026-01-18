export type XPathFlowPhase = 
  | 'workspace_selection'
  | 'module_selection'
  | 'platform_selection'
  | 'ready_for_query'
  | 'generating'
  | 'xpath_generated';

export type Platform = 'android' | 'ios';

export interface XPathChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  type?: 'text' | 'workspace_select' | 'module_select' | 'platform_select' | 'xpath_result';
  options?: XPathChatOption[];
  xpaths?: GeneratedXPath[];
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
  | 'absolute'
  | 'relative'
  | 'chained'
  | 'following'
  | 'following-sibling'
  | 'preceding'
  | 'preceding-sibling';

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
  absolute: {
    label: 'Absolute XPath',
    description: 'Full path from root to element',
  },
  relative: {
    label: 'Relative XPath',
    description: 'Uses unique attributes for stable locating',
  },
  chained: {
    label: 'Chained XPath',
    description: 'Combines multiple conditions',
  },
  following: {
    label: 'Following XPath',
    description: 'Locates elements after current node',
  },
  'following-sibling': {
    label: 'Following-Sibling XPath',
    description: 'Locates sibling elements after current node',
  },
  preceding: {
    label: 'Preceding XPath',
    description: 'Locates elements before current node',
  },
  'preceding-sibling': {
    label: 'Preceding-Sibling XPath',
    description: 'Locates sibling elements before current node',
  },
};

export const PLATFORM_OPTIONS = [
  {
    id: 'android',
    label: 'Android',
    icon: '🤖',
    description: 'resource-id, content-desc, text attributes',
  },
  {
    id: 'ios',
    label: 'iOS',
    icon: '🍎',
    description: 'name, label, value, type attributes',
  },
] as const;
