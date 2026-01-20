import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Framework-specific code templates and best practices
const FRAMEWORK_PROMPTS: Record<string, string> = {
  selenium_java: `Generate Selenium WebDriver automation code in Java with:
- Page Object Model structure
- TestNG annotations (@Test, @BeforeMethod, @AfterMethod)
- Proper WebDriverWait and explicit waits
- Meaningful method names following camelCase
- Comments explaining each step
- Assertions using TestNG Assert

Example structure:
public class LoginPage {
    private WebDriver driver;
    private WebDriverWait wait;
    
    // Locators
    @FindBy(id = "username")
    private WebElement usernameField;
    
    // Methods
    public void enterUsername(String username) {
        wait.until(ExpectedConditions.visibilityOf(usernameField));
        usernameField.sendKeys(username);
    }
}`,

  selenium_python: `Generate Selenium WebDriver automation code in Python with:
- Page Object Pattern
- pytest or unittest framework
- Explicit waits using WebDriverWait
- Snake_case naming convention
- Type hints where applicable
- Docstrings explaining methods

Example structure:
class LoginPage:
    def __init__(self, driver):
        self.driver = driver
        self.wait = WebDriverWait(driver, 10)
    
    # Locators
    USERNAME_FIELD = (By.ID, "username")
    
    def enter_username(self, username: str) -> None:
        """Enter username in the login field."""
        element = self.wait.until(EC.visibility_of_element_located(self.USERNAME_FIELD))
        element.send_keys(username)`,

  playwright_js: `Generate Playwright automation code in JavaScript with:
- Modern async/await syntax
- test.describe and test blocks
- Proper page object methods
- expect assertions from @playwright/test
- Meaningful test descriptions
- Proper cleanup in beforeEach/afterEach

Example structure:
const { test, expect } = require('@playwright/test');

test.describe('Login Feature', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
    });
    
    test('should login with valid credentials', async ({ page }) => {
        await page.fill('#username', 'testuser');
        await page.fill('#password', 'password123');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/dashboard');
    });
});`,

  playwright_ts: `Generate Playwright automation code in TypeScript with:
- Full type safety
- Modern async/await syntax
- test.describe and test blocks
- expect assertions with proper types
- Interface definitions for page objects
- Proper cleanup in beforeEach/afterEach

Example structure:
import { test, expect, Page } from '@playwright/test';

interface LoginCredentials {
    username: string;
    password: string;
}

class LoginPage {
    constructor(private page: Page) {}
    
    async login(credentials: LoginCredentials): Promise<void> {
        await this.page.fill('#username', credentials.username);
        await this.page.fill('#password', credentials.password);
        await this.page.click('button[type="submit"]');
    }
}`,

  cypress: `Generate Cypress automation code in JavaScript with:
- Modern Cypress commands
- describe and it blocks
- Custom commands where appropriate
- cy.intercept for API mocking if needed
- Proper assertions using should()
- beforeEach/afterEach hooks

Example structure:
describe('Login Feature', () => {
    beforeEach(() => {
        cy.visit('/login');
    });
    
    it('should login with valid credentials', () => {
        cy.get('#username').type('testuser');
        cy.get('#password').type('password123');
        cy.get('button[type="submit"]').click();
        cy.url().should('include', '/dashboard');
    });
});`,

  pytest: `Generate PyTest automation code in Python with:
- pytest fixtures for setup/teardown
- Parametrized tests where applicable
- Assert statements for validations
- Conftest.py patterns
- Proper test naming (test_*)
- Docstrings and type hints

Example structure:
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

class TestLogin:
    @pytest.fixture(autouse=True)
    def setup(self, driver):
        self.driver = driver
        self.wait = WebDriverWait(driver, 10)
        self.driver.get("/login")
    
    def test_login_with_valid_credentials(self):
        """Verify user can login with valid credentials."""
        self.enter_username("testuser")
        self.enter_password("password123")
        self.click_login_button()
        assert "/dashboard" in self.driver.current_url`,

  appium_java: `Generate Appium mobile automation code in Java with:
- Page Object Model for mobile
- AndroidDriver or IOSDriver setup
- MobileElement locators
- Touch actions for mobile gestures
- Proper waits for mobile elements
- TestNG annotations

Example structure:
public class LoginScreen {
    private AndroidDriver<MobileElement> driver;
    private WebDriverWait wait;
    
    @AndroidFindBy(id = "com.app:id/username")
    private MobileElement usernameField;
    
    public void enterUsername(String username) {
        wait.until(ExpectedConditions.visibilityOf(usernameField));
        usernameField.sendKeys(username);
    }
}`,

  appium_python: `Generate Appium mobile automation code in Python with:
- Page Object Pattern for mobile
- Appium Python Client
- Touch actions for gestures
- Explicit waits for mobile
- pytest integration
- Platform-specific locators

Example structure:
from appium.webdriver.common.mobileby import MobileBy
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

class LoginScreen:
    def __init__(self, driver):
        self.driver = driver
        self.wait = WebDriverWait(driver, 10)
    
    # Locators
    USERNAME_FIELD = (MobileBy.ID, "com.app:id/username")
    
    def enter_username(self, username: str) -> None:
        element = self.wait.until(EC.visibility_of_element_located(self.USERNAME_FIELD))
        element.send_keys(username)`,
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
    const { workspaceId, scenario, codeFramework, module: appModule, existingCode, action, context } = await req.json();

    console.log("Code generation request:", { workspaceId, codeFramework, appModule, action: action || 'generate' });

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
    const frameworkPrompt = FRAMEWORK_PROMPTS[codeFramework] || FRAMEWORK_PROMPTS.selenium_java;
    
    let contextInfo = "";
    if (context?.userStories) {
      contextInfo += `\n\n## User Stories Context:\n${context.userStories}`;
    }
    if (context?.hasApk) {
      contextInfo += "\n\n## Platform: Android app available";
    }
    if (context?.hasIpa) {
      contextInfo += "\n\n## Platform: iOS app available";
    }

    let userMessage = "";
    
    if (action && existingCode) {
      // User is asking for modification/explanation
      userMessage = `The user has this existing code:\n\n\`\`\`\n${existingCode}\n\`\`\`\n\nUser request: ${action}`;
    } else {
      // Initial code generation from scenario
      userMessage = `Convert this automation scenario into production-ready code:\n\n${scenario}\n\nModule: ${appModule}\nFramework: ${codeFramework}`;
    }

    const systemPrompt = `You are an expert Automation Engineer specializing in creating production-quality test automation code.

## Your Task
${action && existingCode 
  ? "Modify, refactor, or explain the provided automation code based on the user's request."
  : "Convert the provided automation scenario into clean, maintainable automation code."}

## Framework Guidelines
${frameworkPrompt}

## Code Quality Rules
1. Follow clean code principles
2. Use meaningful variable and method names
3. Add comments for complex logic
4. Include proper error handling
5. Follow the framework's best practices
6. Make code maintainable and reusable
7. Use proper assertions/validations
8. DO NOT include explanatory text - ONLY return the code
9. Use placeholders like "YOUR_VALUE" for data that should be configured
10. Ensure the code is copy-paste ready

## Workspace Context
${contextInfo || "No additional context."}

## Important
- Generate ONLY the code, no additional explanations
- Code should be complete and runnable
- Follow Page Object Model where applicable
- Include necessary imports at the top`;

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
          { role: "user", content: userMessage },
        ],
        stream: true,
        max_tokens: 6000,
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
    console.error("Code generator error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
