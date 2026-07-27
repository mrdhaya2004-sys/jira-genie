// Sample project fixtures for TestZone Studio (UI-only IDE simulation).
// Each project ships as a virtual filesystem the editor renders.

export type FileNode =
  | { type: 'file'; name: string; path: string; language: string; content: string }
  | { type: 'dir'; name: string; path: string; children: FileNode[] };

export interface DetectedProject {
  id: string;
  name: string;
  projectType: string;
  language: string;
  framework: string;
  buildTool: string;
  testRunner: string;
  platform: string;
  packageManager: string;
  os: string;
  javaVersion?: string;
  sdkVersion?: string;
  patterns: string[];
  files: FileNode[];
  entryFile: string;
  missingComponents: MissingComponent[];
  healthScore: number;
  outdated: OutdatedDep[];
  vulnerabilities: number;
}

export interface MissingComponent {
  name: string;
  version: string;
  source: string;
  sizeMb: number;
  purpose: string;
  required: boolean;
}

export interface OutdatedDep {
  name: string;
  current: string;
  latest: string;
  severity: 'low' | 'medium' | 'high';
}

const pomXml = `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.testzone.qa</groupId>
  <artifactId>selenium-regression</artifactId>
  <version>1.0.0</version>

  <properties>
    <java.version>21</java.version>
    <selenium.version>4.24.0</selenium.version>
    <testng.version>7.10.2</testng.version>
    <cucumber.version>7.18.1</cucumber.version>
  </properties>

  <dependencies>
    <dependency>
      <groupId>org.seleniumhq.selenium</groupId>
      <artifactId>selenium-java</artifactId>
      <version>\${selenium.version}</version>
    </dependency>
    <dependency>
      <groupId>org.testng</groupId>
      <artifactId>testng</artifactId>
      <version>\${testng.version}</version>
    </dependency>
    <dependency>
      <groupId>io.cucumber</groupId>
      <artifactId>cucumber-java</artifactId>
      <version>\${cucumber.version}</version>
    </dependency>
    <dependency>
      <groupId>io.github.bonigarcia</groupId>
      <artifactId>webdrivermanager</artifactId>
      <version>5.9.2</version>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <artifactId>maven-surefire-plugin</artifactId>
        <version>3.5.0</version>
        <configuration>
          <suiteXmlFiles><suiteXmlFile>testng.xml</suiteXmlFile></suiteXmlFiles>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project>`;

const loginTest = `package com.testzone.tests;

import io.github.bonigarcia.wdm.WebDriverManager;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.testng.Assert;
import org.testng.annotations.*;

public class LoginTest {
    private WebDriver driver;

    @BeforeClass
    public void setup() {
        WebDriverManager.chromedriver().setup();
        driver = new ChromeDriver();
    }

    @Test(description = "Valid user can sign in")
    public void validLogin() {
        driver.get("https://app.testzone.ai/login");
        driver.findElement(By.id("email")).sendKeys("qa@testzone.ai");
        driver.findElement(By.id("password")).sendKeys("Sup3rSecret!");
        driver.findElement(By.cssSelector("button[type='submit']")).click();
        Assert.assertTrue(driver.getCurrentUrl().contains("/dashboard"));
    }

    @Test(description = "Invalid credentials show error")
    public void invalidLogin() {
        driver.get("https://app.testzone.ai/login");
        driver.findElement(By.id("email")).sendKeys("bad@user.com");
        driver.findElement(By.id("password")).sendKeys("wrong");
        driver.findElement(By.cssSelector("button[type='submit']")).click();
        Assert.assertTrue(driver.findElement(By.className("error")).isDisplayed());
    }

    @AfterClass
    public void teardown() { if (driver != null) driver.quit(); }
}`;

const feature = `Feature: Checkout flow

  Background:
    Given the user is signed in as "qa@testzone.ai"

  @smoke @regression
  Scenario: Single item checkout
    Given the cart contains "Wireless Headphones"
    When the user completes checkout with card ending "4242"
    Then an order confirmation is displayed
    And the order appears in "My Orders"

  @regression
  Scenario Outline: Discount codes
    Given the cart total is <total>
    When the user applies code "<code>"
    Then the discounted total is <expected>

    Examples:
      | total | code    | expected |
      | 100   | SAVE10  | 90       |
      | 200   | HALF    | 100      |`;

const testngXml = `<!DOCTYPE suite SYSTEM "https://testng.org/testng-1.0.dtd">
<suite name="Regression" parallel="classes" thread-count="4">
  <test name="Auth">
    <classes>
      <class name="com.testzone.tests.LoginTest"/>
    </classes>
  </test>
</suite>`;

const packageJson = `{
  "name": "testzone-playwright-e2e",
  "version": "1.0.0",
  "scripts": {
    "test": "playwright test",
    "test:headed": "playwright test --headed",
    "report": "playwright show-report"
  },
  "devDependencies": {
    "@playwright/test": "^1.47.0",
    "typescript": "^5.5.4"
  }
}`;

