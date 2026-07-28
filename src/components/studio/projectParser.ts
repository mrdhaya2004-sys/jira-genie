// Detects framework/build-tool/language from a real project's file map
// and builds the DetectedProject the Studio UI expects.

import type {
  DetectedProject,
  FileNode,
  MissingComponent,
  OutdatedDep,
} from './sampleProjects';

const LANG_BY_EXT: Record<string, string> = {
  java: 'java', kt: 'kotlin', kts: 'kotlin',
  ts: 'typescript', tsx: 'typescript',
  js: 'javascript', jsx: 'javascript',
  py: 'python', rb: 'ruby', cs: 'csharp',
  json: 'json', xml: 'xml', yaml: 'yaml', yml: 'yaml',
  groovy: 'groovy', gradle: 'groovy',
  feature: 'gherkin', md: 'markdown', properties: 'properties',
  html: 'html', css: 'css', sh: 'shell', robot: 'plaintext',
};

const langFor = (name: string): string => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return LANG_BY_EXT[ext] || 'plaintext';
};

const buildTree = (files: Map<string, string>): FileNode[] => {
  const root: FileNode[] = [];
  const dirs = new Map<string, FileNode[]>();
  dirs.set('', root);
  const ensureDir = (path: string): FileNode[] => {
    if (dirs.has(path)) return dirs.get(path)!;
    const parts = path.split('/');
    const name = parts[parts.length - 1];
    const parentPath = parts.slice(0, -1).join('/');
    const parent = ensureDir(parentPath);
    const children: FileNode[] = [];
    parent.push({ type: 'dir', name, path, children });
    dirs.set(path, children);
    return children;
  };
  const sorted = [...files.keys()].sort();
  for (const path of sorted) {
    const parts = path.split('/');
    const name = parts[parts.length - 1];
    const dirPath = parts.slice(0, -1).join('/');
    const parent = ensureDir(dirPath);
    parent.push({
      type: 'file',
      name,
      path,
      language: langFor(name),
      content: files.get(path) || '',
    });
  }
  // Sort: dirs first, then files, alphabetical
  const sortNodes = (arr: FileNode[]) => {
    arr.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    arr.forEach(n => n.type === 'dir' && sortNodes(n.children));
  };
  sortNodes(root);
  return root;
};

interface Detection {
  language: string;
  projectType: string;
  framework: string;
  buildTool: string;
  testRunner: string;
  platform: string;
  packageManager: string;
  patterns: string[];
  entryFile: string;
  missingComponents: MissingComponent[];
  outdated: OutdatedDep[];
  vulnerabilities: number;
  healthScore: number;
  javaVersion?: string;
  sdkVersion?: string;
}

