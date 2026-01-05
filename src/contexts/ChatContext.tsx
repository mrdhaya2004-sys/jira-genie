import React, { createContext, useContext, useState, useCallback } from 'react';
import { ChatMessage, TicketData, ConversationStep, ChatOption, DuplicateTicket } from '@/types/ticket';
import { useAuth } from './AuthContext';

interface ChatContextType {
  messages: ChatMessage[];
  currentStep: number;
  ticketData: Partial<TicketData>;
  isTyping: boolean;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  handleUserInput: (value: string, attachments?: File[]) => void;
  handleOptionSelect: (option: ChatOption) => void;
  resetChat: () => void;
  startNewTicket: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const conversationSteps: ConversationStep[] = [
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
    options: [
      { id: 'bug', label: 'Bug', value: 'Bug', icon: '🐛', description: 'Something is broken or not working', color: 'destructive' },
      { id: 'task', label: 'Task', value: 'Task', icon: '✅', description: 'A piece of work to be done', color: 'primary' },
      { id: 'story', label: 'Story', value: 'Story', icon: '📖', description: 'A new feature or enhancement', color: 'success' },
      { id: 'incident', label: 'Incident', value: 'Incident', icon: '🚨', description: 'Production issue requiring immediate attention', color: 'warning' },
    ],
  },
  {
    id: 'priority',
    field: 'priority',
    question: "What's the **priority** level for this issue?",
    inputType: 'select',
    options: [
      { id: 'critical', label: 'Critical', value: 'Critical', icon: '🔴', description: 'System down, blocking all work', color: 'destructive' },
      { id: 'high', label: 'High', value: 'High', icon: '🟠', description: 'Major impact, needs urgent attention', color: 'warning' },
      { id: 'medium', label: 'Medium', value: 'Medium', icon: '🔵', description: 'Moderate impact, can wait a bit', color: 'primary' },
      { id: 'low', label: 'Low', value: 'Low', icon: '🟢', description: 'Minor issue, no rush', color: 'success' },
    ],
  },
  {
    id: 'module',
    field: 'module',
    question: "Which **module or component** is affected?",
    inputType: 'select',
    options: [
      { id: 'auth', label: 'Authentication', value: 'Authentication', icon: '🔐' },
      { id: 'database', label: 'Database', value: 'Database', icon: '🗄️' },
      { id: 'api', label: 'API Services', value: 'API Services', icon: '🔌' },
      { id: 'ui', label: 'User Interface', value: 'User Interface', icon: '🖥️' },
      { id: 'infra', label: 'Infrastructure', value: 'Infrastructure', icon: '☁️' },
      { id: 'security', label: 'Security', value: 'Security', icon: '🛡️' },
    ],
  },
  {
    id: 'sprint',
    field: 'sprint',
    question: "Which **sprint** should this be assigned to?",
    inputType: 'select',
    options: [
      { id: 'current', label: 'Current Sprint', value: 'Sprint 24', icon: '🏃', description: 'Sprint 24 (Jan 6 - Jan 19)' },
      { id: 'next', label: 'Next Sprint', value: 'Sprint 25', icon: '📅', description: 'Sprint 25 (Jan 20 - Feb 2)' },
      { id: 'backlog', label: 'Backlog', value: 'Backlog', icon: '📋', description: 'Add to product backlog' },
    ],
  },
  {
    id: 'assignee',
    field: 'assignee',
    question: "Who should this be **assigned** to? I can suggest team members based on the module.",
    inputType: 'select',
    options: [
      { id: 'auto', label: 'Auto-assign', value: 'auto', icon: '🤖', description: 'Let AI assign based on workload' },
      { id: 'sarah', label: 'Sarah Chen', value: 'sarah.chen@company.com', icon: '👩‍💻', description: 'Cloud Infrastructure Lead' },
      { id: 'mike', label: 'Mike Johnson', value: 'mike.johnson@company.com', icon: '👨‍💻', description: 'Senior DevOps Engineer' },
      { id: 'emma', label: 'Emma Wilson', value: 'emma.wilson@company.com', icon: '👩‍💻', description: 'Security Specialist' },
    ],
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

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentStep, setCurrentStep] = useState(-1);
  const [ticketData, setTicketData] = useState<Partial<TicketData>>({
    projectKey: 'CLOUD',
    attachments: [],
  });
  const [isTyping, setIsTyping] = useState(false);

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
    // Simulate AI duplicate detection
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Mock duplicate detection - in production, this would use semantic similarity
    const mockDuplicates: DuplicateTicket[] = [];
    
    if (summary.toLowerCase().includes('login') || summary.toLowerCase().includes('auth')) {
      mockDuplicates.push({
        key: 'CLOUD-1234',
        summary: 'Authentication fails intermittently for SSO users',
        status: 'In Progress',
        similarity: 0.78,
        url: 'https://jira.company.com/browse/CLOUD-1234',
      });
    }
    
    return mockDuplicates;
  }, []);

  const moveToNextStep = useCallback(async () => {
    const nextStep = currentStep + 1;
    
    if (nextStep < conversationSteps.length) {
      await simulateBotTyping(800);
      
      const step = conversationSteps[nextStep];
      
      // Check for duplicates before confirmation
      if (step.field === 'confirmation' && ticketData.summary && ticketData.description) {
        const duplicates = await checkForDuplicates(ticketData.summary, ticketData.description);
        
        if (duplicates.length > 0) {
          addMessage({
            type: 'system',
            content: "⚠️ I found some **potentially related tickets**. Please review them to avoid duplicates:",
            duplicates,
          });
          await simulateBotTyping(500);
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
  }, [currentStep, ticketData, addMessage, simulateBotTyping, checkForDuplicates]);

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
        await simulateBotTyping(1500);
        addMessage({
          type: 'system',
          content: "🎉 **Ticket created successfully!**\n\n**CLOUD-1337** has been created and assigned. You'll receive email notifications for updates.\n\n[View in Jira →](https://jira.company.com/browse/CLOUD-1337)",
        });
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
  }, [currentStep, addMessage, simulateBotTyping, moveToNextStep]);

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
  }, [currentStep, addMessage, moveToNextStep]);

  const startNewTicket = useCallback(async () => {
    setMessages([]);
    setCurrentStep(-1);
    setTicketData({
      projectKey: 'CLOUD',
      attachments: [],
    });
    
    await simulateBotTyping(500);
    
    // Welcome message
    addMessage({
      type: 'bot',
      content: `Hello ${user?.name || 'there'}! 👋\n\nI'm **TicketBot**, your AI-powered IT support assistant. I'll help you create Jira tickets quickly and efficiently.\n\nI can:\n• Classify and prioritize your issues automatically\n• Detect duplicate tickets\n• Suggest the right assignee\n• Enhance your descriptions with AI\n\nLet's get started!`,
    });
    
    await simulateBotTyping(800);
    setCurrentStep(0);
    
    const firstStep = conversationSteps[0];
    addMessage({
      type: 'bot',
      content: firstStep.question,
      inputType: firstStep.inputType,
    });
  }, [user, addMessage, simulateBotTyping]);

  const resetChat = useCallback(() => {
    setMessages([]);
    setCurrentStep(-1);
    setTicketData({
      projectKey: 'CLOUD',
      attachments: [],
    });
  }, []);

  return (
    <ChatContext.Provider
      value={{
        messages,
        currentStep,
        ticketData,
        isTyping,
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
