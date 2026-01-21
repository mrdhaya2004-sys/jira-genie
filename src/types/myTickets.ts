export interface JiraUser {
  displayName: string;
  avatarUrl?: string;
  accountId: string;
}

export interface JiraTicketItem {
  key: string;
  id: string;
  summary: string;
  issueType: {
    name: string;
    iconUrl?: string;
  };
  status: {
    name: string;
    category: 'new' | 'indeterminate' | 'done' | 'undefined';
  };
  priority: {
    name: string;
    iconUrl?: string;
  };
  assignee: JiraUser | null;
  reporter: JiraUser | null;
  creator: JiraUser | null;
  created: string;
  updated: string;
  url: string;
  isAICreated?: boolean;
}

export interface TicketFilters {
  issueType: string;
  status: string;
  searchQuery: string;
}

export interface MyTicketsResponse {
  tickets: JiraTicketItem[];
  total: number;
  maxResults: number;
  startAt: number;
  statuses: string[];
  projectKey: string;
}
