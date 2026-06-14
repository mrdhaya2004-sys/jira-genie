import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Download, Sparkles, Zap, Building2, Bot, Rocket, Wand2, GitCompare, History, Loader2 } from 'lucide-react';
import SegmentedControl from './SegmentedControl';
import DiffViewer from './DiffViewer';
import { useCodeAnalyzer } from '@/hooks/useCodeAnalyzer';
import { sanitizeStringArray, sanitizeText } from '@/lib/sanitizeText';
import { cn } from '@/lib/utils';
import type { AnalysisResult, RefactorLevel, RefactorVariant } from '@/types/codeAnalyzer';
import { REFACTOR_LEVEL_META } from '@/types/codeAnalyzer';

interface Props { result: AnalysisResult }

interface Version {
  level: number;          // 0 = Original, 1..N = generated
  key: string;            // 'original' | RefactorLevel | `enhanced-${n}`
  label: string;
  tagline: string;
  code: string;
  changes: string[];
  benefits: string[];
  improvementSummary?: string;
}

const LEVEL_ORDER: RefactorLevel[] = ['refactored', 'optimized', 'enterprise', 'aiEnhanced', 'nextGen'];

const LEVEL_ICON: Record<RefactorLevel | 'original' | 'enhanced', React.ReactNode> = {
  original:   <History className="h-3.5 w-3.5" />,
  refactored: <Sparkles className="h-3.5 w-3.5" />,
  optimized:  <Zap className="h-3.5 w-3.5" />,
  enterprise: <Building2 className="h-3.5 w-3.5" />,
  aiEnhanced: <Bot className="h-3.5 w-3.5" />,
  nextGen:    <Rocket className="h-3.5 w-3.5" />,
  enhanced:   <Wand2 className="h-3.5 w-3.5" />,
};

const FOCUS_AREAS = ['stability', 'performance', 'security', 'maintainability', 'readability', 'reusability', 'scalability'];

