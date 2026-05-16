import JSZip from 'jszip';
import type { ReportFileSummary } from '@/types/defectAnalyzer';

const TEXT_LIKE = ['.html', '.htm', '.json', '.log', '.txt', '.xml', '.csv', '.yml', '.yaml', '.md'];

// Budgets — tuned so the edge function payload stays well under the 50MB cap
// while still providing rich context for huge automation reports (up to 500MB+).
const MAX_PER_FILE = 350_000;       // ~350KB per file in the digest
const MAX_TOTAL = 1_200_000;        // ~1.2MB total digest
const SMART_EXTRACT_THRESHOLD = 2 * 1024 * 1024; // 2MB — switch to failure-focused streaming
const STREAM_CHUNK = 4 * 1024 * 1024;            // 4MB read chunks
const HEAD_TAIL_CHARS = 40_000;                  // keep beginning + end of huge files

// Lines worth keeping when smart-extracting a huge report
const FAILURE_PATTERNS = [
  /\bfail(ed|ure)?\b/i,
  /\berror\b/i,
  /\bexception\b/i,
  /\btraceback\b/i,
  /\bassert(ion)?\b/i,
  /\btimeout\b/i,
  /\bnosuchelement\b/i,
  /\belementnotfound\b/i,
  /\bstaleelement\b/i,
  /\bxpath\b/i,
  /\blocator\b/i,
  /\bflaky\b/i,
  /\bretry\b/i,
  /\bskipped\b/i,
  /\bpanic\b/i,
  /\bcrash(ed)?\b/i,
  /\bstatus[:= ]+(fail|error)/i,
  /\b\d{3}\s+(internal server error|bad gateway|service unavailable)/i,
];

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
  const head = text.slice(0, Math.floor(max * 0.7));
  const tail = text.slice(-Math.floor(max * 0.25));
  return `${head}\n[...truncated ${text.length - max} chars from middle...]\n${tail}`;
}

/**
 * Stream-reads a huge text/log/json file via File.slice() chunks and keeps:
 *  - the first HEAD_TAIL_CHARS chars
 *  - the last HEAD_TAIL_CHARS chars
 *  - every line matching FAILURE_PATTERNS (with N lines of surrounding context)
 *
 * This lets us handle 500MB log/HAR/HTML reports without loading them fully into memory.
 */
export type ParseProgress = (info: {
  fileIndex: number;
  fileName: string;
  fileBytes: number;
  fileTotal: number;
  overallBytes: number;
  overallTotal: number;
}) => void;

async function smartExtractLargeFile(
  file: File,
  kind: ReportFileSummary['kind'],
  onChunk?: (chunkBytes: number) => void,
): Promise<string> {
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const totalSize = file.size;
  let offset = 0;
  let leftover = '';
  let head = '';
  let tailRing = '';
  const matches: string[] = [];
  const recentLines: string[] = [];
  const CONTEXT = 2;
  let pendingAfter = 0;
  let matchCharBudget = MAX_PER_FILE - HEAD_TAIL_CHARS * 2;
  if (matchCharBudget < 50_000) matchCharBudget = 50_000;
  let matchChars = 0;

  while (offset < totalSize) {
    const slice = file.slice(offset, offset + STREAM_CHUNK);
    const buf = await slice.arrayBuffer();
    const chunk = leftover + decoder.decode(buf, { stream: true });
    const readBytes = Math.min(STREAM_CHUNK, totalSize - (offset - STREAM_CHUNK));
    offset += STREAM_CHUNK;
    if (onChunk) onChunk(readBytes);
    const lastNl = chunk.lastIndexOf('\n');
    const processable = lastNl >= 0 ? chunk.slice(0, lastNl) : chunk;
    leftover = lastNl >= 0 ? chunk.slice(lastNl + 1) : '';

    // capture HEAD
    if (head.length < HEAD_TAIL_CHARS) {
      head += processable.slice(0, HEAD_TAIL_CHARS - head.length);
    }

    // rolling TAIL ring
    tailRing = (tailRing + processable).slice(-HEAD_TAIL_CHARS);

    // line scan for failure patterns
    if (matchChars < matchCharBudget) {
      const lines = processable.split(/\r?\n/);
      for (const line of lines) {
        recentLines.push(line);
        if (recentLines.length > CONTEXT + 1) recentLines.shift();

        const isMatch = FAILURE_PATTERNS.some((re) => re.test(line));
        if (isMatch) {
          // include preceding context
          for (const prev of recentLines.slice(0, -1)) {
            if (matchChars >= matchCharBudget) break;
            matches.push(prev);
            matchChars += prev.length + 1;
          }
          if (matchChars < matchCharBudget) {
            matches.push(line);
            matchChars += line.length + 1;
          }
          pendingAfter = CONTEXT;
        } else if (pendingAfter > 0) {
          if (matchChars < matchCharBudget) {
            matches.push(line);
            matchChars += line.length + 1;
          }
          pendingAfter--;
        }
      }
    }
  }

  // flush any leftover into tail
  if (leftover) tailRing = (tailRing + leftover).slice(-HEAD_TAIL_CHARS);

  let combined =
    `[FILE: ${file.name} • ${(totalSize / (1024 * 1024)).toFixed(1)}MB • smart-extracted]\n\n` +
    `--- HEAD (first ${head.length} chars) ---\n${head}\n\n` +
    (matches.length
      ? `--- FAILURE / ERROR LINES (${matches.length} extracted) ---\n${matches.join('\n')}\n\n`
      : `--- NO FAILURE PATTERNS DETECTED IN STREAM ---\n\n`) +
    `--- TAIL (last ${tailRing.length} chars) ---\n${tailRing}`;

  if (kind === 'html') {
    // best-effort flatten of HTML chunks we kept
    combined = htmlToText(combined);
  }
  return combined;
}

