import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Editor, { type Monaco } from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuRadioGroup, DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import {
  FolderOpen, Play, Bug, Package, Terminal as TermIcon, Sparkles, X,
  CheckCircle2, XCircle, MinusCircle, Clock, Boxes, Cpu, Layers,
  Wrench, Rocket, ChevronRight, ScanSearch, Server, Palette, Check,
  PanelRightClose, PanelRightOpen,
} from 'lucide-react';
import SmartBackButton from '@/components/common/SmartBackButton';
import { Splitter, usePersistedSize, usePersistedFlag } from '@/components/common/SplitPane';
import Tree from './StudioFileTree';
import StudioConsole, { type ConsoleLine, type LogTab, type LogLevel } from './StudioConsole';
import StudioImportDialog from './StudioImportDialog';
import StudioInstallerDialog from './StudioInstallerDialog';
import StudioAIPanel, { type FailureAnalysis } from './StudioAIPanel';
import { SAMPLE_PROJECTS, flattenFiles, type DetectedProject, type FileNode } from './sampleProjects';
import { cn } from '@/lib/utils';


const monacoLang = (lang: string) => ({
  java: 'java', kotlin: 'kotlin', kt: 'kotlin',
  typescript: 'typescript', ts: 'typescript',
  javascript: 'javascript', js: 'javascript',
  json: 'json', xml: 'xml', yaml: 'yaml', yml: 'yaml',
  groovy: 'groovy', gherkin: 'plaintext', feature: 'plaintext',
  markdown: 'markdown', md: 'markdown', properties: 'ini',
}[lang.toLowerCase()] || 'plaintext');

interface TestResult {
  id: string;
  name: string;
  file: string;
  status: 'pass' | 'fail' | 'skip';
  durationMs: number;
  stack?: string;
}

