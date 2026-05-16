import JSZip from 'jszip';

export interface ScreenshotAsset {
  id: string;
  name: string;
  sourceFile: string;
  /** base64 data URL (downscaled JPEG/PNG). */
  dataUrl: string;
  /** Original byte size before downscaling. */
  originalBytes: number;
  /** Final byte size of the data URL payload. */
  encodedBytes: number;
  width: number;
  height: number;
  /** Free-form context the AI can use to map this screenshot back to a scenario (filename hints, nearby log lines). */
  context?: string;
}

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];

// Caps — keep payload to AI Gateway well under limits.
const MAX_SCREENSHOTS = 8;
const MAX_DIM = 1280;
const TARGET_QUALITY = 0.78;
const MAX_TOTAL_PAYLOAD = 6 * 1024 * 1024; // 6MB combined

function isImageName(name: string): boolean {
  const lower = name.toLowerCase();
  return IMAGE_EXTS.some((ext) => lower.endsWith(ext));
}

function isLikelyFailureShot(name: string): number {
  const lower = name.toLowerCase();
  // Higher score = more interesting to AI (failure screenshots win over pass shots).
  if (/(fail|error|crash|exception|broken)/i.test(lower)) return 0;
  if (/(after|final|last|result)/i.test(lower)) return 1;
  if (/(before|step\d+|action)/i.test(lower)) return 2;
  return 3;
}

async function blobToDownscaledDataUrl(blob: Blob): Promise<{ dataUrl: string; width: number; height: number } | null> {
  if (typeof createImageBitmap === 'undefined' || typeof document === 'undefined') return null;
  try {
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const isPng = blob.type === 'image/png';
    const dataUrl = canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', TARGET_QUALITY);
    bitmap.close?.();
    return { dataUrl, width: w, height: h };
  } catch {
    return null;
  }
}

function extractInlineImagesFromHtml(html: string, sourceFile: string): { name: string; blob: Blob }[] {
  const out: { name: string; blob: Blob }[] = [];
  const re = /<img[^>]+src=["'](data:image\/(png|jpe?g|gif|webp);base64,([^"']+))["']/gi;
  let match: RegExpExecArray | null;
  let idx = 0;
  while ((match = re.exec(html)) !== null && out.length < MAX_SCREENSHOTS) {
    try {
      const mime = `image/${match[2].toLowerCase().replace('jpg', 'jpeg')}`;
      const bin = atob(match[3]);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      out.push({
        name: `${sourceFile}#inline-${idx++}.${mime.split('/')[1]}`,
        blob: new Blob([bytes], { type: mime }),
      });
    } catch {
      // ignore corrupt inline image
    }
  }
  return out;
}

/**
 * Walks the user-uploaded files (and any zips inside them) and extracts up to
 * MAX_SCREENSHOTS downscaled JPEG/PNG data URLs that the AI vision model can read.
 */
export async function extractScreenshots(files: File[]): Promise<ScreenshotAsset[]> {
  const collected: { name: string; blob: Blob; sourceFile: string }[] = [];

  for (const file of files) {
    const lower = file.name.toLowerCase();

    if (isImageName(lower)) {
      collected.push({ name: file.name, blob: file, sourceFile: file.name });
      continue;
    }

    if (lower.endsWith('.zip')) {
      try {
        const zip = await JSZip.loadAsync(await file.arrayBuffer());
        const entries = Object.values(zip.files).filter((e) => !e.dir && isImageName(e.name));
        // Prioritise failure screenshots first.
        entries.sort((a, b) => isLikelyFailureShot(a.name) - isLikelyFailureShot(b.name));
        for (const entry of entries) {
          if (collected.length >= MAX_SCREENSHOTS * 2) break;
          const blob = await entry.async('blob');
          const ext = entry.name.split('.').pop()?.toLowerCase() || 'png';
          const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
          collected.push({
            name: entry.name,
            blob: new Blob([blob], { type: mime }),
            sourceFile: file.name,
          });
        }
      } catch {
        // ignore unreadable zip — main parser will surface the error
      }
      continue;
    }

    if (lower.endsWith('.html') || lower.endsWith('.htm')) {
      try {
        const text = await file.text();
        const inline = extractInlineImagesFromHtml(text, file.name);
        for (const img of inline) {
          collected.push({ name: img.name, blob: img.blob, sourceFile: file.name });
          if (collected.length >= MAX_SCREENSHOTS * 2) break;
        }
      } catch {
        // ignore
      }
    }
  }

  // Re-sort prioritising failure shots and trim to MAX_SCREENSHOTS.
  collected.sort((a, b) => isLikelyFailureShot(a.name) - isLikelyFailureShot(b.name));
  const trimmed = collected.slice(0, MAX_SCREENSHOTS);

  const assets: ScreenshotAsset[] = [];
  let totalBytes = 0;
  for (const item of trimmed) {
    const downscaled = await blobToDownscaledDataUrl(item.blob);
    if (!downscaled) continue;
    const encodedBytes = downscaled.dataUrl.length;
    if (totalBytes + encodedBytes > MAX_TOTAL_PAYLOAD) break;
    totalBytes += encodedBytes;
    assets.push({
      id: crypto.randomUUID(),
      name: item.name.split('/').pop() || item.name,
      sourceFile: item.sourceFile,
      dataUrl: downscaled.dataUrl,
      originalBytes: item.blob.size,
      encodedBytes,
      width: downscaled.width,
      height: downscaled.height,
      context: `Source: ${item.sourceFile} • Name hint: ${item.name}`,
    });
  }
  return assets;
}