const playwrightSpec = `import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test('valid credentials redirect to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('qa@testzone.ai');
    await page.getByLabel('Password').fill('Sup3rSecret!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\\/dashboard/);
  });

  test('invalid credentials show inline error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('bad@user.com');
    await page.getByLabel('Password').fill('wrong');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toContainText('Invalid');
  });
});`;

const gradleBuild = `plugins {
    id 'java'
    id 'com.android.application' version '8.5.0' apply false
}

android {
    namespace 'com.testzone.mobile'
    compileSdk 34
    defaultConfig {
        applicationId "com.testzone.mobile"
        minSdk 24
        targetSdk 34
    }
}

dependencies {
    testImplementation 'io.appium:java-client:9.3.0'
    testImplementation 'org.testng:testng:7.10.2'
    testImplementation 'org.seleniumhq.selenium:selenium-java:4.24.0'
}`;

const appiumTest = `package com.testzone.mobile;

import io.appium.java_client.AppiumDriver;
import io.appium.java_client.android.AndroidDriver;
import io.appium.java_client.android.options.UiAutomator2Options;
import org.openqa.selenium.By;
import org.testng.Assert;
import org.testng.annotations.*;

import java.net.URL;

public class MobileLoginTest {
    private AppiumDriver driver;

    @BeforeClass
    public void setup() throws Exception {
        UiAutomator2Options opts = new UiAutomator2Options()
            .setDeviceName("Pixel_7_API_34")
            .setApp("/apps/testzone.apk");
        driver = new AndroidDriver(new URL("http://127.0.0.1:4723"), opts);
    }

    @Test
    public void loginSucceeds() {
        driver.findElement(By.id("com.testzone:id/email")).sendKeys("qa@testzone.ai");
        driver.findElement(By.id("com.testzone:id/password")).sendKeys("Sup3rSecret!");
        driver.findElement(By.id("com.testzone:id/signIn")).click();
        Assert.assertTrue(driver.findElement(By.id("com.testzone:id/dashboard")).isDisplayed());
    }

    @AfterClass
    public void teardown() { if (driver != null) driver.quit(); }
}`;

