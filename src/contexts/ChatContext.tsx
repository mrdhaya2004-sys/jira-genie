import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ChatMessage, TicketData, ChatOption, DuplicateTicket, DynamicInput, Platform, Environment, TitleAnalysisResult } from '@/types/ticket';
import { useAuth } from './AuthContext';
import { jiraService, JiraMetadata, DuplicateIssue } from '@/services/jiraService';
import { toast } from 'sonner';

// Intelligent flow phases
type FlowPhase = 
  | 'welcome'
  | 'title_input'
  | 'analyzing_title'
  | 'issue_type'
  | 'platform_selection'
  | 'dynamic_questions'
  | 'generating_steps'
  | 'steps_review'
  | 'actual_result'
  | 'expected_result'
  | 'enhancing_results'
  | 'priority'
  | 'module'
  | 'sprint'
  | 'assignee'
  | 'environment'
  | 'attachments'
  | 'confirmation'
  | 'creating_ticket'
  | 'completed';

interface ChatContextType {
  messages: ChatMessage[];
  currentPhase: FlowPhase;
  ticketData: Partial<TicketData>;
  isTyping: boolean;
  jiraMetadata: JiraMetadata | null;
  dynamicInputs: DynamicInput[];
  userDynamicInputs: Record<string, string>;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  handleUserInput: (value: string, attachments?: File[]) => void;
  handleOptionSelect: (option: ChatOption) => void;
  handleDynamicInputSubmit: (inputs: Record<string, string>) => void;
  resetChat: () => void;
  startNewTicket: () => void;
  handleEditTicket: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentPhase, setCurrentPhase] = useState<FlowPhase>('welcome');
  const [ticketData, setTicketData] = useState<Partial<TicketData>>({
    projectKey: 'CLOUD',
    attachments: [],
  });
  const [isTyping, setIsTyping] = useState(false);
  const [jiraMetadata, setJiraMetadata] = useState<JiraMetadata | null>(null);
  const [dynamicInputs, setDynamicInputs] = useState<DynamicInput[]>([]);
  const [userDynamicInputs, setUserDynamicInputs] = useState<Record<string, string>>({});
  const [titleAnalysis, setTitleAnalysis] = useState<TitleAnalysisResult | null>(null);

  // Fetch Jira metadata on mount
  useEffect(() => {
    const fetchMetadata = async () => {
      const metadata = await jiraService.getMetadata();
      if (metadata) {
        setJiraMetadata(metadata);
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

  const simulateBotTyping = useCallback(async (delay: number = 800) => {
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
      similarity: 0.75,
      url: dup.url,
    }));
  }, []);

  const createJiraTicket = useCallback(async (): Promise<{ success: boolean; ticketKey?: string; ticketUrl?: string; error?: string }> => {
    // Format the description with generated steps
    const stepsText = ticketData.generatedSteps?.length 
      ? ticketData.generatedSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')
      : ticketData.description || 'No steps provided';

    const preconditionsText = ticketData.preconditions?.length
      ? ticketData.preconditions.map(p => `- ${p}`).join('\n')
      : '';

    const structuredDescription = `*Environment:* ${ticketData.environment || 'N/A'}
*Platform:* ${ticketData.platform || 'N/A'}

*Summary:* ${ticketData.summary || ''}

${preconditionsText ? `*Preconditions:*\n${preconditionsText}\n\n` : ''}*Steps to Reproduce:*
${stepsText}

*Actual Result:* ${ticketData.actualResult || 'Not specified'}

*Expected Result:* ${ticketData.expectedResult || 'Not specified'}`;

    const finalTicketData = {
      ...ticketData,
      description: structuredDescription,
    } as TicketData;

    const result = await jiraService.createTicket(finalTicketData);
    return result;
  }, [ticketData]);

  // Get options based on metadata
  const getModuleOptions = useCallback((): ChatOption[] => {
    if (jiraMetadata?.components?.length) {
      return jiraMetadata.components.map((comp, i) => ({
        id: `comp-${i}`,
        label: comp,
        value: comp,
        icon: '📦',
      }));
    }
    return [
      { id: 'auth', label: 'Authentication', value: 'Authentication', icon: '🔐' },
      { id: 'database', label: 'Database', value: 'Database', icon: '🗄️' },
      { id: 'api', label: 'API Services', value: 'API Services', icon: '🔌' },
      { id: 'ui', label: 'User Interface', value: 'User Interface', icon: '🖥️' },
    ];
  }, [jiraMetadata]);

  const getSprintOptions = useCallback((): ChatOption[] => {
    if (jiraMetadata?.sprints?.length) {
      return jiraMetadata.sprints.map((sprint) => ({
        id: `sprint-${sprint.id}`,
        label: sprint.name,
        value: sprint.name,
        icon: '🏃',
      }));
    }
    return [
      { id: 'current', label: 'Current Sprint', value: 'Current Sprint', icon: '🏃' },
      { id: 'next', label: 'Next Sprint', value: 'Next Sprint', icon: '📅' },
      { id: 'backlog', label: 'Backlog', value: 'Backlog', icon: '📋' },
    ];
  }, [jiraMetadata]);

  const getAssigneeOptions = useCallback((): ChatOption[] => {
    const options: ChatOption[] = [
      { id: 'auto', label: 'Auto-assign', value: 'auto', icon: '🤖', description: 'Let AI assign based on workload' },
    ];
    if (jiraMetadata?.users?.length) {
      options.push(...jiraMetadata.users.slice(0, 6).map((user) => ({
        id: user.accountId,
        label: user.displayName,
        value: user.accountId,
        icon: '👤',
        description: user.emailAddress || '',
      })));
    }
    return options;
  }, [jiraMetadata]);

  const getIssueTypeOptions = useCallback((): ChatOption[] => {
    const defaultTypes: ChatOption[] = [
      { id: 'epic', label: 'Epic', value: 'Epic', icon: '🚀', description: 'Large initiative' },
      { id: 'story', label: 'Story', value: 'Story', icon: '📖', description: 'A new feature' },
      { id: 'task', label: 'Task', value: 'Task', icon: '✅', description: 'A piece of work to be done' },
      { id: 'subtask', label: 'Sub-task', value: 'Sub-task', icon: '📌', description: 'Part of a larger task' },
      { id: 'bug', label: 'Bug', value: 'Bug', icon: '🐛', description: 'Something is broken' },
    ];

    if (jiraMetadata?.issueTypes?.length) {
      const iconMap: Record<string, string> = { 
        Bug: '🐛', 
        Task: '✅', 
        Story: '📖', 
        Epic: '🚀', 
        Incident: '🚨', 
        'Sub-task': '📌',
        Subtask: '📌',
      };
      const descMap: Record<string, string> = {
        Bug: 'Something is broken',
        Task: 'A piece of work to be done',
        Story: 'A new feature',
        Epic: 'Large initiative',
        Incident: 'Production issue',
        'Sub-task': 'Part of a larger task',
        Subtask: 'Part of a larger task',
      };
      return jiraMetadata.issueTypes.slice(0, 6).map((type) => ({
        id: type.toLowerCase().replace('-', ''),
        label: type,
        value: type,
        icon: iconMap[type] || '📋',
        description: descMap[type] || '',
      }));
    }
    return defaultTypes;
  }, [jiraMetadata]);

  // Phase transition handlers
  const moveToPhase = useCallback(async (phase: FlowPhase) => {
    setCurrentPhase(phase);
    await simulateBotTyping(600);

    switch (phase) {
      case 'title_input':
        addMessage({
          type: 'bot',
          content: "Please provide a **short title** for the Jira ticket.\n\nExample: \"Login issue\", \"Payment failing on checkout\", \"App crashes on profile page\"",
          inputType: 'text',
        });
        break;

      case 'issue_type':
        addMessage({
          type: 'bot',
          content: "What **type of issue** is this?",
          inputType: 'select',
          options: getIssueTypeOptions(),
        });
        break;

      case 'platform_selection':
        addMessage({
          type: 'bot',
          content: "Which **platform** is affected?",
          inputType: 'select',
          options: [
            { id: 'android', label: 'Android', value: 'Android', icon: '🤖', description: 'Android devices' },
            { id: 'ios', label: 'iOS', value: 'iOS', icon: '🍎', description: 'iPhone/iPad' },
            { id: 'web', label: 'Web', value: 'Web', icon: '🌐', description: 'Web browser' },
            { id: 'both', label: 'Both Mobile', value: 'Both', icon: '📱', description: 'Android and iOS' },
          ],
        });
        break;

      case 'dynamic_questions':
        if (dynamicInputs.length > 0) {
          const questionsText = dynamicInputs.map((q, i) => 
            `${i + 1}. ${q.question}`
          ).join('\n');
          
          addMessage({
            type: 'bot',
            content: `Based on your title, I need some additional information to generate accurate steps:\n\n${questionsText}`,
            inputType: 'dynamic',
            dynamicInputs: dynamicInputs,
          });
        } else {
          // Skip to steps generation if no questions needed
          moveToPhase('generating_steps');
        }
        break;

      case 'steps_review':
        // Steps review is handled by generateStepsWithContext - just show confirmation
        // The steps have already been set and shown, now wait for user to proceed
        await simulateBotTyping(300);
        addMessage({
          type: 'bot',
          content: "Would you like to proceed with these steps, or regenerate them?",
          inputType: 'select',
          options: [
            { id: 'proceed', label: 'Proceed', value: 'proceed', icon: '✅', description: 'Continue with these steps' },
            { id: 'regenerate', label: 'Regenerate', value: 'regenerate', icon: '🔄', description: 'Generate new steps' },
          ],
        });
        break;

      case 'actual_result':
        addMessage({
          type: 'bot',
          content: "Please describe the **Actual Result** — what actually happened or what you observed?",
          inputType: 'text',
        });
        break;

      case 'expected_result':
        addMessage({
          type: 'bot',
          content: "What is the **Expected Result** — what should have happened or the correct behavior?",
          inputType: 'text',
        });
        break;

      case 'priority':
        addMessage({
          type: 'bot',
          content: "What's the **priority** level for this issue?",
          inputType: 'select',
          options: [
            { id: 'critical', label: 'Critical', value: 'Critical', icon: '🔴', description: 'System down, blocking all work' },
            { id: 'high', label: 'High', value: 'High', icon: '🟠', description: 'Major impact, needs urgent attention' },
            { id: 'medium', label: 'Medium', value: 'Medium', icon: '🔵', description: 'Moderate impact, can wait a bit' },
            { id: 'low', label: 'Low', value: 'Low', icon: '🟢', description: 'Minor issue, no rush' },
          ],
        });
        break;

      case 'module':
        addMessage({
          type: 'bot',
          content: "Which **module or component** is affected?",
          inputType: 'select',
          options: getModuleOptions(),
        });
        break;

      case 'sprint':
        addMessage({
          type: 'bot',
          content: "Which **sprint** should this be assigned to?",
          inputType: 'select',
          options: getSprintOptions(),
        });
        break;

      case 'assignee':
        addMessage({
          type: 'bot',
          content: "Who should this be **assigned** to?",
          inputType: 'select',
          options: getAssigneeOptions(),
        });
        break;

      case 'environment':
        addMessage({
          type: 'bot',
          content: "Which **environment** does this issue occur in?",
          inputType: 'select',
          options: [
            { id: 'prod', label: 'Production', value: 'Production', icon: '🚀', description: 'Live production environment' },
            { id: 'uat', label: 'UAT', value: 'UAT', icon: '🧪', description: 'User acceptance testing' },
            { id: 'beta', label: 'Beta', value: 'Beta', icon: '🔬', description: 'Beta/staging environment' },
            { id: 'dev', label: 'Development', value: 'Development', icon: '💻', description: 'Development environment' },
          ],
        });
        break;

      case 'attachments':
        addMessage({
          type: 'bot',
          content: "Would you like to add any **attachments**? Screenshots or videos can help resolve issues faster.\n\nType 'skip' to continue without attachments.",
          inputType: 'file',
        });
        break;

      case 'confirmation':
        // Check for duplicates first
        setIsTyping(true);
        addMessage({
          type: 'system',
          content: "🔍 Checking for duplicate tickets...",
        });
        
        const combinedDesc = `${ticketData.generatedSteps?.join(' ') || ''} ${ticketData.actualResult || ''} ${ticketData.expectedResult || ''}`;
        const duplicates = await checkForDuplicates(ticketData.summary || '', combinedDesc);
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

        addMessage({
          type: 'bot',
          content: "Great! I've prepared your ticket. Please review the details below and confirm to create it.",
          inputType: 'confirmation',
          ticketPreview: ticketData,
        });
        break;

      case 'completed':
        // Do nothing, ticket creation is handled separately
        break;
    }
  }, [addMessage, simulateBotTyping, ticketData, dynamicInputs, checkForDuplicates, getIssueTypeOptions, getModuleOptions, getSprintOptions, getAssigneeOptions]);

  // Handle analyzing title with AI
  const analyzeTitle = useCallback(async (title: string) => {
    setCurrentPhase('analyzing_title');
    setIsTyping(true);
    
    addMessage({
      type: 'system',
      content: "🧠 Analyzing your title with AI Core Brain...",
    });

    const { result, error } = await jiraService.analyzeTitle(
      title,
      ticketData.issueType,
      ticketData.platform
    );

    setIsTyping(false);

    if (error || !result) {
      addMessage({
        type: 'system',
        content: "⚠️ AI analysis encountered an issue. Proceeding with standard flow.",
      });
      await moveToPhase('issue_type');
      return;
    }

    setTitleAnalysis(result);
    
    // Show AI understanding
    addMessage({
      type: 'system',
      content: `✨ **AI Understanding:** ${result.understanding}\n\n*Module detected:* ${result.module}`,
    });

    // Update module from AI analysis
    setTicketData(prev => ({
      ...prev,
      module: result.module,
    }));

    // Set dynamic inputs for the next phase
    if (result.questions && result.questions.length > 0) {
      setDynamicInputs(result.questions);
    }

    await simulateBotTyping(500);
    // After analyzing title, move to platform selection
    await moveToPhase('platform_selection');
  }, [ticketData, addMessage, simulateBotTyping, moveToPhase]);

  // Handle generating steps with AI (with full context including actual/expected results)
  const generateStepsWithContext = useCallback(async (expectedResult: string) => {
    setCurrentPhase('generating_steps');
    setIsTyping(true);

    addMessage({
      type: 'system',
      content: "🧠 AI is analyzing the flow and generating intelligent steps to reproduce...",
    });

    // Include actual and expected results in the context for better step generation
    const contextInputs = {
      ...userDynamicInputs,
      actualResult: ticketData.actualResult || '',
      expectedResult: expectedResult,
    };

    const { result, error } = await jiraService.generateSteps(
      ticketData.summary || '',
      contextInputs,
      ticketData.issueType,
      ticketData.platform
    );

    setIsTyping(false);

    if (error || !result) {
      addMessage({
        type: 'system',
        content: "⚠️ Could not generate steps automatically. Let me try with basic flow.",
      });
      
      // Create basic steps based on available info
      const basicSteps = [
        `Navigate to the ${titleAnalysis?.module || 'application'} screen`,
        'Perform the action described in the title',
        `Observe: ${ticketData.actualResult || 'the issue occurs'}`,
      ];
      
      setTicketData(prev => ({
        ...prev,
        generatedSteps: basicSteps,
        expectedResult: expectedResult,
        description: basicSteps.join('\n'),
      }));
      
      await moveToPhase('steps_review');
      return;
    }

    // Store generated steps and enhance results
    setTicketData(prev => ({
      ...prev,
      generatedSteps: result.steps,
      preconditions: result.preconditions,
      expectedResult: expectedResult,
      description: result.steps.join('\n'),
    }));

    // Show generated steps in the chat
    addMessage({
      type: 'bot',
      content: "✅ **Steps to Reproduce** generated successfully!\n\nReview the steps below:",
      generatedSteps: result.steps,
    });

    // Enhance the actual/expected results with AI
    await simulateBotTyping(300);
    addMessage({
      type: 'system',
      content: "✨ Enhancing results with professional Jira language...",
    });

    const enhanceResult = await jiraService.enhanceResults(
      ticketData.summary || '',
      ticketData.actualResult || '',
      expectedResult,
      ticketData.issueType
    );

    if (!enhanceResult.error && enhanceResult.result) {
      setTicketData(prev => ({
        ...prev,
        actualResult: enhanceResult.result.enhancedActualResult,
        expectedResult: enhanceResult.result.enhancedExpectedResult,
      }));
      
      addMessage({
        type: 'system',
        content: "✅ Results enhanced successfully!",
      });
    }

    await moveToPhase('steps_review');
  }, [ticketData, userDynamicInputs, titleAnalysis, addMessage, simulateBotTyping, moveToPhase]);

  // Handle enhancing results with AI
  const enhanceResults = useCallback(async () => {
    setCurrentPhase('enhancing_results');
    setIsTyping(true);

    addMessage({
      type: 'system',
      content: "✨ Enhancing results with professional Jira language...",
    });

    const { result, error } = await jiraService.enhanceResults(
      ticketData.summary || '',
      ticketData.actualResult || '',
      ticketData.expectedResult || '',
      ticketData.issueType
    );

    setIsTyping(false);

    if (!error && result) {
      setTicketData(prev => ({
        ...prev,
        actualResult: result.enhancedActualResult,
        expectedResult: result.enhancedExpectedResult,
      }));

      addMessage({
        type: 'system',
        content: "✅ Results enhanced successfully!",
      });
    }

    await moveToPhase('priority');
  }, [ticketData, addMessage, moveToPhase]);

  const handleUserInput = useCallback(async (value: string, attachments?: File[]) => {
    // Add user message
    addMessage({
      type: 'user',
      content: value,
    });

    switch (currentPhase) {
      case 'title_input':
        // Handle 'keep' for edit flow
        if (value.toLowerCase() === 'keep' && ticketData.summary) {
          await analyzeTitle(ticketData.summary);
        } else {
          setTicketData(prev => ({ ...prev, summary: value }));
          await analyzeTitle(value);
        }
        break;

      case 'actual_result':
        setTicketData(prev => ({ ...prev, actualResult: value }));
        await moveToPhase('expected_result');
        break;

      case 'expected_result':
        setTicketData(prev => ({ ...prev, expectedResult: value }));
        // Now generate steps with full context (title, issue type, platform, actual/expected results)
        await generateStepsWithContext(value);
        break;

      case 'attachments':
        if (value.toLowerCase() === 'skip') {
          await moveToPhase('confirmation');
        } else if (attachments?.length) {
          // Handle attachments
          setTicketData(prev => ({
            ...prev,
            attachments: attachments.map((file, i) => ({
              id: `att-${i}`,
              name: file.name,
              type: file.type.startsWith('image/') ? 'image' as const : 
                    file.type.startsWith('video/') ? 'video' as const : 'document' as const,
              url: URL.createObjectURL(file),
              size: file.size,
            })),
          }));
          await moveToPhase('confirmation');
        }
        break;

      case 'confirmation':
        if (value.toLowerCase() === 'confirm' || value.toLowerCase() === 'yes') {
          setCurrentPhase('creating_ticket');
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
              content: `🎉 **Ticket created successfully!**\n\n**${result.ticketKey}** has been created and assigned.\n\n[View in Jira →](${result.ticketUrl})`,
            });
            setCurrentPhase('completed');
          } else {
            toast.error(result.error || 'Failed to create ticket');
            addMessage({
              type: 'system',
              content: `❌ **Failed to create ticket**\n\n${result.error || 'An unexpected error occurred. Please try again.'}`,
            });
          }
        } else {
          await simulateBotTyping(500);
          addMessage({
            type: 'bot',
            content: "No problem! Would you like to modify any details or cancel?",
          });
        }
        break;

      default:
        // Handle any manual text inputs for steps
        if (currentPhase === 'generating_steps') {
          setTicketData(prev => ({ ...prev, description: value }));
          await moveToPhase('actual_result');
        }
        break;
    }
  }, [currentPhase, addMessage, analyzeTitle, moveToPhase, enhanceResults, simulateBotTyping, createJiraTicket]);

  const handleOptionSelect = useCallback(async (option: ChatOption) => {
    // Add user selection message
    addMessage({
      type: 'user',
      content: `${option.icon || ''} ${option.label}`.trim(),
    });

    switch (currentPhase) {
      case 'issue_type':
        setTicketData(prev => ({ ...prev, issueType: option.value as TicketData['issueType'] }));
        // After issue type, ask for title
        await moveToPhase('title_input');
        break;

      case 'platform_selection':
        setTicketData(prev => ({ ...prev, platform: option.value as Platform }));
        // After platform, ask for actual result first (before generating steps)
        await moveToPhase('actual_result');
        break;

      case 'priority':
        setTicketData(prev => ({ ...prev, priority: option.value as TicketData['priority'] }));
        await moveToPhase('module');
        break;

      case 'module':
        setTicketData(prev => ({ ...prev, module: option.value }));
        await moveToPhase('sprint');
        break;

      case 'sprint':
        setTicketData(prev => ({ ...prev, sprint: option.value }));
        await moveToPhase('assignee');
        break;

      case 'assignee':
        setTicketData(prev => ({ ...prev, assignee: option.value }));
        await moveToPhase('environment');
        break;

      case 'environment':
        setTicketData(prev => ({ ...prev, environment: option.value as Environment }));
        await moveToPhase('attachments');
        break;

      case 'steps_review':
        if (option.value === 'proceed') {
          // Continue with these steps
          await moveToPhase('priority');
        } else if (option.value === 'regenerate') {
          // Regenerate steps
          await generateStepsWithContext(ticketData.expectedResult || '');
        }
        break;
    }
  }, [currentPhase, addMessage, moveToPhase, dynamicInputs, generateStepsWithContext, ticketData.expectedResult]);

  const handleDynamicInputSubmit = useCallback(async (inputs: Record<string, string>) => {
    setUserDynamicInputs(inputs);
    
    // Show what user entered
    const inputSummary = Object.entries(inputs)
      .map(([key, value]) => `• ${key}: ${value}`)
      .join('\n');
    
    addMessage({
      type: 'user',
      content: `Provided information:\n${inputSummary}`,
    });

    // Dynamic inputs are now stored and will be used when generating steps
    // Move to actual result phase to continue the flow
    await moveToPhase('actual_result');
  }, [addMessage, moveToPhase]);

  const startNewTicket = useCallback(async () => {
    setMessages([]);
    setCurrentPhase('welcome');
    setTicketData({
      projectKey: jiraMetadata?.projectKey || 'CLOUD',
      attachments: [],
    });
    setDynamicInputs([]);
    setUserDynamicInputs({});
    setTitleAnalysis(null);
    
    await simulateBotTyping(500);
    
    const projectInfo = jiraMetadata ? ` Connected to **${jiraMetadata.projectName}** (${jiraMetadata.projectKey}).` : '';
    
    // Welcome message
    addMessage({
      type: 'bot',
      content: `Hello ${profile?.full_name || 'there'}! 👋\n\nI'm **TicketBot**, your AI-powered Jira ticket assistant.${projectInfo}\n\n**What I can do:**\n• 🧠 Understand your issue from a simple title\n• 🔧 Auto-generate steps to reproduce\n• ✨ Enhance descriptions with professional language\n• 🔍 Detect duplicate tickets\n• 🎯 Suggest the right assignee\n\nLet's create your ticket!`,
    });
    
    // Ask for issue type first, then title
    await moveToPhase('issue_type');
  }, [profile, jiraMetadata, addMessage, simulateBotTyping, moveToPhase]);

  const resetChat = useCallback(() => {
    setMessages([]);
    setCurrentPhase('welcome');
    setTicketData({
      projectKey: jiraMetadata?.projectKey || 'CLOUD',
      attachments: [],
    });
    setDynamicInputs([]);
    setUserDynamicInputs({});
    setTitleAnalysis(null);
  }, [jiraMetadata]);

  const handleEditTicket = useCallback(async () => {
    await simulateBotTyping(400);
    addMessage({
      type: 'bot',
      content: "📝 Let's re-edit your ticket. Starting from the title.\n\nCurrent title: **" + (ticketData.summary || 'Not set') + "**\n\nProvide a new title or type 'keep' to keep the current one.",
      inputType: 'text',
    });
    setCurrentPhase('title_input');
  }, [ticketData, addMessage, simulateBotTyping]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        currentPhase,
        ticketData,
        isTyping,
        jiraMetadata,
        dynamicInputs,
        userDynamicInputs,
        addMessage,
        handleUserInput,
        handleOptionSelect,
        handleDynamicInputSubmit,
        resetChat,
        startNewTicket,
        handleEditTicket,
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