const VariantView: React.FC<{
  version: Version;
  language: string;
  previousCode: string;
  showDiff: boolean;
}> = ({ version, language, previousCode, showDiff }) => {
  const [copied, setCopied] = useState(false);
  const code = version.code || '';
  const changes = sanitizeStringArray(version.changes);
  const benefits = sanitizeStringArray(version.benefits);

  const copy = async () => { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1400); };
  const download = () => {
    const ext = ({ Java: 'java', Python: 'py', JavaScript: 'js', TypeScript: 'ts', 'C#': 'cs', Kotlin: 'kt', Swift: 'swift', SQL: 'sql', Shell: 'sh' } as Record<string, string>)[language] || 'txt';
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${version.key}.${ext}`; a.click();
    URL.revokeObjectURL(url);
  };

  if (!code) {
    return (
      <div className="hca-glass p-8 text-center hca-rise">
        <div className="text-sm font-medium mb-1">No improvement available at this level yet</div>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Try "Enhance Further" to generate a stronger iteration with a focus area of your choice.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 hca-rise">
      {version.improvementSummary && (
        <div className="hca-glass p-3 text-sm flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <span>{sanitizeText(version.improvementSummary)}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {changes.length > 0 && (
          <div className="hca-glass p-4">
            <h5 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-primary" />Changes Made</h5>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {changes.map((c, i) => <li key={i} className="flex gap-2"><span className="text-primary">•</span>{c}</li>)}
            </ul>
          </div>
        )}
        {benefits.length > 0 && (
          <div className="hca-glass p-4">
            <h5 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-emerald-500" />Benefits</h5>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {benefits.map((c, i) => <li key={i} className="flex gap-2"><span className="text-emerald-500">✓</span>{c}</li>)}
            </ul>
          </div>
        )}
      </div>

      {showDiff && previousCode
        ? <DiffViewer before={previousCode} after={code} />
        : (
          <div className="hca-glass overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/40">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{language}</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={copy}>{copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}</Button>
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={download}><Download className="h-3 w-3" /></Button>
              </div>
            </div>
            <pre className="p-4 text-xs font-mono overflow-x-auto whitespace-pre max-h-[480px] overflow-y-auto leading-relaxed"><code>{code}</code></pre>
          </div>
        )}
    </div>
  );
};

const RefactorPanel: React.FC<Props> = ({ result }) => {
  const { enhance, isEnhancing } = useCodeAnalyzer();
  const [showDiff, setShowDiff] = useState(false);
  const [focus, setFocus] = useState<string>('stability');
  const [extra, setExtra] = useState<Version[]>([]);
  const [activeKey, setActiveKey] = useState<string>('refactored');

  // Build the base version list from the analysis result.
  const baseVersions = useMemo<Version[]>(() => {
    const list: Version[] = [];
    const original = result.originalCode || '';
    if (original) {
      list.push({ level: 0, key: 'original', label: 'Original', tagline: 'As uploaded', code: original, changes: [], benefits: [] });
    }
    LEVEL_ORDER.forEach((k, idx) => {
      const v = result.refactors?.[k] as RefactorVariant | undefined;
      if (v?.code) {
        const meta = REFACTOR_LEVEL_META[k];
        list.push({
          level: idx + 1, key: k, label: meta.label, tagline: meta.tagline,
          code: v.code, changes: v.changes || [], benefits: v.benefits || [],
          improvementSummary: v.improvementSummary,
        });
      }
    });
    return list;
  }, [result]);

  const allVersions = useMemo(() => [...baseVersions, ...extra], [baseVersions, extra]);

  // Default to first generated variant (not the original).
  useEffect(() => {
    if (allVersions.length === 0) return;
    if (!allVersions.find((v) => v.key === activeKey)) {
      setActiveKey(allVersions.find((v) => v.key !== 'original')?.key || allVersions[0].key);
    }
  }, [allVersions, activeKey]);

  const activeIdx = allVersions.findIndex((v) => v.key === activeKey);
  const active = allVersions[activeIdx];
  const previous = activeIdx > 0 ? allVersions[activeIdx - 1] : undefined;

  const handleEnhance = async () => {
    const latest = allVersions[allVersions.length - 1] || baseVersions[0];
    if (!latest?.code) return;
    const targetLevel = latest.level + 1;
    const res = await enhance({
      previousCode: latest.code,
      originalCode: result.originalCode || latest.code,
      language: result.language,
      focusArea: focus,
      targetLevel,
    });
    if (!res?.variant?.code) return;
    const enhancedIdx = extra.length + 1;
    const newVersion: Version = {
      level: targetLevel,
      key: `enhanced-${enhancedIdx}`,
      label: `Enhanced v${enhancedIdx}`,
      tagline: `Focus · ${focus}`,
      code: res.variant.code,
      changes: res.variant.changes || [],
      benefits: res.variant.benefits || [],
      improvementSummary: res.variant.improvementSummary,
    };
    setExtra((prev) => [...prev, newVersion]);
    setActiveKey(newVersion.key);
  };

  if (allVersions.length === 0) {
    return (
      <div className="hca-glass p-10 text-center text-sm text-muted-foreground hca-rise">
        No refactor variants were produced for this snippet.
      </div>
    );
  }

  const segItems = allVersions.map((v) => {
    const iconKey = (v.key.startsWith('enhanced-') ? 'enhanced' : v.key) as keyof typeof LEVEL_ICON;
    return {
      value: v.key,
      icon: LEVEL_ICON[iconKey] || LEVEL_ICON.enhanced,
      label: (
        <span className="flex items-center gap-1.5">
          <span className="text-[10px] opacity-60 tabular-nums">v{v.level + 1}</span>
          {v.label}
        </span>
      ) as React.ReactNode,
    };
  });

  return (
    <div className="space-y-4">
      {/* Version segmented + diff toggle */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <SegmentedControl
          ariaLabel="Refactor variants"
          value={activeKey}
          onChange={setActiveKey}
          items={segItems}
        />
        <Button
          variant={showDiff ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowDiff((s) => !s)}
          disabled={!previous}
          className="rounded-xl"
        >
          <GitCompare className="h-3.5 w-3.5 mr-1.5" />
          {showDiff ? 'Hide diff' : 'Compare with previous'}
        </Button>
      </div>

      {/* Active version meta */}
      {active && (
        <div className="hca-glass hca-glass-hover p-4 flex flex-wrap items-center gap-3">
          <Badge variant="secondary" className="rounded-full px-3">
            Level {active.level} · {active.label}
          </Badge>
          <span className="text-sm text-muted-foreground">{active.tagline}</span>
          {previous && (
            <span className="text-xs text-muted-foreground ml-auto">
              Comparing against <strong className="text-foreground">{previous.label}</strong>
            </span>
          )}
        </div>
      )}

      {/* Variant body */}
      {active && (
        <VariantView
          version={active}
          language={result.language}
          previousCode={previous?.code || ''}
          showDiff={showDiff && !!previous}
        />
      )}

      {/* Enhance Further controls */}
      <div className="hca-glass hca-glass-hover p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">Enhance Further</h4>
          <span className="text-xs text-muted-foreground">— generate the next iteration with a focused improvement axis.</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FOCUS_AREAS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFocus(f)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs capitalize transition',
                focus === f
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card/60 border-border/60 hover:border-primary/50',
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleEnhance} disabled={isEnhancing} className="rounded-xl">
            {isEnhancing ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Enhancing…</> : <><Sparkles className="h-4 w-4 mr-1.5" />Generate Enhanced Version</>}
          </Button>
          <span className="text-xs text-muted-foreground">
            Builds on <strong className="text-foreground">{allVersions[allVersions.length - 1]?.label}</strong> → produces level {(allVersions[allVersions.length - 1]?.level || 0) + 1}.
          </span>
        </div>
      </div>

      {/* Version history rail */}
      <div className="hca-glass p-4">
        <div className="flex items-center gap-2 mb-3">
          <History className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">Enhancement History</h4>
        </div>
        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {allVersions.map((v) => (
            <li key={v.key}>
              <button
                type="button"
                onClick={() => setActiveKey(v.key)}
                className={cn(
                  'w-full text-left rounded-xl border p-3 transition',
                  v.key === activeKey
                    ? 'border-primary/60 bg-primary/10'
                    : 'border-border/50 bg-card/40 hover:border-primary/40',
                )}
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="tabular-nums">v{v.level + 1}</span>
                  <span>·</span>
                  <span className="capitalize">{v.tagline}</span>
                </div>
                <div className="text-sm font-medium mt-0.5">{v.label}</div>
                {v.improvementSummary && (
                  <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{sanitizeText(v.improvementSummary)}</div>
                )}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};

export default RefactorPanel;
