import React, { useCallback, useMemo, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  FolderOpen, Play, Bug, Package, Terminal as TermIcon, Sparkles, X,
  CheckCircle2, XCircle, MinusCircle, Clock, Boxes, Cpu, Layers,
  Wrench, Rocket, ChevronRight, ScanSearch, Server,
} from 'lucide-react';
import SmartBackButton from '@/components/common/SmartBackButton';
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
  const lineId = useRef(0);

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

  return (
    <div className="relative h-full flex flex-col bg-gradient-to-br from-[#0a0e1a] via-[#0b1226] to-[#0a0e1a] text-foreground overflow-hidden">
      {/* Aurora backdrop */}
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-primary/25 blur-[120px]" />
        <div className="absolute top-1/3 -right-24 h-96 w-96 rounded-full bg-emerald-500/15 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-purple-500/15 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between gap-3 px-4 h-12 border-b border-white/10 bg-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-2 min-w-0">
          <SmartBackButton className="mr-1" />
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shadow-lg shadow-primary/30">
            <Layers className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold bg-gradient-to-r from-primary via-sky-300 to-purple-400 bg-clip-text text-transparent leading-none">TestZone Studio</h1>
            <p className="text-[10px] text-muted-foreground truncate">AI-powered automation IDE</p>
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
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}><FolderOpen className="h-3.5 w-3.5 mr-1.5" /> Import</Button>
          <Button size="sm" variant="outline" onClick={() => setInstallerOpen(true)} disabled={!project}><Package className="h-3.5 w-3.5 mr-1.5" /> Installer</Button>
          <Button size="sm" onClick={() => runTests('all')} disabled={!project || running}>
            {running ? <><Clock className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Running…</> : <><Play className="h-3.5 w-3.5 mr-1.5" /> Run</>}
          </Button>
          <Button size="sm" variant="outline" disabled={!project || running}><Bug className="h-3.5 w-3.5 mr-1.5" /> Debug</Button>
        </div>
      </header>

      {/* Body: File tree | Editor+Console | AI panel */}
      <div className="relative z-10 flex-1 min-h-0 grid grid-cols-[240px_1fr_360px] gap-0">
        {/* File tree */}
        <aside className="border-r border-white/10 bg-black/20 backdrop-blur-sm flex flex-col min-h-0">
          <div className="h-9 px-3 flex items-center border-b border-white/10 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            <Boxes className="h-3.5 w-3.5 mr-1.5" /> Project
          </div>
          <div className="flex-1 overflow-y-auto p-1.5">
            {project ? (
              <>
                <div className="px-2 py-1 text-[11px] text-muted-foreground">
                  <ChevronRight className="inline h-3 w-3" /> <span className="font-medium text-foreground">{project.name}</span>
                </div>
                <Tree nodes={project.files} activePath={activePath} onOpen={openFile} />
              </>
            ) : (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                <ScanSearch className="h-6 w-6 mx-auto mb-2 opacity-60" />
                No project loaded.
                <Button size="sm" variant="link" className="text-xs mt-1" onClick={() => setImportOpen(true)}>Import a project</Button>
              </div>
            )}
          </div>
          {project && (
            <div className="border-t border-white/10 p-2 text-[10px] text-muted-foreground space-y-1">
              <div className="flex justify-between"><span>Java</span><span className="text-foreground">{project.javaVersion || '—'}</span></div>
              <div className="flex justify-between"><span>SDK</span><span className="text-foreground">{project.sdkVersion || '—'}</span></div>
              <div className="flex justify-between"><span>OS</span><span className="text-foreground">{project.os}</span></div>
              <div className="flex justify-between"><span>Patterns</span><span className="text-foreground truncate ml-2">{project.patterns.join(', ')}</span></div>
            </div>
          )}
        </aside>

        {/* Editor + Console (stacked) */}
        <section className="flex flex-col min-h-0 min-w-0">
          {/* Editor tabs */}
          <div className="flex items-center border-b border-white/10 bg-black/30 h-9 overflow-x-auto">
            {openTabs.length === 0 ? (
              <div className="px-3 text-xs text-muted-foreground">Open a file from the project tree to start editing.</div>
            ) : openTabs.map(p => {
              const f = filesByPath.get(p);
              if (!f) return null;
              return (
                <div
                  key={p}
                  className={cn(
                    'group flex items-center gap-2 h-full px-3 border-r border-white/10 cursor-pointer text-xs',
                    activePath === p ? 'bg-white/5 text-foreground' : 'text-muted-foreground hover:bg-white/5'
                  )}
                  onClick={() => setActivePath(p)}
                >
                  <span className="truncate max-w-[180px]">{f.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); closeTab(p); }}
                    className="opacity-40 hover:opacity-100 rounded hover:bg-white/10 p-0.5"
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
                key={activeFile.path}
                height="100%"
                language={monacoLang(activeFile.language)}
                value={activeFile.content}
                theme="vs-dark"
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
                }}
              />
            ) : (
              <EmptyEditor project={project} onImport={() => setImportOpen(true)} />
            )}
          </div>

          {/* Console */}
          <div className="h-[38%] min-h-[220px]">
            <StudioConsole lines={lines} onClear={clearTab} onTerminal={handleTerminal} />
          </div>
        </section>

        {/* Right AI + Results */}
        <aside className="border-l border-white/10 bg-black/20 backdrop-blur-sm flex flex-col min-h-0">
          <Tabs value={rightTab} onValueChange={(v) => setRightTab(v as typeof rightTab)} className="flex flex-col h-full">
            <TabsList className="w-full rounded-none bg-transparent border-b border-white/10 h-9">
              <TabsTrigger value="ai" className="flex-1 h-9 text-xs data-[state=active]:bg-white/5 rounded-none">
                <Sparkles className="h-3.5 w-3.5 mr-1.5" /> AI Insights
              </TabsTrigger>
              <TabsTrigger value="results" className="flex-1 h-9 text-xs data-[state=active]:bg-white/5 rounded-none">
                <Rocket className="h-3.5 w-3.5 mr-1.5" /> Results
                {results.length > 0 && <Badge variant="secondary" className="ml-1.5 text-[10px] h-4">{results.length}</Badge>}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="ai" className="flex-1 m-0 min-h-0">
              <StudioAIPanel
                project={project}
                installedCount={installed.size}
                failure={failure}
                onApplyPatch={() => log('ai', 'success', 'patch', 'Applied AI-suggested patch to LoginTest.java')}
              />
            </TabsContent>
            <TabsContent value="results" className="flex-1 m-0 min-h-0 overflow-y-auto p-3 space-y-3">
              <div className="grid grid-cols-4 gap-2">
                <Card className="p-2 bg-emerald-500/10 border-emerald-500/30 text-center">
                  <div className="text-lg font-bold text-emerald-400">{stats.pass}</div>
                  <div className="text-[10px] text-muted-foreground">Passed</div>
                </Card>
                <Card className="p-2 bg-rose-500/10 border-rose-500/30 text-center">
                  <div className="text-lg font-bold text-rose-400">{stats.fail}</div>
                  <div className="text-[10px] text-muted-foreground">Failed</div>
                </Card>
                <Card className="p-2 bg-amber-500/10 border-amber-500/30 text-center">
                  <div className="text-lg font-bold text-amber-300">{stats.skip}</div>
                  <div className="text-[10px] text-muted-foreground">Skipped</div>
                </Card>
                <Card className="p-2 bg-primary/10 border-primary/30 text-center">
                  <div className="text-lg font-bold text-primary">{(stats.duration / 1000).toFixed(1)}s</div>
                  <div className="text-[10px] text-muted-foreground">Time</div>
                </Card>
              </div>
              {results.length === 0 ? (
                <div className="text-xs text-muted-foreground italic text-center py-6">Run a test to see live results.</div>
              ) : results.map(r => (
                <Card key={r.id} className={cn('p-2.5 border', r.status === 'fail' ? 'border-rose-500/30 bg-rose-500/5' : r.status === 'pass' ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/10 bg-white/5')}>
                  <div className="flex items-center gap-2">
                    {r.status === 'pass' && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                    {r.status === 'fail' && <XCircle className="h-4 w-4 text-rose-400" />}
                    {r.status === 'skip' && <MinusCircle className="h-4 w-4 text-amber-300" />}
                    <div className="text-xs font-medium flex-1 truncate font-mono">{r.name}</div>
                    <div className="text-[10px] text-muted-foreground">{r.durationMs}ms</div>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1 truncate">{r.file}</div>
                  {r.stack && (
                    <pre className="mt-2 text-[10px] font-mono bg-black/40 rounded p-2 overflow-x-auto whitespace-pre-wrap border border-rose-500/20">{r.stack}</pre>
                  )}
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </aside>
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

const EmptyEditor: React.FC<{ project: DetectedProject | null; onImport: () => void }> = ({ project, onImport }) => (
  <div className="h-full w-full flex items-center justify-center p-8">
    <div className="max-w-lg text-center space-y-4">
      <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shadow-2xl shadow-primary/30">
        <Layers className="h-8 w-8 text-white" />
      </div>
      <h2 className="text-xl font-semibold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
        {project ? 'Ready when you are' : 'Welcome to TestZone Studio'}
      </h2>
      <p className="text-sm text-muted-foreground">
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
          <div key={f.label} className="rounded-xl border border-white/10 bg-white/5 p-3 flex flex-col items-center gap-1.5">
            <f.icon className="h-4 w-4 text-primary" />
            <div className="text-[11px] text-muted-foreground">{f.label}</div>
          </div>
        ))}
      </div>
      {!project && (
        <Button onClick={onImport} className="mt-3"><FolderOpen className="h-4 w-4 mr-1.5" /> Import project</Button>
      )}
    </div>
  </div>
);

export default StudioModule;
