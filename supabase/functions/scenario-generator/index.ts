import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Framework-specific prompt templates
const FRAMEWORK_PROMPTS: Record<string, string> = {
  cucumber: `Generate BDD scenarios in Gherkin/Cucumber format with When/And/Then steps.
Format each step like:
When [action description]
And [action description]
Then [expected result]

Example format:
When Click the Login button from the PreMarketing page
And Select the Country Code
And Enter the Country code "India"
And Select country name
And Enter the Mobile number "9597066222"
And Enter the Password for login by mobile "Phillip1"
And Click on Checkbox
And Login by account button is clicked
Then User should be logged in successfully`,

  testng: `Generate TestNG-style test scenarios with clear method names and annotations.
Format like:
@Test
public void testLoginWithValidCredentials() {
  // Step 1: Navigate to login page
  // Step 2: Enter valid credentials
  // Step 3: Click login button
  // Expected: User logged in successfully
}`,

  playwright: `Generate Playwright test scenarios in TypeScript/JavaScript format.
Format like:
test('should login with valid credentials', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login');
  // Enter credentials
  await page.fill('#email', 'user@example.com');
  await page.fill('#password', 'password123');
  // Click login
  await page.click('button[type="submit"]');
  // Verify success
  await expect(page).toHaveURL('/dashboard');
});`,

  pytest: `Generate PyTest scenarios in Python format.
Format like:
def test_login_with_valid_credentials():
    # Step 1: Navigate to login page
    driver.get('/login')
    # Step 2: Enter credentials
    driver.find_element(By.ID, 'email').send_keys('user@example.com')
    # Step 3: Click login
    driver.find_element(By.ID, 'login-btn').click()
    # Assert success
    assert 'dashboard' in driver.current_url`,

  custom: `Generate automation scenarios in a clear, step-by-step format that can be adapted to any framework.
Format like:
Step 1: [Action] - [Details]
Step 2: [Action] - [Details]
Expected Result: [What should happen]`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const { workspaceId, framework, module: appModule, query, context } = await req.json();

    console.log("Scenario generation request:", { workspaceId, framework, appModule, query });

    // Verify workspace ownership
    const { data: workspace, error: wsError } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", workspaceId)
      .eq("owner_id", user.id)
      .single();

    if (wsError || !workspace) {
      return new Response(JSON.stringify({ error: "Workspace not found or access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build system prompt
    const frameworkPrompt = FRAMEWORK_PROMPTS[framework] || FRAMEWORK_PROMPTS.custom;
    
    let contextInfo = "";
    if (context?.userStories) {
      contextInfo += `\n\n## User Stories (from Workspace Brain):\n${context.userStories}`;
    }
    if (context?.hasApk) {
      contextInfo += "\n\n## Android App (APK) is available in the workspace.";
    }
    if (context?.hasIpa) {
      contextInfo += "\n\n## iOS App (IPA) is available in the workspace.";
    }
    if (context?.appFiles?.length > 0) {
      contextInfo += `\n\n## Available App Files:\n${context.appFiles.map((f: any) => `- ${f.name} (${f.type})`).join("\n")}`;
    }

    const systemPrompt = `You are an expert QA Automation Engineer specializing in creating automation-ready test scenarios.

## Your Task
Generate detailed, accurate automation logic scenarios for the "${appModule}" module.

## Framework
${frameworkPrompt}

## Important Rules
1. Scenario steps MUST follow the user story flow exactly
2. Use meaningful, descriptive step names
3. Reflect real application behavior
4. No random or placeholder steps
5. Support both Android and iOS flows when applicable
6. Include proper assertions/verifications
7. Consider positive, negative, and edge cases based on user request
8. Use realistic test data in examples

## Workspace Context
${contextInfo || "No additional context available. Generate general scenarios based on common patterns for the module."}

## Output Guidelines
- Format scenarios clearly with proper indentation
- Include comments explaining complex steps
- Add tags/annotations where appropriate for the framework
- Ensure scenarios are copy-paste ready for automation engineers`;

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate automation scenarios for: ${query}\n\nModule: ${appModule}\nFramework: ${framework}` },
        ],
        stream: true,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Stream the response back
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Scenario generator error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
