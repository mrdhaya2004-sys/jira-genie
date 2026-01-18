import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Platform-specific XPath generation guidance
const PLATFORM_PROMPTS: Record<string, string> = {
  android: `For Android elements, use these attributes:
- resource-id: Most reliable, use format //android.widget.Button[@resource-id='com.app:id/login_btn']
- content-desc: For accessibility, use //*[@content-desc='Login button']
- text: For visible text, use //android.widget.TextView[@text='Login']
- class: Widget types like android.widget.Button, android.widget.EditText, android.widget.TextView

Common Android XPath patterns:
- By resource-id: //*[@resource-id='com.app:id/elementId']
- By text: //*[@text='Button Text']
- By content-desc: //*[@content-desc='Accessibility label']
- Combined: //android.widget.Button[@text='Login' and @enabled='true']`,

  ios: `For iOS elements, use these attributes:
- name: Primary identifier, use //XCUIElementTypeButton[@name='Login']
- label: Accessibility label, use //*[@label='Login button']
- value: Current value for inputs, use //XCUIElementTypeTextField[@value='username']
- type: Element types like XCUIElementTypeButton, XCUIElementTypeTextField, XCUIElementTypeStaticText

Common iOS XPath patterns:
- By name: //XCUIElementTypeButton[@name='loginButton']
- By label: //*[@label='Login']
- By type and name: //XCUIElementTypeStaticText[@name='Welcome']
- Combined: //XCUIElementTypeButton[@name='Login' and @enabled='true']`,
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
    const { workspaceId, module: appModule, platform, query, context } = await req.json();

    console.log("XPath generation request:", { workspaceId, appModule, platform, query });

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
    const platformPrompt = PLATFORM_PROMPTS[platform] || PLATFORM_PROMPTS.android;
    
    let contextInfo = "";
    if (context?.userStories) {
      contextInfo += `\n\n## User Stories (Application Context):\n${context.userStories}`;
    }
    if (context?.hasApk) {
      contextInfo += "\n\n## Android App (APK) is available - use Android element types and attributes.";
    }
    if (context?.hasIpa) {
      contextInfo += "\n\n## iOS App (IPA) is available - use iOS element types and attributes.";
    }
    if (context?.appFiles?.length > 0) {
      contextInfo += `\n\n## Available App Files:\n${context.appFiles.map((f: any) => `- ${f.name} (${f.type})`).join("\n")}`;
    }

    const systemPrompt = `You are an expert Mobile Automation Engineer specializing in XPath generation for Appium-based test automation.

## Your Task
Generate ALL types of XPaths for elements in the "${appModule}" module on ${platform === 'android' ? 'Android' : 'iOS'}.

## Platform-Specific Guidelines
${platformPrompt}

## XPath Types to Generate
For each element requested, provide ALL of these XPath types:

### 1. Absolute XPath
Full path from root to element. Example:
\`\`\`xpath
/hierarchy/android.widget.FrameLayout/android.widget.LinearLayout/android.widget.Button[1]
\`\`\`

### 2. Relative XPath (⭐ Recommended)
Uses unique attributes for stable element location. This is usually the BEST choice.
\`\`\`xpath
//*[@resource-id='com.app:id/login_btn']
\`\`\`

### 3. Chained XPath
Combines multiple conditions for precision.
\`\`\`xpath
//android.widget.Button[@text='Login' and @enabled='true']
\`\`\`

### 4. Following XPath
Locates elements that appear after a reference element.
\`\`\`xpath
//android.widget.TextView[@text='Username']/following::android.widget.EditText[1]
\`\`\`

### 5. Following-Sibling XPath
Locates sibling elements after the current node.
\`\`\`xpath
//android.widget.TextView[@text='Password']/following-sibling::android.widget.EditText
\`\`\`

### 6. Preceding XPath
Locates elements before a reference element.
\`\`\`xpath
//android.widget.Button[@text='Submit']/preceding::android.widget.EditText[1]
\`\`\`

### 7. Preceding-Sibling XPath
Locates sibling elements before the current node.
\`\`\`xpath
//android.widget.Button[@text='Cancel']/preceding-sibling::android.widget.TextView
\`\`\`

## Output Format
For each element, format your response like this:

### Element: [Element Name]

**⭐ Recommended XPath:**
\`\`\`xpath
[most stable and reliable XPath]
\`\`\`
_Why: [Brief explanation of why this is recommended]_

**All XPath Options:**

| Type | XPath |
|------|-------|
| Absolute | \`[xpath]\` |
| Relative | \`[xpath]\` |
| Chained | \`[xpath]\` |
| Following | \`[xpath]\` |
| Following-Sibling | \`[xpath]\` |
| Preceding | \`[xpath]\` |
| Preceding-Sibling | \`[xpath]\` |

## Important Rules
1. XPaths must be stable and avoid dynamic attributes
2. Prefer relative XPaths with unique identifiers
3. Use meaningful attribute values from user stories
4. Ensure XPaths are automation-ready (copy-paste to code)
5. Avoid indices when possible (brittle)
6. Consider element visibility and enabled states
7. Use appropriate element types for the platform

## Workspace Context
${contextInfo || "No additional context available. Generate XPaths based on common UI patterns for the module."}`;

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
          { role: "user", content: `Generate XPaths for: ${query}\n\nModule: ${appModule}\nPlatform: ${platform}` },
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
    console.error("XPath generator error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
