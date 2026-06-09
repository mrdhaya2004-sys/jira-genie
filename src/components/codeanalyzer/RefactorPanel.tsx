import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Check, Download } from 'lucide-react';
import type { AnalysisResult } from '@/types/codeAnalyzer';

interface Props { result: AnalysisResult }

const VariantView: React.FC<{ variant?: { code: string; changes: string[]; benefits: string[] }; language: string }> = ({ variant, language }) => {
  const [copied, setCopied] = useState(false);
  if (!variant) return <div className="text-sm text-muted-foreground p-4">Not generated.</div>;
  const copy = async () => { await navigator.clipboard.writeText(variant.code); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const download = () => {
    const ext = ({ Java: 'java', Python: 'py', JavaScript: 'js', TypeScript: 'ts', 'C#': 'cs', Kotlin: 'kt', Swift: 'swift', SQL: 'sql', Shell: 'sh' } as Record<string, string>)[language] || 'txt';
    const blob = new Blob([variant.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `refactored.${ext}`; a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {variant.changes?.length > 0 && (
          <Card className="border-border/60"><CardContent className="p-4">
            <h5 className="text-sm font-semibold mb-2">Changes Made</h5>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {variant.changes.map((c, i) => <li key={i} className="flex gap-2"><span className="text-primary">•</span>{c}</li>)}
            </ul>
          </CardContent></Card>
        )}
        {variant.benefits?.length > 0 && (
          <Card className="border-border/60"><CardContent className="p-4">
            <h5 className="text-sm font-semibold mb-2">Benefits</h5>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {variant.benefits.map((c, i) => <li key={i} className="flex gap-2"><span className="text-emerald-500">✓</span>{c}</li>)}
            </ul>
          </CardContent></Card>
        )}
      </div>
      <div className="rounded-lg border border-border/60 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 border-b border-border/60">
          <span className="text-xs font-mono text-muted-foreground">{language}</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={copy}>{copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}</Button>
            <Button variant="ghost" size="sm" onClick={download}><Download className="h-3 w-3" /></Button>
          </div>
        </div>
        <pre className="p-3 text-xs font-mono overflow-x-auto whitespace-pre max-h-[480px] overflow-y-auto"><code>{variant.code}</code></pre>
      </div>
    </div>
  );
};

const RefactorPanel: React.FC<Props> = ({ result }) => (
  <Tabs defaultValue="refactored" className="w-full">
    <TabsList className="grid w-full grid-cols-3">
      <TabsTrigger value="refactored">🧹 Refactored</TabsTrigger>
      <TabsTrigger value="optimized">⚡ Optimized</TabsTrigger>
      <TabsTrigger value="enterprise">🏢 Enterprise</TabsTrigger>
    </TabsList>
    <TabsContent value="refactored" className="mt-4"><VariantView variant={result.refactors.refactored} language={result.language} /></TabsContent>
    <TabsContent value="optimized" className="mt-4"><VariantView variant={result.refactors.optimized} language={result.language} /></TabsContent>
    <TabsContent value="enterprise" className="mt-4"><VariantView variant={result.refactors.enterprise} language={result.language} /></TabsContent>
  </Tabs>
);

export default RefactorPanel;