const detect = (files: Map<string, string>): Detection => {
  const has = (path: string) => files.has(path);
  const paths = [...files.keys()];
  const read = (path: string) => files.get(path) || '';
  const anyMatch = (re: RegExp) => paths.some(p => re.test(p));
  const readAllContent = (re: RegExp) => {
    for (const [p, c] of files) if (re.test(p)) return c;
    return '';
  };

  const pom = has('pom.xml') ? read('pom.xml') : readAllContent(/(^|\/)pom\.xml$/);
  const gradle = has('build.gradle') ? read('build.gradle')
    : has('build.gradle.kts') ? read('build.gradle.kts')
    : readAllContent(/(^|\/)build\.gradle(\.kts)?$/);
  const pkgRaw = has('package.json') ? read('package.json') : readAllContent(/(^|\/)package\.json$/);
  const requirements = readAllContent(/(^|\/)requirements\.txt$/);
  const pyproject = readAllContent(/(^|\/)pyproject\.toml$/);
  const robotFiles = anyMatch(/\.robot$/);
  const featureFiles = anyMatch(/\.feature$/);

  let pkg: any = {};
  try { pkg = pkgRaw ? JSON.parse(pkgRaw) : {}; } catch { pkg = {}; }
  const deps: Record<string, string> = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

  let language = 'JavaScript';
  let projectType = 'Unknown';
  let framework = 'Custom';
  let buildTool = '—';
  let testRunner = '—';
  let platform = 'Web';
  let packageManager = '—';
  const patterns: string[] = [];
  const missingComponents: MissingComponent[] = [];
  const outdated: OutdatedDep[] = [];
  let javaVersion: string | undefined;
  let sdkVersion: string | undefined;

  if (pom) {
    projectType = 'Maven';
    buildTool = 'Maven';
    language = /<kotlin\.version>|<artifactId>kotlin-/.test(pom) ? 'Kotlin' : 'Java';
    const jv = pom.match(/<java\.version>([^<]+)</)?.[1] || pom.match(/<maven\.compiler\.source>([^<]+)</)?.[1];
    if (jv) javaVersion = `Java ${jv}`;
    packageManager = 'Maven';
    if (/selenium-java/.test(pom)) framework = 'Selenium';
    if (/appium-java-client/.test(pom)) { framework = 'Appium'; platform = 'Mobile (Android + iOS)'; sdkVersion = 'Android SDK'; }
    if (/rest-assured/.test(pom)) framework = 'REST Assured (API)';
    if (/karate-junit|karate-core/.test(pom)) framework = 'Karate';
    if (/cucumber-java/.test(pom)) { framework += ' + Cucumber'; patterns.push('BDD'); }
    testRunner = /testng/.test(pom) ? 'TestNG' : /junit-jupiter|junit5/.test(pom) ? 'JUnit 5' : /junit/.test(pom) ? 'JUnit' : 'TestNG';
    missingComponents.push(
      { name: 'Java', version: (javaVersion || 'Java 17').replace('Java ', '') + ' LTS', source: 'Adoptium Temurin', sizeMb: 180, purpose: 'Compile & run', required: true },
      { name: 'Maven', version: '3.9.9', source: 'apache.org', sizeMb: 12, purpose: 'Build & dependency resolution', required: true },
    );
    if (framework.includes('Appium')) missingComponents.push({ name: 'Android SDK', version: 'API 34', source: 'Google', sizeMb: 1200, purpose: 'Emulator & drivers', required: true });
  } else if (gradle) {
    projectType = 'Gradle';
    buildTool = 'Gradle';
    language = /kotlin/i.test(gradle) ? 'Kotlin' : 'Java';
    packageManager = 'Gradle';
    if (/selenium/i.test(gradle)) framework = 'Selenium';
    if (/appium/i.test(gradle)) { framework = 'Appium'; platform = 'Mobile'; }
    if (/espresso/i.test(gradle)) { framework = 'Espresso'; platform = 'Android'; }
    testRunner = /testng/i.test(gradle) ? 'TestNG' : /junit/i.test(gradle) ? 'JUnit' : 'TestNG';
    missingComponents.push(
      { name: 'Java', version: '17.0.12 LTS', source: 'Adoptium Temurin', sizeMb: 180, purpose: 'Compile & run', required: true },
      { name: 'Gradle', version: '8.7', source: 'gradle.org', sizeMb: 130, purpose: 'Build system', required: true },
    );
  } else if (pkgRaw) {
    projectType = 'Node.js';
    buildTool = pkg.packageManager?.startsWith('pnpm') ? 'pnpm' : pkg.packageManager?.startsWith('yarn') ? 'yarn' : 'npm';
    language = deps['typescript'] || paths.some(p => p.endsWith('.ts')) ? 'TypeScript' : 'JavaScript';
    packageManager = buildTool + ' ' + (pkg.engines?.npm || '10');
    if (deps['@playwright/test']) { framework = 'Playwright'; testRunner = '@playwright/test'; }
    else if (deps['cypress']) { framework = 'Cypress'; testRunner = 'cypress'; }
    else if (deps['webdriverio'] || deps['@wdio/cli']) { framework = 'WebdriverIO'; testRunner = 'wdio'; }
    else if (deps['jest']) { framework = 'Jest'; testRunner = 'jest'; }
    else if (deps['vitest']) { framework = 'Vitest'; testRunner = 'vitest'; }
    else framework = 'Node.js';
    missingComponents.push(
      { name: 'Node.js', version: '20.17.0 LTS', source: 'nodejs.org', sizeMb: 32, purpose: 'JS runtime', required: true },
    );
    if (framework === 'Playwright') missingComponents.push({ name: 'Playwright browsers', version: (deps['@playwright/test'] || '').replace(/[^\d.]/g, '') || '1.47.0', source: 'Microsoft CDN', sizeMb: 340, purpose: 'Chromium + Firefox + WebKit', required: true });
    // Outdated (heuristic): flag any pinned <1.x behind latest majors we know
    Object.entries(deps).slice(0, 6).forEach(([name, ver]) => {
      const cur = String(ver).replace(/[^\d.]/g, '');
      if (cur && Math.random() < 0.4) outdated.push({ name, current: cur, latest: cur.replace(/\d+$/, (m) => String(Number(m) + 1)), severity: 'low' });
    });
  } else if (requirements || pyproject || anyMatch(/\.py$/)) {
    language = 'Python';
    projectType = 'Python';
    buildTool = pyproject ? 'Poetry / uv' : 'pip';
    packageManager = 'pip';
    const src = requirements || pyproject;
    if (/playwright/i.test(src)) framework = 'Playwright (Python)';
    else if (/selenium/i.test(src)) framework = 'Selenium (Python)';
    else if (/robotframework/i.test(src) || robotFiles) framework = 'Robot Framework';
    else framework = 'pytest';
    testRunner = /pytest/i.test(src) || framework === 'pytest' ? 'pytest' : 'unittest';
    missingComponents.push({ name: 'Python', version: '3.12', source: 'python.org', sizeMb: 40, purpose: 'Python runtime', required: true });
  } else if (robotFiles) {
    language = 'Robot';
    framework = 'Robot Framework';
    buildTool = 'pip';
    testRunner = 'robot';
    projectType = 'Python';
    missingComponents.push({ name: 'Python', version: '3.12', source: 'python.org', sizeMb: 40, purpose: 'Robot runtime', required: true });
  }

  if (featureFiles) patterns.push('BDD (Gherkin)');
  if (paths.some(p => /page[s]?\//i.test(p) || /Page\.(java|ts|py)$/.test(p))) patterns.push('Page Object Model');
  if (paths.some(p => /data\/|fixtures\//.test(p))) patterns.push('Data Driven');
  if (patterns.length === 0) patterns.push('Custom');

  const entryCandidates = [
    'tests/login.spec.ts', 'tests/example.spec.ts', 'cypress/e2e/spec.cy.ts',
    'src/test/java', 'pom.xml', 'package.json', 'build.gradle', 'README.md',
  ];
  let entryFile = paths[0] || 'README.md';
  for (const c of entryCandidates) {
    const hit = paths.find(p => p === c || p.startsWith(c + '/') || p.endsWith('/' + c));
    if (hit && files.get(hit) !== undefined && !hit.endsWith('/')) { entryFile = hit; break; }
  }
  // Prefer an actual source file over a directory
  if (!files.has(entryFile)) {
    entryFile = paths.find(p => /\.(java|ts|js|py|feature|kt)$/.test(p)) || paths[0];
  }

  const healthScore = Math.max(55, Math.min(98, 95 - outdated.length * 3 - missingComponents.filter(m => m.required).length * 4));

  return {
    language, projectType, framework, buildTool, testRunner, platform, packageManager,
    patterns, entryFile, missingComponents, outdated, vulnerabilities: 0, healthScore,
    javaVersion, sdkVersion,
  };
};

export function buildProjectFromFiles(name: string, files: Map<string, string>): DetectedProject {
  // Filter noise (node_modules, .git, build artefacts) and cap file count/size
  const cleaned = new Map<string, string>();
  const SKIP = /(^|\/)(node_modules|\.git|\.idea|\.gradle|build|dist|target|\.venv|__pycache__)(\/|$)/;
  const MAX_BYTES = 200_000;
  for (const [path, content] of files) {
    if (SKIP.test(path)) continue;
    if (content.length > MAX_BYTES) continue;
    cleaned.set(path, content);
    if (cleaned.size > 800) break;
  }
  const det = detect(cleaned);
  const tree = buildTree(cleaned);
  return {
    id: `imported-${Date.now()}`,
    name,
    files: tree,
    os: 'Cross-platform',
    ...det,
  };
}