async function readSmallFileAsText(file: File, kind: ReportFileSummary['kind']): Promise<string> {
  const raw = await file.text();
  return kind === 'html' ? htmlToText(raw) : raw;
}

async function processFile(
  file: File,
  kind: ReportFileSummary['kind'],
  onChunk?: (chunkBytes: number) => void,
): Promise<string> {
  if (file.size > SMART_EXTRACT_THRESHOLD && kind !== 'json') {
    return smartExtractLargeFile(file, kind, onChunk);
  }
  if (file.size > SMART_EXTRACT_THRESHOLD) {
    return smartExtractLargeFile(file, 'text', onChunk);
  }
  const out = await readSmallFileAsText(file, kind);
  if (onChunk) onChunk(file.size);
  return out;
}

export interface ParseMetrics {
  /** % of original raw bytes successfully read into the digest pipeline (before truncation). */
  parsingCompletion: number;
  /** % of failure-relevant lines extracted vs estimated total relevant lines. Heuristic. */
  logCoverage: number;
  /** Total raw bytes processed. */
  rawBytes: number;
  /** Bytes actually shipped to the AI (digest length). */
  digestBytes: number;
  /** Number of failure-pattern matches captured. */
  failureLinesCaptured: number;
}

export async function parseReportFiles(
  files: File[],
  onProgress?: ParseProgress,
): Promise<{ digest: string; summaries: ReportFileSummary[]; metrics: ParseMetrics }> {
  const summaries: ReportFileSummary[] = [];
  const sections: string[] = [];
  let total = 0;
  const overallTotal = files.reduce((s, f) => s + f.size, 0);
  let overallBytes = 0;
  let rawProcessed = 0;
  let failureLinesCaptured = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const kind = detectKind(file.name);
    summaries.push({ name: file.name, size: file.size, kind });

    let fileBytes = 0;
    const reportChunk = (n: number) => {
      fileBytes = Math.min(file.size, fileBytes + n);
      overallBytes = Math.min(overallTotal, overallBytes + n);
      onProgress?.({
        fileIndex: i,
        fileName: file.name,
        fileBytes,
        fileTotal: file.size,
        overallBytes,
        overallTotal,
      });
    };

    // emit initial 0% tick so UI shows the file immediately
    onProgress?.({
      fileIndex: i,
      fileName: file.name,
      fileBytes: 0,
      fileTotal: file.size,
      overallBytes,
      overallTotal,
    });

    try {
      if (kind === 'zip') {
        const zip = await JSZip.loadAsync(await file.arrayBuffer());
        reportChunk(file.size);
        const entries = Object.values(zip.files)
          .filter((e) => !e.dir && isTextLike(e.name))
          .sort((a, b) => {
            const score = (n: string) =>
              /(fail|error|result|report|summary|junit|cucumber|test)/i.test(n) ? 0 : 1;
            return score(a.name) - score(b.name);
          });

        for (const entry of entries) {
          const raw = await entry.async('string');
          const lower = entry.name.toLowerCase();
          const subKind: ReportFileSummary['kind'] =
            lower.endsWith('.html') || lower.endsWith('.htm') ? 'html' : 'text';
          let processed = subKind === 'html' ? htmlToText(raw) : raw;
          if (processed.length > MAX_PER_FILE) processed = clip(processed);
          sections.push(`--- FILE: ${entry.name} ---\n${processed}`);
          total += processed.length;
          if (total >= MAX_TOTAL) break;
        }
      } else {
        const processed = await processFile(file, kind, reportChunk);
        const clipped = clip(processed);
        sections.push(`--- FILE: ${file.name} ---\n${clipped}`);
        total += clipped.length;
      }
    } catch (e) {
      sections.push(
        `--- FILE: ${file.name} (read error: ${(e as Error).message}) ---\n` +
          `The analyzer could not read this file. If it's > 500MB, try splitting it or uploading a ZIP of the failure logs only.`,
      );
      throw e;
    }

    if (total >= MAX_TOTAL) break;
  }

  let digest = sections.join('\n\n');
  if (digest.length > MAX_TOTAL) {
    digest = digest.slice(0, MAX_TOTAL) + `\n[...total digest truncated for upload safety...]`;
  }
  return { digest, summaries };
}