const nowStamp = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}.${String(d.getMilliseconds()).padStart(3, '0')}`;
};

export type StudioTheme =
  | 'testzone-light'
  | 'testzone-dark'
  | 'intellij-light'
  | 'vscode-dark'
  | 'solarized-light'
  | 'high-contrast';

const THEME_OPTIONS: { id: StudioTheme; label: string; hint: string; monaco: string }[] = [
  { id: 'testzone-light',  label: 'TestZone Light',   hint: 'Default · iOS 26 Glass', monaco: 'tz-light' },
  { id: 'testzone-dark',   label: 'TestZone Dark',    hint: 'Deep aurora',            monaco: 'tz-dark' },
  { id: 'intellij-light',  label: 'IntelliJ Light',   hint: 'Warm neutrals',          monaco: 'tz-intellij' },
  { id: 'vscode-dark',     label: 'VS Code Dark',     hint: 'Classic dark',           monaco: 'vs-dark' },
  { id: 'solarized-light', label: 'Solarized Light',  hint: 'Base3 palette',          monaco: 'tz-solarized' },
  { id: 'high-contrast',   label: 'High Contrast',    hint: 'WCAG AAA',               monaco: 'hc-light' },
];

const isDarkTheme = (t: StudioTheme) => t === 'testzone-dark' || t === 'vscode-dark';

const defineMonacoThemes = (monaco: Monaco) => {
  // TestZone Light — premium IntelliJ-inspired
  monaco.editor.defineTheme('tz-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: '',                foreground: '1F2937' },
      { token: 'comment',         foreground: '94A3B8', fontStyle: 'italic' },
      { token: 'keyword',         foreground: '2563EB', fontStyle: 'bold' },
      { token: 'keyword.control', foreground: '2563EB', fontStyle: 'bold' },
      { token: 'storage',         foreground: '2563EB' },
      { token: 'storage.type',    foreground: '2563EB' },
      { token: 'type',            foreground: '7C3AED' },
      { token: 'type.identifier', foreground: '7C3AED' },
      { token: 'class',           foreground: '7C3AED', fontStyle: 'bold' },
      { token: 'entity.name.class', foreground: '7C3AED' },
      { token: 'entity.name.function', foreground: '059669' },
      { token: 'function',        foreground: '059669' },
      { token: 'method',          foreground: '059669' },
      { token: 'identifier',      foreground: '1F2937' },
      { token: 'variable',        foreground: '1F2937' },
      { token: 'variable.parameter', foreground: '1F2937' },
      { token: 'annotation',      foreground: 'DB2777' },
      { token: 'meta.annotation', foreground: 'DB2777' },
      { token: 'string',          foreground: 'EA580C' },
      { token: 'string.escape',   foreground: 'EA580C', fontStyle: 'bold' },
      { token: 'number',          foreground: '2563EB' },
      { token: 'number.hex',      foreground: '2563EB' },
      { token: 'constant',        foreground: '2563EB' },
      { token: 'constant.language', foreground: '2563EB' },
      { token: 'tag',             foreground: '2563EB' },
      { token: 'tag.xml',         foreground: '2563EB' },
      { token: 'attribute.name',  foreground: '7C3AED' },
      { token: 'attribute.value', foreground: 'EA580C' },
      { token: 'delimiter',       foreground: '475569' },
      { token: 'operator',        foreground: '475569' },
      // JSON
      { token: 'string.key.json',   foreground: '7C3AED' },
      { token: 'string.value.json', foreground: 'EA580C' },
      { token: 'number.json',       foreground: '2563EB' },
    ],
    colors: {
      'editor.background':          '#FFFFFF',
      'editor.foreground':          '#1F2937',
      'editor.lineHighlightBackground': '#F8FAFC',
      'editor.lineHighlightBorder': '#00000000',
      'editorLineNumber.foreground':'#94A3B8',
      'editorLineNumber.activeForeground': '#2563EB',
      'editorCursor.foreground':    '#2563EB',
      'editor.selectionBackground': '#DBEAFE',
      'editor.inactiveSelectionBackground': '#E0ECFE',
      'editor.wordHighlightBackground': '#DBEAFE80',
      'editor.findMatchBackground': '#FDE68A',
      'editorBracketMatch.background': '#DBEAFE',
      'editorBracketMatch.border':    '#2563EB',
      'editorIndentGuide.background': '#E2E8F0',
      'editorIndentGuide.activeBackground': '#CBD5E1',
      'editorGutter.background':    '#FFFFFF',
      'editorWhitespace.foreground':'#E2E8F0',
      'scrollbarSlider.background': '#2563EB26',
      'scrollbarSlider.hoverBackground': '#2563EB40',
      'scrollbarSlider.activeBackground':'#2563EB66',
      'editorWidget.background':    '#FFFFFF',
      'editorWidget.border':        '#E2E8F0',
      'editorSuggestWidget.background': '#FFFFFF',
      'editorSuggestWidget.selectedBackground': '#DBEAFE',
    },
  });

  // TestZone Dark
  monaco.editor.defineTheme('tz-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '60A5FA' },
      { token: 'type',    foreground: 'C4B5FD' },
      { token: 'string',  foreground: 'FDBA74' },
      { token: 'number',  foreground: '60A5FA' },
      { token: 'comment', foreground: '64748B', fontStyle: 'italic' },
      { token: 'function',foreground: '34D399' },
    ],
    colors: {
      'editor.background': '#0B1226',
      'editor.foreground': '#E2E8F0',
      'editor.lineHighlightBackground': '#1E293B',
      'editorCursor.foreground': '#60A5FA',
    },
  });

  // IntelliJ Light (warm)
  monaco.editor.defineTheme('tz-intellij', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '000080', fontStyle: 'bold' },
      { token: 'string',  foreground: '008000' },
      { token: 'number',  foreground: '0000FF' },
      { token: 'comment', foreground: '808080', fontStyle: 'italic' },
      { token: 'type',    foreground: '000000', fontStyle: 'bold' },
      { token: 'annotation', foreground: 'BBB529' },
    ],
    colors: {
      'editor.background': '#FFFFFF',
      'editor.foreground': '#000000',
      'editor.lineHighlightBackground': '#FFFFCC',
      'editor.selectionBackground': '#A6D2FF',
    },
  });

  // Solarized Light
  monaco.editor.defineTheme('tz-solarized', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: '',        foreground: '657B83' },
      { token: 'keyword', foreground: '859900' },
      { token: 'string',  foreground: '2AA198' },
      { token: 'number',  foreground: 'D33682' },
      { token: 'comment', foreground: '93A1A1', fontStyle: 'italic' },
      { token: 'type',    foreground: 'B58900' },
      { token: 'function',foreground: '268BD2' },
    ],
    colors: {
      'editor.background': '#FDF6E3',
      'editor.foreground': '#657B83',
      'editor.lineHighlightBackground': '#EEE8D5',
      'editor.selectionBackground': '#EEE8D5',
      'editorCursor.foreground': '#268BD2',
    },
  });
};

const THEME_STORAGE_KEY = 'tz-studio-theme';

const StudioModule: React.FC = () => {
  const [project, setProject] = useState<DetectedProject | null>(null);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [activePath, setActivePath] = useState<string>('');
  const [importOpen, setImportOpen] = useState(true);
  const [installerOpen, setInstallerOpen] = useState(false);
  const [installed, setInstalled] = useState<Set<string>>(new Set());
  const [lines, setLines] = useState<ConsoleLine[]>([]);
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [failure, setFailure] = useState<FailureAnalysis | null>(null);
  const [rightTab, setRightTab] = useState<'ai' | 'results'>('ai');
  const [theme, setThemeState] = useState<StudioTheme>(() => {
    if (typeof window === 'undefined') return 'testzone-light';
    return (localStorage.getItem(THEME_STORAGE_KEY) as StudioTheme) || 'testzone-light';
  });
  const lineId = useRef(0);
  const monacoRef = useRef<Monaco | null>(null);

  const setTheme = (t: StudioTheme) => {
    setThemeState(t);
    try { localStorage.setItem(THEME_STORAGE_KEY, t); } catch { /* noop */ }
  };

  const themeMeta = THEME_OPTIONS.find(t => t.id === theme) || THEME_OPTIONS[0];
  const dark = isDarkTheme(theme);

  const filesByPath = useMemo(() => {
    const map = new Map<string, Extract<FileNode, { type: 'file' }>>();
    if (project) flattenFiles(project.files).forEach(f => map.set(f.path, f));
    return map;
  }, [project]);

  const log = useCallback((tab: LogTab, level: LogLevel, module: string, text: string, durationMs?: number) => {
    setLines(prev => [...prev, { id: `l${++lineId.current}`, tab, level, module, text, time: nowStamp(), durationMs }]);
  }, []);

  const clearTab = useCallback((tab: LogTab) => {
    setLines(prev => prev.filter(l => l.tab !== tab && !(tab === 'errors' && l.level === 'error')));
  }, []);

  const openFile = useCallback((path: string) => {
    setActivePath(path);
    setOpenTabs(prev => prev.includes(path) ? prev : [...prev, path]);
  }, []);

  const closeTab = (path: string) => {
    setOpenTabs(prev => {
      const next = prev.filter(p => p !== path);
      if (activePath === path) setActivePath(next[next.length - 1] || '');
      return next;
    });
  };

  const handleImport = useCallback((p: DetectedProject) => {
    setProject(p);
    setOpenTabs([p.entryFile]);
    setActivePath(p.entryFile);
    setInstalled(new Set());
    setResults([]);
    setFailure(null);
    setLines([]);
    log('build', 'success', 'import', `Imported ${p.name} — detected ${p.framework} (${p.buildTool})`);
    log('build', 'info', 'detect', `Language: ${p.language} • Platform: ${p.platform} • Runner: ${p.testRunner}`);
    log('build', 'info', 'scan', `Dependency scan complete — ${p.outdated.length} outdated, ${p.vulnerabilities} vulnerabilit(y|ies)`);
    if (p.missingComponents.some(c => c.required)) {
      log('build', 'warn', 'installer', `${p.missingComponents.filter(c => c.required).length} required components missing. Opening Smart Installer…`);
      setTimeout(() => setInstallerOpen(true), 400);
    }
  }, [log]);

  const runTests = useCallback((scope: 'all' | 'file' | 'smoke' = 'all') => {
    if (!project) return;
    setRunning(true);
    setResults([]);
    setFailure(null);
    setRightTab('results');
    const isMaven = project.buildTool.toLowerCase().startsWith('maven');
    const isGradle = project.buildTool.toLowerCase().startsWith('gradle');
    const isNode = project.packageManager.toLowerCase().startsWith('npm');
    const cmd =
      isMaven ? `mvn test${scope === 'smoke' ? ' -Dgroups=smoke' : ''}` :
      isGradle ? `./gradlew test${scope === 'smoke' ? ' --tests *Smoke*' : ''}` :
      isNode ? `npx playwright test${scope === 'smoke' ? ' --grep @smoke' : ''}` :
      'testzone run';

    log('execution', 'info', 'runner', `$ ${cmd}`);
    log(isMaven ? 'maven' : isGradle ? 'gradle' : 'execution', 'info', 'lifecycle', isMaven ? '[INFO] Scanning for projects...' : isGradle ? '> Task :compileTestJava' : 'Running Playwright tests');

    const files = flattenFiles(project.files).filter(f => /\.(java|ts|feature|kt)$/.test(f.name));
    const suite = files.slice(0, 6);
    let i = 0;
    const timer = setInterval(() => {
      if (i >= suite.length) {
        clearInterval(timer);
        const passed = suite.length - 1;
        log('execution', 'success', 'runner', `Tests run: ${suite.length}, Passed: ${passed}, Failed: 1, Skipped: 0`, suite.length * 340);
        log('build', 'success', 'build', 'BUILD SUCCESS with 1 failing test — see AI Failure Analysis');
        setRunning(false);
        setFailure({
          testName: 'com.testzone.tests.LoginTest.invalidLogin',
          rootCause: 'The selector `.error` did not resolve within the default 10 s wait — the login page now renders errors inside `[role="alert"]`.',
          confidence: 94,
          suggestion: 'Replace the CSS selector `.error` with a semantic ARIA locator and use an explicit wait instead of implicit sleeps.',
          patch: `- driver.findElement(By.className("error")).isDisplayed();