export const SAMPLE_PROJECTS: DetectedProject[] = [
  {
    id: 'selenium-maven',
    name: 'selenium-regression',
    projectType: 'Maven',
    language: 'Java',
    framework: 'Selenium + TestNG + Cucumber',
    buildTool: 'Maven 3.9.9',
    testRunner: 'TestNG + Cucumber',
    platform: 'Web',
    packageManager: 'Maven',
    os: 'Cross-platform',
    javaVersion: 'Java 21',
    sdkVersion: '—',
    patterns: ['POM Framework', 'BDD', 'Data Driven'],
    entryFile: 'src/test/java/com/testzone/tests/LoginTest.java',
    healthScore: 82,
    vulnerabilities: 1,
    outdated: [
      { name: 'selenium-java', current: '4.24.0', latest: '4.25.0', severity: 'low' },
      { name: 'cucumber-java', current: '7.18.1', latest: '7.20.1', severity: 'medium' },
    ],
    missingComponents: [
      { name: 'Java', version: '21.0.4 LTS', source: 'Adoptium Temurin', sizeMb: 190, purpose: 'Compile & run test suite', required: true },
      { name: 'Maven', version: '3.9.9', source: 'Apache', sizeMb: 9, purpose: 'Build lifecycle & dependency resolution', required: true },
      { name: 'ChromeDriver', version: '129.0.6668.58', source: 'Chrome for Testing', sizeMb: 12, purpose: 'Drive Chrome browser', required: true },
      { name: 'WebDriverManager', version: '5.9.2', source: 'Maven Central', sizeMb: 2, purpose: 'Auto-resolve driver binaries', required: false },
    ],
    files: [
      { type: 'file', name: 'pom.xml', path: 'pom.xml', language: 'xml', content: pomXml },
      { type: 'file', name: 'testng.xml', path: 'testng.xml', language: 'xml', content: testngXml },
      { type: 'dir', name: 'src', path: 'src', children: [
        { type: 'dir', name: 'test', path: 'src/test', children: [
          { type: 'dir', name: 'java', path: 'src/test/java', children: [
            { type: 'dir', name: 'com', path: 'src/test/java/com', children: [
              { type: 'dir', name: 'testzone', path: 'src/test/java/com/testzone', children: [
                { type: 'dir', name: 'tests', path: 'src/test/java/com/testzone/tests', children: [
                  { type: 'file', name: 'LoginTest.java', path: 'src/test/java/com/testzone/tests/LoginTest.java', language: 'java', content: loginTest },
                ]},
              ]},
            ]},
          ]},
          { type: 'dir', name: 'resources', path: 'src/test/resources', children: [
            { type: 'dir', name: 'features', path: 'src/test/resources/features', children: [
              { type: 'file', name: 'checkout.feature', path: 'src/test/resources/features/checkout.feature', language: 'gherkin', content: feature },
            ]},
          ]},
        ]},
      ]},
      { type: 'file', name: 'README.md', path: 'README.md', language: 'markdown', content: '# Selenium Regression\n\nRun: `mvn test -Dsuite=Regression`' },
    ],
  },
  {
    id: 'playwright-ts',
    name: 'testzone-playwright-e2e',
    projectType: 'Node.js',
    language: 'TypeScript',
    framework: 'Playwright',
    buildTool: 'npm',
    testRunner: '@playwright/test',
    platform: 'Web',
    packageManager: 'npm 10',
    os: 'Cross-platform',
    javaVersion: '—',
    sdkVersion: 'Node.js 20',
    patterns: ['POM Framework', 'Data Driven'],
    entryFile: 'tests/login.spec.ts',
    healthScore: 94,
    vulnerabilities: 0,
    outdated: [{ name: '@playwright/test', current: '1.47.0', latest: '1.49.0', severity: 'low' }],
    missingComponents: [
      { name: 'Node.js', version: '20.17.0 LTS', source: 'nodejs.org', sizeMb: 32, purpose: 'JavaScript runtime', required: true },
      { name: 'npm', version: '10.8.2', source: 'bundled with Node', sizeMb: 0, purpose: 'Package manager', required: true },
      { name: 'Playwright browsers', version: '1.47.0', source: 'Microsoft CDN', sizeMb: 340, purpose: 'Chromium + Firefox + WebKit binaries', required: true },
    ],
    files: [
      { type: 'file', name: 'package.json', path: 'package.json', language: 'json', content: packageJson },
      { type: 'file', name: 'playwright.config.ts', path: 'playwright.config.ts', language: 'typescript', content: `import { defineConfig } from '@playwright/test';\nexport default defineConfig({\n  testDir: './tests',\n  use: { baseURL: 'https://app.testzone.ai', trace: 'on-first-retry' },\n});` },
      { type: 'dir', name: 'tests', path: 'tests', children: [
        { type: 'file', name: 'login.spec.ts', path: 'tests/login.spec.ts', language: 'typescript', content: playwrightSpec },
      ]},
    ],
  },
  {
    id: 'appium-gradle',
    name: 'testzone-mobile-appium',
    projectType: 'Gradle',
    language: 'Java',
    framework: 'Appium + TestNG',
    buildTool: 'Gradle 8.7',
    testRunner: 'TestNG',
    platform: 'Mobile (Android + iOS)',
    packageManager: 'Gradle',
    os: 'macOS / Linux',
    javaVersion: 'Java 17',
    sdkVersion: 'Android SDK 34',
    patterns: ['POM Framework', 'Hybrid Framework'],
    entryFile: 'src/test/java/com/testzone/mobile/MobileLoginTest.java',
    healthScore: 71,
    vulnerabilities: 2,
    outdated: [
      { name: 'appium-java-client', current: '9.3.0', latest: '9.4.0', severity: 'medium' },
      { name: 'selenium-java', current: '4.24.0', latest: '4.25.0', severity: 'low' },
    ],
    missingComponents: [
      { name: 'Java', version: '17.0.12 LTS', source: 'Adoptium Temurin', sizeMb: 180, purpose: 'Compile & run test suite', required: true },
      { name: 'Android SDK', version: 'API 34', source: 'Google', sizeMb: 1200, purpose: 'Build & drive Android emulator', required: true },
      { name: 'Appium Server', version: '2.11.4', source: 'npm', sizeMb: 45, purpose: 'Mobile automation server', required: true },
      { name: 'Appium UiAutomator2 Driver', version: '3.7.5', source: 'appium driver install', sizeMb: 18, purpose: 'Android driver', required: true },
      { name: 'Xcode Command Line Tools', version: '15.4', source: 'Apple', sizeMb: 700, purpose: 'iOS builds (macOS only)', required: false },
      { name: 'CocoaPods', version: '1.15.2', source: 'RubyGems', sizeMb: 6, purpose: 'iOS dependency management', required: false },
    ],
    files: [
      { type: 'file', name: 'build.gradle', path: 'build.gradle', language: 'groovy', content: gradleBuild },
      { type: 'file', name: 'settings.gradle', path: 'settings.gradle', language: 'groovy', content: `rootProject.name = 'testzone-mobile-appium'` },
      { type: 'dir', name: 'src', path: 'src', children: [
        { type: 'dir', name: 'test', path: 'src/test', children: [
          { type: 'dir', name: 'java', path: 'src/test/java', children: [
            { type: 'dir', name: 'com', path: 'src/test/java/com', children: [
              { type: 'dir', name: 'testzone', path: 'src/test/java/com/testzone', children: [
                { type: 'dir', name: 'mobile', path: 'src/test/java/com/testzone/mobile', children: [
                  { type: 'file', name: 'MobileLoginTest.java', path: 'src/test/java/com/testzone/mobile/MobileLoginTest.java', language: 'java', content: appiumTest },
                ]},
              ]},
            ]},
          ]},
        ]},
      ]},
    ],
  },
];

export function flattenFiles(nodes: FileNode[]): Extract<FileNode, { type: 'file' }>[] {
  const out: Extract<FileNode, { type: 'file' }>[] = [];
  const walk = (arr: FileNode[]) => arr.forEach(n => n.type === 'file' ? out.push(n) : walk(n.children));
  walk(nodes);
  return out;
}
