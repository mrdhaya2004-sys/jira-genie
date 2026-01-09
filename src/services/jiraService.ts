import { supabase } from "@/integrations/supabase/client";
import { TicketData } from "@/types/ticket";

export interface JiraTicketResponse {
  success: boolean;
  ticketKey?: string;
  ticketId?: string;
  ticketUrl?: string;
  error?: string;
}

export interface DuplicateIssue {
  key: string;
  summary: string;
  status: string;
  priority: string;
  created: string;
  url: string;
}

export interface DuplicateSearchResponse {
  duplicates: DuplicateIssue[];
  totalCount: number;
}

export interface JiraMetadata {
  projectKey: string;
  projectName: string;
  issueTypes: string[];
  components: string[];
  sprints: Array<{ id: number; name: string }>;
  users: Array<{ accountId: string; displayName: string; emailAddress?: string }>;
  priorities: string[];
}

export const jiraService = {
  async createTicket(ticketData: TicketData): Promise<JiraTicketResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('jira-create-ticket', {
        body: {
          summary: ticketData.summary,
          description: ticketData.description,
          issueType: ticketData.issueType,
          priority: ticketData.priority,
          module: ticketData.module,
          sprint: ticketData.sprint,
          assignee: ticketData.assignee,
        },
      });

      if (error) {
        console.error('Supabase function error:', error);
        return { success: false, error: error.message };
      }

      if (data?.error) {
        return { success: false, error: data.error };
      }

      return {
        success: true,
        ticketKey: data.ticketKey,
        ticketId: data.ticketId,
        ticketUrl: data.ticketUrl,
      };
    } catch (err) {
      console.error('Error creating ticket:', err);
      return { success: false, error: 'Failed to create ticket' };
    }
  },

  async searchDuplicates(summary: string, description?: string): Promise<DuplicateSearchResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('jira-search-duplicates', {
        body: { summary, description },
      });

      if (error) {
        console.error('Supabase function error:', error);
        return { duplicates: [], totalCount: 0 };
      }

      return {
        duplicates: data?.duplicates || [],
        totalCount: data?.totalCount || 0,
      };
    } catch (err) {
      console.error('Error searching duplicates:', err);
      return { duplicates: [], totalCount: 0 };
    }
  },

  async getMetadata(): Promise<JiraMetadata | null> {
    try {
      const { data, error } = await supabase.functions.invoke('jira-get-metadata');

      if (error) {
        console.error('Supabase function error:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('Error fetching metadata:', err);
      return null;
    }
  },

  async enhanceDescription(
    summary: string, 
    rawDescription: string, 
    issueType?: string
  ): Promise<{ enhancedDescription: string | null; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('ticket-ai-enhance', {
        body: { summary, rawDescription, issueType },
      });

      if (error) {
        console.error('AI enhancement error:', error);
        return { enhancedDescription: null, error: error.message };
      }

      if (data?.error) {
        return { enhancedDescription: null, error: data.error };
      }

      return { enhancedDescription: data?.enhancedDescription || null };
    } catch (err) {
      console.error('Error enhancing description:', err);
      return { enhancedDescription: null, error: 'Failed to enhance description' };
    }
  },
};
