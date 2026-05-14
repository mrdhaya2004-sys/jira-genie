import JSZip from 'jszip';
import type { ReportFileSummary } from '@/types/defectAnalyzer';

const TEXT_LIKE = ['.html', '.htm', '.json', '.log', '.txt', '.xml', '.csv', '.yml', '.yaml', '.md'];
const MAX_PER_FILE = 200_000;
const MAX_TOTAL = 600_000;

function detectKind(name: string): ReportFileSummary['kind'] {
  const lower = name.toLowerCase();
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'html';
  if (lower.endsWith('.json')) return 'json';
  if (lower.endsWith('.log')) return 'log';
  if (lower.endsWith('.txt') || lower.endsWith('.xml')) return 'text';
  if (lower.endsWith('.zip')) return 'zip';
  return 'unknown';
}

function isTextLike(name: string) {
  const lower = name.toLowerCase();
  return TEXT_LIKE.some((ext) => lower.endsWith(ext));
}

function htmlToText(html: string): string {
  if (typeof DOMParser === 'undefined') return html;
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script,style,svg,noscript').forEach((n) => n.remove());
    const text = doc.body?.innerText || doc.documentElement?.textContent || '';
    return text.replace(/\n{3,}/g, '\n\n').trim();
  } catch {
    return html;
  }
}

function clip(text: string, max = MAX_PER_FILE) {
  if (text.length <= max) return text;
  return text.slice(0, max) + `\n[...truncated ${text.length - max} chars...]`;
}

export async function parseReportFiles(files: File[]): Promise<{ digest: string; summaries: ReportFileSummary[] }> {
  const summaries: ReportFileSummary[] = [];
  const sections: string[] = [];
  let total = 0;

  for (const file of files) {
    const kind = detectKind(file.name);
    summaries.push({ name: file.name, size: file.size, kind });

    if (kind === 'zip') {
      try {
        const zip = await JSZip.loadAsync(await file.arrayBuffer());
        for (const entry of Object.values(zip.files)) {
          if (entry.dir) continue;
          if (!isTextLike(entry.name)) continue;
          const raw = await entry.async('string');
          const processed = entry.name.toLowerCase().endsWith('.html') || entry.name.toLowerCase().endsWith('.htm')
            ? htmlToText(raw)
            : raw;
          const clipped = clip(processed);
          sections.push(`--- FILE: ${entry.name} ---\n${clipped}`);
          total += clipped.length;
          if (total >= MAX_TOTAL) break;
        }
      } catch (e) {
        sections.push(`--- FILE: ${file.name} (ZIP error: ${(e as Error).message}) ---`);
      }
    } else {
      const raw = await file.text();
      const processed = kind === 'html' ? htmlToText(raw) : raw;
      const clipped = clip(processed);
      sections.push(`--- FILE: ${file.name} ---\n${clipped}`);
      total += clipped.length;
    }

    if (total >= MAX_TOTAL) break;
  }

  let digest = sections.join('\n\n');
  if (digest.length > MAX_TOTAL) {
    digest = digest.slice(0, MAX_TOTAL) + `\n[...total digest truncated...]`;
  }
  return { digest, summaries };
}
