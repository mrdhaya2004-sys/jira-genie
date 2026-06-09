import React from 'react';
import { Button } from '@/components/ui/button';
import type { AnalysisResult } from '@/types/codeAnalyzer';
import { FileText, FileCode2, Globe } from 'lucide-react';

interface Props { result: AnalysisResult; trigger?: React.ReactNode }

function buildHtml(r: AnalysisResult): string {
  const sev = (s: string) => ({
    critical: '#e11d48', high: '#ea580c', medium: '#d97706', low: '#0284c7',
  } as Record<string, string>)[s] || '#64748b';
  const issuesHtml = r.issues.map(i => `
    <div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin:8px 0;">
      <div><span style="background:${sev(i.severity)};color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;">${i.severity.toUpperCase()}</span>
      ${i.line ? `<span style="margin-left:8px;color:#64748b;font-size:12px;">Line ${i.line}</span>` : ''}
      <span style="margin-left:8px;color:#64748b;font-size:12px;">${i.type || ''}</span></div>
      <h4 style="margin:6px 0;">${escapeHtml(i.title)}</h4>
      <p style="margin:4px 0;font-size:13px;"><b>Problem:</b> ${escapeHtml(i.problem)}</p>
      <p style="margin:4px 0;font-size:13px;"><b>Fix:</b> ${escapeHtml(i.suggestion)}</p>
      ${i.codeBefore ? `<pre style="background:#fef2f2;padding:8px;border-radius:4px;font-size:11px;overflow:auto;"><code>${escapeHtml(i.codeBefore)}</code></pre>` : ''}
      ${i.codeAfter ? `<pre style="background:#f0fdf4;padding:8px;border-radius:4px;font-size:11px;overflow:auto;"><code>${escapeHtml(i.codeAfter)}</code></pre>` : ''}
      ${i.explanation ? `<p style="font-size:12px;color:#475569;"><b>Why:</b> ${escapeHtml(i.explanation)}</p>` : ''}
    </div>`).join('');
  const subs = Object.entries(r.subScores).map(([k, v]) => `<li><b>${k}:</b> ${v}%</li>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>Hive Code Analyzer Report</title>
<style>body{font-family:-apple-system,Inter,Segoe UI,sans-serif;max-width:880px;margin:24px auto;padding:0 16px;color:#0f172a;}h1,h2{color:#0f172a;}pre{white-space:pre-wrap;}</style>
</head><body>
<h1>Hive Code Analyzer Report</h1>
<p><b>Language:</b> ${escapeHtml(r.language)} ${r.framework ? `· <b>Framework:</b> ${escapeHtml(r.framework)}` : ''}</p>
<h2>Overall Score: ${r.overallScore}/100</h2>
<p>${escapeHtml(r.summary)}</p>
<h3>Sub-scores</h3><ul>${subs}</ul>
<h3>Automation Stability: ${r.automationStability.score}/100 (Risk: ${r.automationStability.risk})</h3>
<ul>${(r.automationStability.reasons || []).map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>
<h3>Severity counts</h3>
<p>Critical: ${r.sevCounts.critical} · High: ${r.sevCounts.high} · Medium: ${r.sevCounts.medium} · Low: ${r.sevCounts.low}</p>
<h2>Issues (${r.issues.length})</h2>
${issuesHtml}
<h2>Refactored Code</h2>
<pre><code>${escapeHtml(r.refactors.refactored?.code || '')}</code></pre>
<h2>Optimized Code</h2>
<pre><code>${escapeHtml(r.refactors.optimized?.code || '')}</code></pre>
<h2>Enterprise Code</h2>
<pre><code>${escapeHtml(r.refactors.enterprise?.code || '')}</code></pre>
</body></html>`;
}

function escapeHtml(s: string): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const ExportButtons: React.FC<Props> = ({ result }) => {
  const html = () => download(`code-analysis-${result.analysisId.slice(0, 8)}.html`, buildHtml(result), 'text/html');
  const pdf = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(buildHtml(result));
    w.document.close();
    setTimeout(() => w.print(), 400);
  };
  const md = () => {
    const lines = [
      `# Hive Code Analyzer Report`,
      `**Language:** ${result.language} · **Framework:** ${result.framework || '—'}`,
      ``,
      `## Overall Score: ${result.overallScore}/100`,
      result.summary,
      ``,
      `## Sub-scores`,
      ...Object.entries(result.subScores).map(([k, v]) => `- **${k}:** ${v}%`),
      ``,
      `## Automation Stability: ${result.automationStability.score}/100 (${result.automationStability.risk})`,
      ...(result.automationStability.reasons || []).map(r => `- ${r}`),
      ``,
      `## Issues`,
      ...result.issues.map(i => `### [${i.severity.toUpperCase()}] ${i.title}${i.line ? ` (line ${i.line})` : ''}\n\n**Problem:** ${i.problem}\n\n**Fix:** ${i.suggestion}\n\n\`\`\`\n${i.codeBefore}\n\`\`\`\n→\n\`\`\`\n${i.codeAfter}\n\`\`\`\n`),
    ];
    download(`code-analysis-${result.analysisId.slice(0, 8)}.md`, lines.join('\n'), 'text/markdown');
  };
  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={pdf}><FileText className="h-3.5 w-3.5 mr-1.5" />PDF</Button>
      <Button variant="outline" size="sm" onClick={html}><Globe className="h-3.5 w-3.5 mr-1.5" />HTML</Button>
      <Button variant="outline" size="sm" onClick={md}><FileCode2 className="h-3.5 w-3.5 mr-1.5" />Markdown</Button>
    </div>
  );
};

export default ExportButtons;
