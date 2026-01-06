import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ChatMessage, TicketData, ConversationStep, ChatOption, DuplicateTicket } from '@/types/ticket';
import { useAuth } from './AuthContext';
import { jiraService, JiraMetadata, DuplicateIssue } from '@/services/jiraService';
import { toast } from 'sonner';

interface ChatContextType {
  messages: ChatMessage[];
  currentStep: number;
  ticketData: Partial<TicketData>;
  isTyping: boolean;
  jiraMetadata: JiraMetadata | null;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  handleUserInput: (value: string, attachments?: File[]) => void;
  handleOptionSelect: (option: ChatOption) => void;
  resetChat: () => void;
  startNewTicket: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const getConversationSteps = (metadata: JiraMetadata | null): ConversationStep[] => {
  const moduleOptions = metadata?.components?.length 
    ? metadata.components.map((comp, i) => ({
        id: `comp-${i}`,
        label: comp,
        value: comp,
        icon: '📦',
      }))
    : [
        { id: 'auth', label: 'Authentication', value: 'Authentication', icon: '🔐' },
        { id: 'database', label: 'Database', value: 'Database', icon: '🗄️' },
        { id: 'api', label: 'API Services', value: 'API Services', icon: '🔌' },
        { id: 'ui', label: 'User Interface', value: 'User Interface', icon: '🖥️' },
        { id: 'infra', label: 'Infrastructure', value: 'Infrastructure', icon: '☁️' },
        { id: 'security', label: 'Security', value: 'Security', icon: '🛡️' },
      ];

  const sprintOptions = metadata?.sprints?.length
    ? metadata.sprints.map((sprint) => ({
        id: `sprint-${sprint.id}`,
        label: sprint.name,
        value: sprint.name,
        icon: '🏃',
      }))
    : [
        { id: 'current', label: 'Current Sprint', value: 'Current Sprint', icon: '🏃' },
        { id: 'next', label: 'Next Sprint', value: 'Next Sprint', icon: '📅' },
        { id: 'backlog', label: 'Backlog', value: 'Backlog', icon: '📋' },
      ];

  const assigneeOptions = metadata?.users?.length
    ? [
        { id: 'auto', label: 'Auto-assign', value: 'auto', icon: '🤖', description: 'Let AI assign based on workload' },
        ...metadata.users.slice(0, 6).map((user) => ({
          id: user.accountId,
          label: user.displayName,
          value: user.accountId,
          icon: '👤',
          description: user.emailAddress || '',
        })),
      ]
    : [
        { id: 'auto', label: 'Auto-assign', value: 'auto', icon: '🤖', description: 'Let AI assign based on workload' },
      ];

  const issueTypeOptions = metadata?.issueTypes?.length
    ? metadata.issueTypes.slice(0, 4).map((type) => {
        const iconMap: Record<string, string> = {
          'Bug': '🐛',
          'Task': '✅',
          'Story': '📖',
          'Epic': '🚀',
          'Incident': '🚨',
        };
        return {
          id: type.toLowerCase(),
          label: type,
          value: type,
          icon: iconMap[type] || '📋',
        };
      })
    : [
        { id: 'bug', label: 'Bug', value: 'Bug', icon: '🐛', description: 'Something is broken', color: 'destructive' as const },
        { id: 'task', label: 'Task', value: 'Task', icon: '✅', description: 'A piece of work to be done', color: 'primary' as const },
        { id: 'story', label: 'Story', value: 'Story', icon: '📖', description: 'A new feature', color: 'success' as const },
        { id: 'incident', label: 'Incident', value: 'Incident', icon: '🚨', description: 'Production issue', color: 'warning' as const },
      ];

  return [
    {
      id: 'summary',
      field: 'summary',
      question: "Hi! 👋 I'm your IT Support Assistant. I'll help you create a Jira ticket. Let's start with the basics.\n\nWhat's the **issue or request** you'd like to report? Please provide a brief summary.",
      inputType: 'text',
      aiEnhance: true,
    },
    {
      id: 'description',
      field: 'description',
      question: "Got it! Now, could you provide more **details** about this issue? Include any error messages, steps to reproduce, or relevant context.",
      inputType: 'text',
      aiEnhance: true,
    },
    {
      id: 'issueType',
      field: 'issueType',
      question: "Based on your description, I'll help categorize this. What **type of issue** is this?",
      inputType: 'select',
      options: issueTypeOptions,
    },
    {
      id: 'priority',
      field: 'priority',
      question: "What's the **priority** level for this issue?",
      inputType: 'select',
      options: [
        { id: 'critical', label: 'Critical', value: 'Critical', icon: '🔴', description: 'System down, blocking all work', color: 'destructive' as const },
        { id: 'high', label: 'High', value: 'High', icon: '🟠', description: 'Major impact, needs urgent attention', color: 'warning' as const },
        { id: 'medium', label: 'Medium', value: 'Medium', icon: '🔵', description: 'Moderate impact, can wait a bit', color: 'primary' as const },
        { id: 'low', label: 'Low', value: 'Low', icon: '🟢', description: 'Minor issue, no rush', color: 'success' as const },
      ],
    },
    {
      id: 'module',
      field: 'module',
      question: "Which **module or component** is affected?",
      inputType: 'select',
      options: moduleOptions,
    },
    {
      id: 'sprint',
      field: 'sprint',
      question: "Which **sprint** should this be assigned to?",
      inputType: 'select',
      options: sprintOptions,
    },
    {
      id: 'assignee',
      field: 'assignee',
      question: "Who should this be **assigned** to? I can suggest team members based on the module.",
      inputType: 'select',
      options: assigneeOptions,
    },
    {
      id: 'attachments',
      field: 'attachments',
      question: "Would you like to add any **attachments**? Screenshots or videos can help resolve issues faster.",
      inputType: 'file',
    },
    {
      id: 'confirmation',
      field: 'confirmation',
      question: "Great! I've prepared your ticket. Please review the details below and confirm to create it.",
      inputType: 'confirmation',
    },
  ];
};

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentStep, setCurrentStep] = useState(-1);
  const [ticketData, setTicketData] = useState<Partial<TicketData>>({
    projectKey: 'CLOUD',
    attachments: [],
  });
  const [isTyping, setIsTyping] = useState(false);
  const [jiraMetadata, setJiraMetadata] = useState<JiraMetadata | null>(null);
  const [conversationSteps, setConversationSteps] = useState<ConversationStep[]>(getConversationSteps(null));

  // Fetch Jira metadata on mount
  useEffect(() => {
    const fetchMetadata = async () => {
      const metadata = await jiraService.getMetadata();
      if (metadata) {
        setJiraMetadata(metadata);
        setConversationSteps(getConversationSteps(metadata));
        setTicketData(prev => ({
          ...prev,
          projectKey: metadata.projectKey,
        }));
      }
    };
    fetchMetadata();
  }, []);

  const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  }, []);

  const simulateBotTyping = useCallback(async (delay: number = 1000) => {
    setIsTyping(true);
    await new Promise(resolve => setTimeout(resolve, delay));
    setIsTyping(false);
  }, []);

  const checkForDuplicates = useCallback(async (summary: string, description: string): Promise<DuplicateTicket[]> => {
    const result = await jiraService.searchDuplicates(summary, description);
    
    return result.duplicates.map((dup: DuplicateIssue) => ({
      key: dup.key,
      summary: dup.summary,
      status: dup.status,
      similarity: 0.75, // Approximate similarity score
      url: dup.url,
    }));
  }, []);

  const createJiraTicket = useCallback(async (): Promise<{ success: boolean; ticketKey?: string; ticketUrl?: string; error?: string }> => {
    const result = await jiraService.createTicket(ticketData as TicketData);
    return result;
  }, [ticketData]);

  const moveToNextStep = useCallback(async () => {
    const nextStep = currentStep + 1;
    
    if (nextStep < conversationSteps.length) {
      await simulateBotTyping(800);
      
      const step = conversationSteps[nextStep];
      
      // Check for duplicates before confirmation
      if (step.field === 'confirmation' && ticketData.summary && ticketData.description) {
        setIsTyping(true);
        addMessage({
          type: 'system',
          content: "🔍 Checking for duplicate tickets...",
        });
        
        const duplicates = await checkForDuplicates(ticketData.summary, ticketData.description);
        setIsTyping(false);
        
        if (duplicates.length > 0) {
          addMessage({
            type: 'system',
            content: "⚠️ I found some **potentially related tickets**. Please review them to avoid duplicates:",
            duplicates,
          });
          await simulateBotTyping(500);
        } else {
          addMessage({
            type: 'system',
            content: "✅ No duplicate tickets found.",
          });
          await simulateBotTyping(300);
        }
      }
      
      addMessage({
        type: 'bot',
        content: step.question,
        options: step.options,
        inputType: step.inputType,
        ticketPreview: step.field === 'confirmation' ? ticketData : undefined,
      });
      
      setCurrentStep(nextStep);
    }
  }, [currentStep, conversationSteps, ticketData, addMessage, simulateBotTyping, checkForDuplicates]);

  const handleUserInput = useCallback(async (value: string, attachments?: File[]) => {
    if (currentStep < 0 || currentStep >= conversationSteps.length) return;
    
    const step = conversationSteps[currentStep];
    
    // Add user message
    addMessage({
      type: 'user',
      content: value,
    });
    
    // Update ticket data
    if (step.field !== 'confirmation' && step.field !== 'duplicate_check') {
      setTicketData(prev => ({
        ...prev,
        [step.field]: step.field === 'attachments' ? attachments : value,
      }));
    }
    
    // Handle confirmation
    if (step.field === 'confirmation') {
      if (value.toLowerCase() === 'confirm' || value.toLowerCase() === 'yes') {
        setIsTyping(true);
        addMessage({
          type: 'system',
          content: "🔄 Creating your Jira ticket...",
        });
        
        const result = await createJiraTicket();
        setIsTyping(false);
        
        if (result.success && result.ticketKey) {
          toast.success(`Ticket ${result.ticketKey} created successfully!`);
          addMessage({
            type: 'system',
            content: `🎉 **Ticket created successfully!**\n\n**${result.ticketKey}** has been created and assigned. You'll receive email notifications for updates.\n\n[View in Jira →](${result.ticketUrl})`,
          });
        } else {
          toast.error(result.error || 'Failed to create ticket');
          addMessage({
            type: 'system',
            content: `❌ **Failed to create ticket**\n\n${result.error || 'An unexpected error occurred. Please try again.'}\n\nWould you like to retry?`,
          });
        }
        return;
      } else {
        await simulateBotTyping(500);
        addMessage({
          type: 'bot',
          content: "No problem! Would you like to modify any details or cancel the ticket creation?",
        });
        return;
      }
    }
    
    // AI enhancement feedback
    if (step.aiEnhance) {
      await simulateBotTyping(600);
      addMessage({
        type: 'system',
        content: `✨ AI enhanced your ${step.field}: improved clarity and formatting.`,
      });
    }
    
    await moveToNextStep();
  }, [currentStep, conversationSteps, addMessage, simulateBotTyping, moveToNextStep, createJiraTicket]);

  const handleOptionSelect = useCallback(async (option: ChatOption) => {
    if (currentStep < 0 || currentStep >= conversationSteps.length) return;
    
    const step = conversationSteps[currentStep];
    
    // Add user selection message
    addMessage({
      type: 'user',
      content: `${option.icon || ''} ${option.label}`.trim(),
    });
    
    // Update ticket data
    if (step.field !== 'confirmation' && step.field !== 'duplicate_check') {
      setTicketData(prev => ({
        ...prev,
        [step.field]: option.value,
      }));
    }
    
    await moveToNextStep();
  }, [currentStep, conversationSteps, addMessage, moveToNextStep]);

  const startNewTicket = useCallback(async () => {
    setMessages([]);
    setCurrentStep(-1);
    setTicketData({
      projectKey: jiraMetadata?.projectKey || 'CLOUD',
      attachments: [],
    });
    
    await simulateBotTyping(500);
    
    const projectInfo = jiraMetadata ? ` Connected to **${jiraMetadata.projectName}** (${jiraMetadata.projectKey}).` : '';
    
    // Welcome message
    addMessage({
      type: 'bot',
      content: `Hello ${profile?.full_name || 'there'}! 👋\n\nI'm **TicketBot**, your AI-powered IT support assistant. I'll help you create Jira tickets quickly and efficiently.${projectInfo}\n\nI can:\n• Classify and prioritize your issues automatically\n• Detect duplicate tickets\n• Suggest the right assignee\n• Enhance your descriptions with AI\n\nLet's get started!`,
    });
    
    await simulateBotTyping(800);
    setCurrentStep(0);
    
    const firstStep = conversationSteps[0];
    addMessage({
      type: 'bot',
      content: firstStep.question,
      inputType: firstStep.inputType,
    });
  }, [profile, jiraMetadata, conversationSteps, addMessage, simulateBotTyping]);

  const resetChat = useCallback(() => {
    setMessages([]);
    setCurrentStep(-1);
    setTicketData({
      projectKey: jiraMetadata?.projectKey || 'CLOUD',
      attachments: [],
    });
  }, [jiraMetadata]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        currentStep,
        ticketData,
        isTyping,
        jiraMetadata,
        addMessage,
        handleUserInput,
        handleOptionSelect,
        resetChat,
        startNewTicket,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
