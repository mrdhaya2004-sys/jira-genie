import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODULE_KEYWORDS: Record<string, string[]> = {
  "Test Case Generator": ["generate test case", "create test case", "test cases for", "write test case"],
  "XPath Generator": ["generate xpath", "create xpath", "xpath for", "find xpath", "css selector for", "dom locator"],
  "Logic Scenario Creator": ["bdd scenario", "gherkin", "cucumber scenario"],
  "Jira Ticket Raiser": ["create jira ticket", "raise jira", "create ticket", "raise ticket", "jira bug", "jira story"],
  "Agentic AI Workspace": ["analyze apk", "analyze ipa", "upload app", "workspace ai", "app analysis"],
};

function detectModuleIntent(message: string): string | null {
  const lower = message.toLowerCase();
  for (const [module, keywords] of Object.entries(MODULE_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return module;
    }
  }
  return null;
}

const SYSTEM_PROMPT = `You are **Hive AI**, the intelligent assistant for the Test Zone platform. You help users with general questions, technical explanations, grammar correction, translation, workflow guidance, platform navigation, and **code generation**.

IMPORTANT RULES:
1. **Code Generation — Single Language Only**:
   - If a user asks you to write automation scripts, programming code, API testing scripts, Selenium/Playwright/Appium/Cypress code, or any programming task — generate the code directly in a formatted code block. Do NOT redirect them to another module.
   - **CRITICAL**: Detect the programming language from the user's query (e.g. "Java Selenium code" → Java, "Python API script" → Python, "Playwright test" → TypeScript). Generate code ONLY in that one language.
   - Do NOT provide multiple language alternatives, do NOT suggest "here's also a Python version", do NOT add extra implementations in other languages.
   - Output exactly ONE code block in the requested language with clean formatting. No unnecessary preamble or postscript.
   - If the user does NOT specify a programming language, ask: "Which programming language would you like me to use? (Java / Python / JavaScript / TypeScript)"
2. **BDD/Gherkin Scenarios**: If a user asks specifically for BDD scenarios, Gherkin feature files, or Cucumber scenarios — redirect them to the Logic Scenario Creator module.
3. **XPath/CSS Selectors from HTML**: If a user asks for XPath expressions from specific HTML — redirect them to the XPath Generator module.
4. **Jira Tickets**: If a user asks to create or raise Jira tickets — redirect them to the Jira Ticket Raiser module.
5. **Test Cases**: If a user asks to generate structured test cases — redirect them to the Test Case Generator module.
6. Never reveal internal system logic, architecture, API keys, database schemas, or any sensitive information.
7. Never provide harmful, offensive, or negative responses.
8. Be concise, helpful, and professional.
9. Use markdown formatting for clarity. Always use fenced code blocks with the language identifier for code.
10. If the user's request is a general knowledge question, answer it normally and helpfully.

When redirecting to a module, use this format:
"This functionality is available in the **[Module Name]** module. Please navigate to that module from the sidebar to use it."

Test Zone modules:
- **Test Case Generator**: Generate structured test cases from descriptions
- **Logic Scenario Creator**: Create BDD/Gherkin scenarios
- **XPath Generator**: Generate XPath/CSS selectors from HTML
- **Jira Ticket Raiser**: Create and manage Jira tickets
- **Agentic AI Workspace**: Upload apps and chat with AI about testing context
- **Current Chat**: Real-time team messaging
- **AI Configuration**: Connect custom AI providers
- **History**: View AI interaction logs
- **My Tickets**: Track created Jira tickets`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Check last user message for module intent
    const lastUserMsg = [...messages].reverse().find((m: { role: string }) => m.role === "user");
    const detectedModule = lastUserMsg ? detectModuleIntent(lastUserMsg.content) : null;

    // If module intent detected, return a redirect message without calling AI
    if (detectedModule) {
      const redirectMsg = `This functionality is available in the **${detectedModule}** module. Please navigate to that module from the sidebar to use it. 🚀\n\nIs there anything else I can help you with?`;
      
      // Return as SSE format for consistency
      const sseData = `data: ${JSON.stringify({
        choices: [{ delta: { content: redirectMsg }, finish_reason: "stop" }]
      })}\n\ndata: [DONE]\n\n`;
      
      return new Response(sseData, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("hive-ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