+ new WebDriverWait(driver, Duration.ofSeconds(10))
+   .until(ExpectedConditions.visibilityOfElementLocated(
+       By.cssSelector("[role='alert']"))).isDisplayed();`,
          doc: 'https://www.selenium.dev/documentation/webdriver/waits/',
        });
        return;
      }
      const f = suite[i];
      const isFail = i === suite.length - 1;
      const dur = 120 + Math.floor(Math.random() * 500);
      const status: TestResult['status'] = isFail ? 'fail' : 'pass';
      const res: TestResult = {
        id: `t${i}`,
        name: f.name.replace(/\.[^.]+$/, '') + (isFail ? '.invalidLogin' : '.validLogin'),
        file: f.path,
        status,
        durationMs: dur,
        stack: isFail ? `org.openqa.selenium.NoSuchElementException: Unable to locate element: {"method":"css selector","selector":".error"}\n  at LoginTest.invalidLogin(LoginTest.java:38)` : undefined,
      };
      setResults(prev => [...prev, res]);
      log('execution', isFail ? 'error' : 'success', 'test', `${isFail ? '✗' : '✓'} ${res.name} (${dur} ms)`, dur);
      if (isFail && res.stack) log('errors', 'error', 'stack', res.stack);
      i++;
    }, 550);
  }, [project, log]);

  const handleTerminal = useCallback((cmd: string) => {
    log('terminal', 'info', 'shell', `$ ${cmd}`);
    const lower = cmd.toLowerCase();
    if (/^(run|execute).*(regression|smoke|login|test)/i.test(lower) || /^(mvn|gradle|npx|npm)\b/.test(lower)) {
      log('terminal', 'info', 'ai', `Interpreting → running test suite`);
      setTimeout(() => runTests(lower.includes('smoke') ? 'smoke' : 'all'), 300);
    } else if (lower.startsWith('help')) {
      log('terminal', 'info', 'ai', 'Try: run login regression • run smoke tests • mvn clean install • ./gradlew test • npx playwright test');
    } else {
      log('terminal', 'warn', 'shell', `Command not recognized: ${cmd}`);
    }
  }, [log, runTests]);

  const activeFile = activePath ? filesByPath.get(activePath) : undefined;

  const stats = useMemo(() => ({
    pass: results.filter(r => r.status === 'pass').length,
    fail: results.filter(r => r.status === 'fail').length,
    skip: results.filter(r => r.status === 'skip').length,
    duration: results.reduce((a, r) => a + r.durationMs, 0),
  }), [results]);

  /* ---------------- Resizable split-pane layout ---------------- */
  const bodyRef = useRef<HTMLDivElement>(null);
  const [breakpoint, setBreakpoint] = useState<'lg' | 'md' | 'sm'>('lg');
  const [dragging, setDragging] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const tree = usePersistedSize('tz-studio-tree-w', 240, 180, 380);
  const ai = usePersistedSize('tz-studio-ai-w', 360, 280, 500);
  const consolePane = usePersistedSize('tz-studio-console-h', 260, 140, 560);
  const [aiCollapsed, setAiCollapsed] = usePersistedFlag('tz-studio-ai-collapsed', false);

  useEffect(() => {
    const measure = () => {
      const w = window.innerWidth;
      setBreakpoint(w < 900 ? 'sm' : w < 1280 ? 'md' : 'lg');
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const isSmall = breakpoint === 'sm';
  const showDockedAi = !isSmall && !aiCollapsed;

  // Editor must keep >= 55% (AI panel <= 45%) and <= 85% (AI panel >= 15%) of the split area
  const clampAi = useCallback((w: number) => {
    const total = bodyRef.current?.clientWidth ?? 1280;
    const area = Math.max(480, total - tree.size - 12);
    const lo = Math.max(280, Math.round(area * 0.15));
    const hi = Math.max(lo, Math.min(500, Math.round(area * 0.45)));
    return Math.min(hi, Math.max(lo, w));
  }, [tree.size]);

  const aiWidth = clampAi(ai.size);

  const toggleAi = useCallback(() => {
    if (isSmall) { setDrawerOpen(o => !o); return; }
    setAiCollapsed(c => !c);
  }, [isSmall, setAiCollapsed]);


  // Root palette per theme
  const rootBg = dark
    ? 'bg-gradient-to-br from-[#0a0e1a] via-[#0b1226] to-[#0a0e1a]'
    : 'bg-gradient-to-br from-[#F8FAFC] via-white to-[#EFF6FF]';

  const glassPanel = dark
    ? 'bg-white/5 border-white/10 backdrop-blur-xl'
    : 'bg-white/75 border-white/60 backdrop-blur-2xl shadow-[0_20px_60px_-30px_rgba(15,23,42,0.15)]';

  const glassSoft = dark ? 'bg-white/5 border-white/10' : 'bg-white/70 border-slate-200/70';
  const textMuted = dark ? 'text-slate-400' : 'text-slate-500';
  const borderSubtle = dark ? 'border-white/10' : 'border-slate-200/70';

  return (
    <div className={cn('relative h-full flex flex-col text-foreground overflow-hidden', rootBg, !dark && 'studio-light')}>
      {/* Aurora backdrop */}
      <div className="pointer-events-none absolute inset-0 opacity-70">
        {dark ? (
          <>
            <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-primary/25 blur-[120px]" />
            <div className="absolute top-1/3 -right-24 h-96 w-96 rounded-full bg-emerald-500/15 blur-[120px]" />
            <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-purple-500/15 blur-[120px]" />
          </>
        ) : (
          <>
            <div className="absolute -top-40 -left-24 h-[420px] w-[420px] rounded-full bg-[#2563EB]/15 blur-[130px]" />
            <div className="absolute top-1/4 -right-32 h-[420px] w-[420px] rounded-full bg-[#06B6D4]/15 blur-[130px]" />
            <div className="absolute bottom-0 left-1/3 h-[380px] w-[380px] rounded-full bg-[#8B5CF6]/12 blur-[130px]" />
          </>
        )}
      </div>

      {/* Header */}
      <header className={cn('relative z-10 flex items-center justify-between gap-3 px-4 h-12 border-b', borderSubtle, glassPanel)}>
        <div className="flex items-center gap-2 min-w-0">
          <SmartBackButton className="mr-1" />
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#2563EB] via-[#06B6D4] to-[#8B5CF6] flex items-center justify-center shadow-lg shadow-[#2563EB]/30">
            <Layers className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold bg-gradient-to-r from-[#2563EB] via-[#06B6D4] to-[#8B5CF6] bg-clip-text text-transparent leading-none">TestZone Studio</h1>
            <p className={cn('text-[10px] truncate', textMuted)}>AI-powered automation IDE</p>
          </div>
          {project && (
            <div className="hidden md:flex items-center gap-1.5 ml-4 min-w-0">
              <Badge variant="secondary" className="text-[10px]">{project.language}</Badge>
              <Badge variant="outline" className="text-[10px]">{project.projectType}</Badge>
              <Badge variant="outline" className="text-[10px]">{project.buildTool}</Badge>
              <Badge variant="outline" className="text-[10px]">{project.testRunner}</Badge>
              <Badge variant="outline" className="text-[10px]">{project.platform}</Badge>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {/* Theme selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5" aria-label="Select editor theme">
                <Palette className="h-3.5 w-3.5" />
                <span className="hidden lg:inline text-xs">{themeMeta.label}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 bg-white dark:bg-slate-900">
              <DropdownMenuLabel className="text-xs">Editor theme</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as StudioTheme)}>
                {THEME_OPTIONS.map(t => (
                  <DropdownMenuRadioItem key={t.id} value={t.id} className="text-xs">
                    <div className="flex flex-col">
                      <span className="font-medium">{t.label}</span>
                      <span className="text-[10px] text-muted-foreground">{t.hint}</span>
                    </div>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}><FolderOpen className="h-3.5 w-3.5 mr-1.5" /> Import</Button>
          <Button size="sm" variant="outline" onClick={() => setInstallerOpen(true)} disabled={!project}><Package className="h-3.5 w-3.5 mr-1.5" /> Installer</Button>
          <Button
            size="sm"
            onClick={() => runTests('all')}
            disabled={!project || running}
            className="bg-gradient-to-r from-[#2563EB] to-[#06B6D4] text-white hover:opacity-95 shadow-md shadow-[#2563EB]/25"
          >
            {running ? <><Clock className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Running…</> : <><Play className="h-3.5 w-3.5 mr-1.5" /> Run</>}
          </Button>
          <Button size="sm" variant="outline" disabled={!project || running}><Bug className="h-3.5 w-3.5 mr-1.5" /> Debug</Button>
        </div>
      </header>

      {/* Body: File tree | Editor+Console | AI panel — fully resizable split panes */}
      <div ref={bodyRef} className="relative z-10 flex-1 min-h-0 flex overflow-hidden">
        {/* File tree */}
        <aside
          style={{ width: tree.size }}
          className={cn(
            'border-r flex flex-col min-h-0 shrink-0',
            !dragging && 'transition-[width] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
            borderSubtle, glassPanel,
          )}
        >

          <div className={cn('h-9 px-3 flex items-center border-b text-[11px] font-semibold uppercase tracking-widest', borderSubtle, textMuted)}>
            <Boxes className="h-3.5 w-3.5 mr-1.5" /> Project
          </div>
          <div className="flex-1 overflow-y-auto p-1.5">
            {project ? (
              <>
                <div className={cn('px-2 py-1 text-[11px]', textMuted)}>
                  <ChevronRight className="inline h-3 w-3" /> <span className="font-medium text-foreground">{project.name}</span>
                </div>
                <Tree nodes={project.files} activePath={activePath} onOpen={openFile} dark={dark} />
              </>
            ) : (
              <div className={cn('px-3 py-6 text-center text-xs', textMuted)}>
                <ScanSearch className="h-6 w-6 mx-auto mb-2 opacity-60" />
                No project loaded.
                <Button size="sm" variant="link" className="text-xs mt-1" onClick={() => setImportOpen(true)}>Import a project</Button>
              </div>
            )}
          </div>
          {project && (
            <div className={cn('border-t p-2 text-[10px] space-y-1', borderSubtle, textMuted)}>
              <div className="flex justify-between"><span>Java</span><span className="text-foreground">{project.javaVersion || '—'}</span></div>
              <div className="flex justify-between"><span>SDK</span><span className="text-foreground">{project.sdkVersion || '—'}</span></div>
              <div className="flex justify-between"><span>OS</span><span className="text-foreground">{project.os}</span></div>
              <div className="flex justify-between"><span>Patterns</span><span className="text-foreground truncate ml-2">{project.patterns.join(', ')}</span></div>
            </div>
          )}
        </aside>

        {/* File tree ↔ Editor splitter */}
        <Splitter
          orientation="vertical"
          dark={dark}
          label="Resize project explorer"
          onDragStateChange={setDragging}
          onDelta={tree.nudge}
          onReset={tree.reset}
        />

        {/* Editor + Console (stacked) */}
        <section className="flex flex-col min-h-0 min-w-0 flex-1">

          {/* Editor tabs */}
          <div className={cn('flex items-center border-b h-9 overflow-x-auto', borderSubtle, dark ? 'bg-black/30' : 'bg-white/60 backdrop-blur-xl')}>
            {openTabs.length === 0 ? (
              <div className={cn('px-3 text-xs', textMuted)}>Open a file from the project tree to start editing.</div>
            ) : openTabs.map(p => {
              const f = filesByPath.get(p);
              if (!f) return null;
              const active = activePath === p;
              return (
                <div
                  key={p}
                  className={cn(
                    'group flex items-center gap-2 h-full px-3 border-r cursor-pointer text-xs transition-colors',
                    borderSubtle,
                    active
                      ? (dark ? 'bg-white/5 text-foreground' : 'bg-[#DBEAFE]/60 text-[#1D4ED8] border-b-2 border-b-[#2563EB]')
                      : (dark ? 'text-muted-foreground hover:bg-white/5' : 'text-slate-500 hover:bg-blue-50/60')
                  )}
                  onClick={() => setActivePath(p)}
                >
                  <span className="truncate max-w-[180px]">{f.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); closeTab(p); }}
                    className={cn('opacity-40 hover:opacity-100 rounded p-0.5', dark ? 'hover:bg-white/10' : 'hover:bg-slate-200')}
                    aria-label="Close tab"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Editor */}
          <div className="flex-1 min-h-0 relative">
            {activeFile ? (
              <Editor
                key={activeFile.path + ':' + theme}
                height="100%"
                language={monacoLang(activeFile.language)}
                value={activeFile.content}
                theme={themeMeta.monaco}
                beforeMount={(m) => { monacoRef.current = m; defineMonacoThemes(m); }}
                options={{
                  readOnly: false,
                  minimap: { enabled: true, scale: 1 },
                  fontSize: 13,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  automaticLayout: true,
                  tabSize: 2,
                  padding: { top: 12, bottom: 12 },
                  bracketPairColorization: { enabled: true },
                  renderLineHighlight: 'all',
                  fontLigatures: true,
                  smoothScrolling: true,
                  cursorSmoothCaretAnimation: 'on',
                  cursorBlinking: 'smooth',
                }}
              />
            ) : (
              <EmptyEditor project={project} onImport={() => setImportOpen(true)} dark={dark} />
            )}
          </div>
          {/* Editor ↔ Console splitter */}
          <Splitter
            orientation="horizontal"
            dark={dark}
            label="Resize console"
            onDragStateChange={setDragging}
            onDelta={(d) => consolePane.nudge(-d)}
            onReset={consolePane.reset}
          />

          {/* Console */}
          <div
            className={cn('shrink-0 min-h-0', !dragging && 'transition-[height] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)]')}
            style={{ height: consolePane.size }}
          >
            <StudioConsole lines={lines} onClear={clearTab} onTerminal={handleTerminal} dark={dark} />
          </div>
        </section>

        {/* Editor ↔ AI Insights splitter */}
        {showDockedAi && (
          <Splitter
            orientation="vertical"
            dark={dark}
            label="Resize AI Insights panel"
            onDragStateChange={setDragging}
            onDelta={(d) => ai.setSize(clampAi(aiWidth - d))}
            onReset={() => ai.setSize(clampAi(360))}
          />
        )}

        {/* Right AI + Results */}
        {(showDockedAi || (isSmall && drawerOpen)) && (
        <aside
          style={isSmall ? undefined : { width: aiWidth }}
          className={cn(
            'border-l flex flex-col min-h-0 shrink-0 overflow-hidden',
            isSmall
              ? 'absolute right-0 top-0 bottom-0 z-30 w-[min(88vw,380px)] shadow-2xl animate-in slide-in-from-right duration-[220ms]'
              : !dragging && 'transition-[width] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
            borderSubtle, glassPanel,
          )}
        >

          <Tabs value={rightTab} onValueChange={(v) => setRightTab(v as typeof rightTab)} className="flex flex-col h-full">
            <TabsList className={cn('w-full rounded-none bg-transparent border-b h-9', borderSubtle)}>
              <TabsTrigger value="ai" className={cn('flex-1 h-9 text-xs rounded-none', dark ? 'data-[state=active]:bg-white/5' : 'data-[state=active]:bg-blue-50/70 data-[state=active]:text-[#1D4ED8]')}>
                <Sparkles className="h-3.5 w-3.5 mr-1.5" /> AI Insights
              </TabsTrigger>
              <TabsTrigger value="results" className={cn('flex-1 h-9 text-xs rounded-none', dark ? 'data-[state=active]:bg-white/5' : 'data-[state=active]:bg-blue-50/70 data-[state=active]:text-[#1D4ED8]')}>
                <Rocket className="h-3.5 w-3.5 mr-1.5" /> Results
                {results.length > 0 && <Badge variant="secondary" className="ml-1.5 text-[10px] h-4">{results.length}</Badge>}
              </TabsTrigger>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 mr-1 shrink-0"
                onClick={() => (isSmall ? setDrawerOpen(false) : setAiCollapsed(true))}
                aria-label="Collapse AI Insights panel"
                title="Collapse panel"
              >
                <PanelRightClose className="h-4 w-4" />
              </Button>
            </TabsList>

            <TabsContent value="ai" className="flex-1 m-0 min-h-0">
              <StudioAIPanel
                project={project}
                installedCount={installed.size}
                failure={failure}
                onApplyPatch={() => log('ai', 'success', 'patch', 'Applied AI-suggested patch to LoginTest.java')}
                dark={dark}
              />
            </TabsContent>
            <TabsContent value="results" className="flex-1 m-0 min-h-0 overflow-y-auto p-3 space-y-3">
              <div className="grid grid-cols-4 gap-2">
                <Card className={cn('p-2 text-center border', dark ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200')}>
                  <div className={cn('text-lg font-bold', dark ? 'text-emerald-400' : 'text-emerald-600')}>{stats.pass}</div>
                  <div className={cn('text-[10px]', textMuted)}>Passed</div>
                </Card>
                <Card className={cn('p-2 text-center border', dark ? 'bg-rose-500/10 border-rose-500/30' : 'bg-rose-50 border-rose-200')}>
                  <div className={cn('text-lg font-bold', dark ? 'text-rose-400' : 'text-rose-600')}>{stats.fail}</div>
                  <div className={cn('text-[10px]', textMuted)}>Failed</div>
                </Card>
                <Card className={cn('p-2 text-center border', dark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200')}>
                  <div className={cn('text-lg font-bold', dark ? 'text-amber-300' : 'text-amber-600')}>{stats.skip}</div>
                  <div className={cn('text-[10px]', textMuted)}>Skipped</div>
                </Card>
                <Card className={cn('p-2 text-center border', dark ? 'bg-primary/10 border-primary/30' : 'bg-blue-50 border-blue-200')}>
                  <div className={cn('text-lg font-bold', dark ? 'text-primary' : 'text-[#2563EB]')}>{(stats.duration / 1000).toFixed(1)}s</div>
                  <div className={cn('text-[10px]', textMuted)}>Time</div>
                </Card>
              </div>
              {results.length === 0 ? (
                <div className={cn('text-xs italic text-center py-6', textMuted)}>Run a test to see live results.</div>
              ) : results.map(r => (
                <Card key={r.id} className={cn(
                  'p-2.5 border',
                  r.status === 'fail'
                    ? (dark ? 'border-rose-500/30 bg-rose-500/5' : 'border-rose-200 bg-rose-50/70')
                    : r.status === 'pass'
                    ? (dark ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-emerald-200 bg-emerald-50/70')
                    : (dark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white/70')
                )}>
                  <div className="flex items-center gap-2">
                    {r.status === 'pass' && <CheckCircle2 className={cn('h-4 w-4', dark ? 'text-emerald-400' : 'text-emerald-600')} />}
                    {r.status === 'fail' && <XCircle className={cn('h-4 w-4', dark ? 'text-rose-400' : 'text-rose-600')} />}
                    {r.status === 'skip' && <MinusCircle className={cn('h-4 w-4', dark ? 'text-amber-300' : 'text-amber-600')} />}
                    <div className="text-xs font-medium flex-1 truncate font-mono">{r.name}</div>
                    <div className={cn('text-[10px]', textMuted)}>{r.durationMs}ms</div>
                  </div>
                  <div className={cn('text-[10px] mt-1 truncate', textMuted)}>{r.file}</div>
                  {r.stack && (
                    <pre className={cn(
                      'mt-2 text-[10px] font-mono rounded p-2 overflow-x-auto whitespace-pre-wrap border',
                      dark ? 'bg-black/40 border-rose-500/20 text-slate-200' : 'bg-white border-rose-200 text-slate-700'
                    )}>{r.stack}</pre>
                  )}
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </aside>
        )}

        {/* Collapsed AI rail (48px) */}
        {!isSmall && aiCollapsed && (
          <aside
            className={cn('w-12 shrink-0 border-l flex flex-col items-center gap-2 py-2 transition-[width] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)]', borderSubtle, glassPanel)}
          >
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={toggleAi}
              aria-label="Expand AI Insights panel"
              title="Expand AI Insights"
            >
              <PanelRightOpen className="h-4 w-4 text-[#2563EB]" />
            </Button>
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#2563EB] via-[#06B6D4] to-[#8B5CF6] flex items-center justify-center shadow-md shadow-[#2563EB]/25">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className={cn('text-[10px] tracking-widest [writing-mode:vertical-rl] rotate-180 mt-1', textMuted)}>AI INSIGHTS</span>
          </aside>
        )}

        {/* Mobile drawer backdrop */}
        {isSmall && drawerOpen && (
          <div
            className="absolute inset-0 z-20 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
        )}
      </div>


      {/* Dialogs */}
      <StudioImportDialog open={importOpen} onOpenChange={setImportOpen} onImport={handleImport} />
      <StudioInstallerDialog
        open={installerOpen}
        onOpenChange={setInstallerOpen}
        components={project?.missingComponents || []}
        onInstalled={(names) => setInstalled(new Set([...installed, ...names]))}
        onLog={(text) => log('build', 'info', 'installer', text)}
      />
    </div>
  );
};

const EmptyEditor: React.FC<{ project: DetectedProject | null; onImport: () => void; dark: boolean }> = ({ project, onImport, dark }) => (
  <div className={cn('h-full w-full flex items-center justify-center p-8', !dark && 'bg-white')}>
    <div className="max-w-lg text-center space-y-4">
      <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-[#2563EB] via-[#06B6D4] to-[#8B5CF6] flex items-center justify-center shadow-2xl shadow-[#2563EB]/30">
        <Layers className="h-8 w-8 text-white" />
      </div>
      <h2 className="text-xl font-semibold bg-gradient-to-r from-[#2563EB] via-[#06B6D4] to-[#8B5CF6] bg-clip-text text-transparent">
        {project ? 'Ready when you are' : 'Welcome to TestZone Studio'}
      </h2>
      <p className={cn('text-sm', dark ? 'text-muted-foreground' : 'text-slate-500')}>
        {project
          ? `${project.framework} project detected. Open a file from the tree, or run the suite with the Run button.`
          : 'A purpose-built AI automation IDE. Import any Maven, Gradle, Node, Selenium, Playwright, Appium or Cucumber project — TestZone will detect the framework, resolve missing SDKs, and analyze failures with AI.'}
      </p>
      <div className="grid grid-cols-3 gap-2 pt-2 max-w-md mx-auto">
        {[
          { icon: Server, label: 'Auto detection' },
          { icon: Package, label: 'Smart installer' },
          { icon: TermIcon, label: 'AI terminal' },
          { icon: Cpu, label: 'Live console' },
          { icon: Wrench, label: 'AI fix suggest' },
          { icon: Sparkles, label: 'Health score' },
        ].map(f => (
          <div
            key={f.label}
            className={cn(
              'rounded-xl border p-3 flex flex-col items-center gap-1.5 transition-all hover:-translate-y-0.5',
              dark ? 'border-white/10 bg-white/5' : 'border-slate-200/80 bg-white/80 backdrop-blur-xl shadow-sm hover:shadow-md'
            )}
          >
            <f.icon className="h-4 w-4 text-[#2563EB]" />
            <div className={cn('text-[11px]', dark ? 'text-muted-foreground' : 'text-slate-500')}>{f.label}</div>
          </div>
        ))}
      </div>
      {!project && (
        <Button onClick={onImport} className="mt-3 bg-gradient-to-r from-[#2563EB] to-[#06B6D4] text-white hover:opacity-95">
          <FolderOpen className="h-4 w-4 mr-1.5" /> Import project
        </Button>
      )}
    </div>
  </div>
);

export default StudioModule;
