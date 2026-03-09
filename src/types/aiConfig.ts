export type AIProvider = 'openai' | 'azure_openai' | 'anthropic' | 'google_gemini' | 'custom' | 'local_llm';

export interface AIProviderConfig {
  id: string;
  user_id: string;
  provider: AIProvider;
  api_key_encrypted: string;
  model_name: string;
  endpoint_url: string | null;
  is_active: boolean;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export const AI_PROVIDERS: { value: AIProvider; label: string; requiresEndpoint: boolean; defaultModels: string[] }[] = [
  {
    value: 'openai',
    label: 'OpenAI',
    requiresEndpoint: false,
    defaultModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  },
  {
    value: 'azure_openai',
    label: 'Azure OpenAI',
    requiresEndpoint: true,
    defaultModels: ['gpt-4o', 'gpt-4', 'gpt-35-turbo'],
  },
  {
    value: 'anthropic',
    label: 'Anthropic',
    requiresEndpoint: false,
    defaultModels: ['claude-sonnet-4-20250514', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
  },
  {
    value: 'google_gemini',
    label: 'Google Gemini',
    requiresEndpoint: false,
    defaultModels: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'],
  },
  {
    value: 'custom',
    label: 'Custom API Endpoint',
    requiresEndpoint: true,
    defaultModels: [],
  },
  {
    value: 'local_llm',
    label: 'Local LLM',
    requiresEndpoint: true,
    defaultModels: [],
  },
];

export type HiveMindAgent = 'TestCaseAgent' | 'ScenarioAgent' | 'AutomationAgent' | 'DOMAgent' | 'TicketAgent';

export const AGENT_FEATURE_MAP: Record<string, HiveMindAgent> = {
  test_cases: 'TestCaseAgent',
  code_generation: 'AutomationAgent',
  xpath_generation: 'DOMAgent',
  jira_ticket: 'TicketAgent',
  scenario_generation: 'ScenarioAgent',
};
