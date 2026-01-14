import { supabase } from "@/integrations/supabase/client";
import { TicketData, TitleAnalysisResult, StepsGenerationResult, ResultEnhancementResult, Platform } from "@/types/ticket";

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
    console.log('[jiraService] createTicket called with:', ticketData);
    
    const requestBody = {
      summary: ticketData.summary,
      description: ticketData.description,
      issueType: ticketData.issueType,
      priority: ticketData.priority,
      module: ticketData.module,
      sprint: ticketData.sprint,
      assignee: ticketData.assignee,
    };
    
    console.log('[jiraService] Request body:', requestBody);
    
    try {
      const { data, error } = await supabase.functions.invoke('jira-create-ticket', {
        body: requestBody,
      });

      console.log('[jiraService] Response - data:', data, 'error:', error);

      if (error) {
        console.error('[jiraService] Supabase function error:', error);
        return { success: false, error: error.message };
      }

      if (data?.error) {
        console.error('[jiraService] API returned error:', data.error);
        return { success: false, error: data.error };
      }

      console.log('[jiraService] Ticket created successfully:', data);
      return {
        success: true,
        ticketKey: data.ticketKey,
        ticketId: data.ticketId,
        ticketUrl: data.ticketUrl,
      };
    } catch (err) {
      console.error('[jiraService] Error creating ticket:', err);
      return { success: false, error: 'Failed to create ticket: ' + String(err) };
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

  async analyzeTitle(
    title: string,
    issueType?: string,
    platform?: Platform,
    workspaceId?: string
  ): Promise<{ result: TitleAnalysisResult | null; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('ticket-ai-generate-steps', {
        body: {
          mode: 'analyze',
          title,
          issueType,
          platform,
          workspaceId,
        },
      });

      if (error) {
        console.error('Title analysis error:', error);
        return { result: null, error: error.message };
      }

      if (data?.error) {
        return { result: null, error: data.error };
      }

      return { result: data?.result || null };
    } catch (err) {
      console.error('Error analyzing title:', err);
      return { result: null, error: 'Failed to analyze title' };
    }
  },

  async generateSteps(
    title: string,
    userInputs: Record<string, string>,
    issueType?: string,
    platform?: Platform,
    workspaceId?: string
  ): Promise<{ result: StepsGenerationResult | null; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('ticket-ai-generate-steps', {
        body: {
          mode: 'generate_steps',
          title,
          issueType,
          platform,
          workspaceId,
          userInputs,
        },
      });

      if (error) {
        console.error('Steps generation error:', error);
        return { result: null, error: error.message };
      }

      if (data?.error) {
        return { result: null, error: data.error };
      }

      return { result: data?.result || null };
    } catch (err) {
      console.error('Error generating steps:', err);
      return { result: null, error: 'Failed to generate steps' };
    }
  },

  async enhanceResults(
    title: string,
    actualResult: string,
    expectedResult: string,
    issueType?: string
  ): Promise<{ result: ResultEnhancementResult | null; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('ticket-ai-generate-steps', {
        body: {
          mode: 'enhance_result',
          title,
          issueType,
          userInputs: {
            actualResult,
            expectedResult,
          },
        },
      });

      if (error) {
        console.error('Result enhancement error:', error);
        return { result: null, error: error.message };
      }

      if (data?.error) {
        return { result: null, error: data.error };
      }

      return { result: data?.result || null };
    } catch (err) {
      console.error('Error enhancing results:', err);
      return { result: null, error: 'Failed to enhance results' };
    }
  },
};
