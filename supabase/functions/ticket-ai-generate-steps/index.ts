import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateStepsRequest {
  workspaceId?: string;
  title: string;
  issueType?: string;
  platform?: 'Android' | 'iOS' | 'Web' | 'Both';
  userInputs?: Record<string, string>;
  mode: 'analyze' | 'generate_steps' | 'enhance_result';
}

interface WorkspaceContext {
  userStories?: string;
  appFiles?: Array<{ name: string; type: string; content?: string }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Server configuration error');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestBody: GenerateStepsRequest = await req.json();
    const { workspaceId, title, issueType, platform, userInputs, mode } = requestBody;

    // Fetch workspace context if workspaceId is provided
    let workspaceContext: WorkspaceContext = {};
    
    if (workspaceId) {
      // Verify user owns the workspace
      const { data: workspace, error: workspaceError } = await supabaseClient
        .from('workspaces')
        .select('id, name, description')
        .eq('id', workspaceId)
        .eq('owner_id', user.id)
        .single();

      if (!workspaceError && workspace) {
        // Fetch workspace files for context
        const { data: files } = await supabaseClient
          .from('workspace_files')
          .select('file_name, file_type, content_extracted')
          .eq('workspace_id', workspaceId);

        if (files && files.length > 0) {
          workspaceContext.appFiles = files.map(f => ({
            name: f.file_name,
            type: f.file_type,
            content: f.content_extracted || undefined
          }));

          // Look for user stories in the files
          const userStoryFile = files.find(f => 
            f.file_name.toLowerCase().includes('user') && 
            f.file_name.toLowerCase().includes('stor')
          );
          if (userStoryFile?.content_extracted) {
            workspaceContext.userStories = userStoryFile.content_extracted;
          }
        }
      }
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    let systemPrompt = '';
    let userPrompt = '';

    if (mode === 'analyze') {
      // Analyze the title and determine what follow-up questions to ask
      systemPrompt = `You are an intelligent Jira ticket assistant that analyzes ticket titles to understand the context and determine what information is needed.

WORKSPACE CONTEXT:
${workspaceContext.userStories ? `User Stories:\n${workspaceContext.userStories}\n` : ''}
${workspaceContext.appFiles?.length ? `Application Files: ${workspaceContext.appFiles.map(f => f.name).join(', ')}\n` : ''}

Based on the ticket title, you must:
1. Identify the application module/feature being referenced (e.g., Login, Registration, Dashboard, Payment)
2. Determine what specific inputs are needed to reproduce the issue
3. Generate a list of 1-3 focused follow-up questions to gather reproduction data

RESPOND IN THIS EXACT JSON FORMAT:
{
  "module": "identified module name",
  "flowType": "login|registration|checkout|profile|settings|search|navigation|payment|other",
  "questions": [
    {
      "id": "unique_id",
      "question": "The question to ask the user",
      "inputType": "text|select|credentials",
      "placeholder": "Placeholder text for input",
      "required": true
    }
  ],
  "understanding": "Brief explanation of what you understood from the title"
}

RULES:
- Questions must be specific to the identified flow
- For login issues: ask for credentials (username/password format)
- For search issues: ask for search terms
- For navigation issues: ask for starting and destination screens
- Keep questions minimal - only ask what's truly needed
- Don't ask for information that can be inferred`;

      userPrompt = `Ticket Title: "${title}"
Issue Type: ${issueType || 'Bug'}
Platform: ${platform || 'Not specified'}

Analyze this title and provide the JSON response with follow-up questions needed to generate reproduction steps.`;

    } else if (mode === 'generate_steps') {
      // Generate structured steps based on title, user inputs, and actual/expected results
      systemPrompt = `You are an expert QA engineer that generates precise, reproducible test steps for Jira tickets.

WORKSPACE CONTEXT:
${workspaceContext.userStories ? `User Stories:\n${workspaceContext.userStories}\n` : ''}
${workspaceContext.appFiles?.length ? `Application Files: ${workspaceContext.appFiles.map(f => f.name).join(', ')}\n` : ''}

You have been given:
1. The ticket title describing the issue
2. The actual result (what went wrong)
3. The expected result (what should happen)
4. Platform information

Using this context, generate steps that:
1. Follow the actual application flow that would lead to the issue
2. Are based on the actual/expected results to understand the flow
3. Use professional Gherkin-like format
4. Match real UI elements and actions
5. Account for platform-specific differences if applicable

RESPOND IN THIS EXACT JSON FORMAT:
{
  "steps": [
    "Launch the application",
    "Navigate to [relevant screen based on title]",
    "Enter [relevant data if applicable]",
    "Tap/Click on [action button]",
    "Observe the result"
  ],
  "module": "Module name",
  "preconditions": ["User is logged in", "Network connection is available"],
  "platformNotes": {
    "android": "Android-specific note if any",
    "ios": "iOS-specific note if any"
  }
}

RULES:
- Analyze the actual result to understand what action led to the bug
- Work backwards from the expected result to determine the correct flow
- Steps must be realistic and follow logical app navigation
- Use clear action words: tap, click, enter, swipe, scroll, navigate
- Include any setup steps needed (login, navigation to screen)
- Keep steps concise but complete
- No imaginary steps - only real application interactions`;

      const inputsText = userInputs 
        ? Object.entries(userInputs).map(([k, v]) => `${k}: ${v}`).join('\n')
        : 'No specific inputs provided';

      userPrompt = `Ticket Title: "${title}"
Issue Type: ${issueType || 'Bug'}
Platform: ${platform || 'Both'}

Actual Result (what went wrong):
${userInputs?.actualResult || 'Not provided'}

Expected Result (what should happen):
${userInputs?.expectedResult || 'Not provided'}

Additional Context:
${inputsText}

Based on the title and the actual/expected results, generate the steps that would reproduce this issue.`;

    } else if (mode === 'enhance_result') {
      // Enhance actual/expected result descriptions
      systemPrompt = `You are a professional QA writer that enhances bug report descriptions.

Your task is to:
1. Take basic user input about actual/expected results
2. Refine it into professional Jira language
3. Expand short descriptions into clear, detailed explanations
4. Maintain technical accuracy - never add assumptions

RESPOND IN THIS EXACT JSON FORMAT:
{
  "enhancedActualResult": "Professional description of what actually happened",
  "enhancedExpectedResult": "Professional description of what should happen"
}

RULES:
- Keep the user's original meaning
- Add clarity without changing the facts
- Use professional QA terminology
- Include impact/severity indicators for actual result
- Include acceptance criteria language for expected result`;

      userPrompt = `Title: "${title}"
Issue Type: ${issueType || 'Bug'}

User's Actual Result: ${userInputs?.actualResult || 'Not provided'}
User's Expected Result: ${userInputs?.expectedResult || 'Not provided'}

Enhance these descriptions into professional Jira format.`;
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again shortly.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits required.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI request failed');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    // Parse JSON from the response
    let result;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
      result = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', content);
      // Return a fallback response
      if (mode === 'analyze') {
        result = {
          module: 'Unknown',
          flowType: 'other',
          questions: [
            {
              id: 'description',
              question: 'Please describe the issue in detail.',
              inputType: 'text',
              placeholder: 'Describe what happened...',
              required: true
            }
          ],
          understanding: 'Unable to fully analyze the title. Please provide more details.'
        };
      } else if (mode === 'generate_steps') {
        result = {
          steps: [
            'And User navigates to the relevant screen',
            'And User performs the action',
            'Then Issue is observed'
          ],
          module: 'Unknown',
          preconditions: []
        };
      } else {
        result = {
          enhancedActualResult: userInputs?.actualResult || 'Issue observed',
          enhancedExpectedResult: userInputs?.expectedResult || 'Expected behavior'
        };
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      mode,
      result 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('ticket-ai-generate-steps error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
