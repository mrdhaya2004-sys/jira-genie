import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check, Download, Sparkles, Zap, Building2 } from 'lucide-react';
import SegmentedControl from './SegmentedControl';
import type { AnalysisResult } from '@/types/codeAnalyzer';

interface Props { result: AnalysisResult }

type VariantKey = 'refactored' | 'optimized' | 'enterprise';

const VariantView: React.FC<{ variant?: { code: string; changes: string[]; benefits: string[] }; language: string }> = ({ variant, language }) => {
  const [copied, setCopied] = useState(false);
  if (!variant || !variant.code) {
    return (
      <div className="hca-glass p-8 text-center hca-rise">
        <div className="text-sm font-medium mb-1">No significant optimization opportunity detected</div>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          The code already follows acceptable practices for readability, stability, and structure at this level.
        </p>
      </div>
    );
  }
  const copy = async () => { await navigator.clipboard.writeText(variant.code); setCopied(true); setTimeout(() => setCopied(false), 1400); };
  const download = () => {
    const ext = ({ Java: 'java', Python: 'py', JavaScript: 'js', TypeScript: 'ts', 'C#': 'cs', Kotlin: 'kt', Swift: 'swift', SQL: 'sql', Shell: 'sh' } as Record<string, string>)[language] || 'txt';
    const blob = new Blob([variant.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `refactored.${ext}`; a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-3 hca-rise">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {variant.changes?.length > 0 && (
          <div className="hca-glass p-4">
            <h5 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-primary" />Changes Made</h5>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {variant.changes.map((c, i) => <li key={i} className="flex gap-2"><span className="text-primary">•</span>{c}</li>)}
            </ul>
          </div>
        )}
        {variant.benefits?.length > 0 && (
          <div className="hca-glass p-4">
            <h5 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-emerald-500" />Benefits</h5>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {variant.benefits.map((c, i) => <li key={i} className="flex gap-2"><span className="text-emerald-500">✓</span>{c}</li>)}
            </ul>
          </div>
        )}
      </div>
      <div className="hca-glass overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/40">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{language}</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={copy}>{copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}</Button>
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={download}><Download className="h-3 w-3" /></Button>
          </div>
        </div>
        <pre className="p-4 text-xs font-mono overflow-x-auto whitespace-pre max-h-[480px] overflow-y-auto leading-relaxed"><code>{variant.code}</code></pre>
      </div>
    </div>
  );
};

const RefactorPanel: React.FC<Props> = ({ result }) => {
  const [variant, setVariant] = useState<VariantKey>('refactored');
  return (
    <div className="space-y-4">
      <SegmentedControl
        ariaLabel="Refactor variants"
        value={variant}
        onChange={(v) => setVariant(v as VariantKey)}
        items={[
          { value: 'refactored', label: 'Refactored', icon: <Sparkles className="h-3.5 w-3.5" /> },
          { value: 'optimized',  label: 'Optimized',  icon: <Zap className="h-3.5 w-3.5" /> },
          { value: 'enterprise', label: 'Enterprise', icon: <Building2 className="h-3.5 w-3.5" /> },
        ]}
      />
      <div key={variant}>
        <VariantView variant={result.refactors[variant]} language={result.language} />
      </div>
    </div>
  );
};

export default RefactorPanel;
