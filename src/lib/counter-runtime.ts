import type { ImageAnalysis, ImageCountInput } from './image-analysis.ts';
import { parseCountOutput } from './image-analysis.ts';
import { COUNTER_MODEL, COUNTER_VERSION, MAX_COUNTER_SIDE, validateCounterOptions } from './bead-counter.ts';
import type { CounterOptions, CounterResult } from './bead-counter.ts';
import { CounterIntegrityError, executeCounterRoute } from './counter-routing.ts';

const fingerprint = async (buffer: ArrayBuffer) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', buffer)), b => b.toString(16).padStart(2, '0')).join('');
export const localCounterReady = () => typeof Worker !== 'undefined' && typeof createImageBitmap === 'function' && !!crypto.subtle;
export function validateCounterResult(raw: unknown, width: number, height: number, options: CounterOptions, hash: string): CounterResult {
  try {
  if (!raw || typeof raw !== 'object') throw new CounterIntegrityError('Invalid counter result.');
  const r = raw as CounterResult, e = r.evidence;
  if (!e || e.version !== COUNTER_VERSION || e.width !== width || e.height !== height || e.pixelSha256 !== hash || JSON.stringify(validateCounterOptions(e.options)) !== JSON.stringify(options) || !Number.isInteger(e.foregroundPixels) || e.foregroundPixels < 0 || e.foregroundPixels > width * height || !Number.isInteger(e.candidates) || e.candidates < 0 || !Number.isInteger(e.rejected) || e.rejected < 0 || e.rejected > e.candidates || !Array.isArray(e.marks) || e.marks.length !== Math.min(e.candidates, 250)) throw new CounterIntegrityError('The returned evidence does not match this image or settings.');
  for (const m of e.marks) if (!m || ![m.x, m.y, m.width, m.height, m.area].every(Number.isInteger) || m.x < 0 || m.y < 0 || m.width < 1 || m.height < 1 || m.x + m.width > width || m.y + m.height > height || m.area < 1 || m.area > m.width * m.height || typeof m.accepted !== 'boolean') throw new CounterIntegrityError('Invalid counted-region geometry.');
  const count = parseCountOutput(JSON.stringify({ count: r.count, countable: r.countable, qualityWarnings: r.qualityWarnings, explanation: r.explanation }));
  if (count.countable && (e.rejected !== 0 || e.candidates > 250 || count.count !== e.marks.filter(m => m.accepted).length)) throw new CounterIntegrityError('The returned count differs from its visible regions.');
  return { ...count, evidence: e };
  } catch (error) { throw error instanceof CounterIntegrityError ? error : new CounterIntegrityError('The counter returned invalid evidence; no fallback result was substituted.'); }
}
export async function countImageWithoutFirebase(input: ImageCountInput, rawOptions: CounterOptions, progress: (s: string) => void): Promise<ImageAnalysis> {
  input.signal.throwIfAborted();
  if (input.kind !== 'bead_proxy') throw new Error('The small counter is for bead-proxy tests. Use human review for real larvae or select the optional Firebase adapter.');
  const options = validateCounterOptions(rawOptions), started = performance.now();
  progress('Preparing a bounded image copy…');
  if (await fingerprint(await input.blob.arrayBuffer()) !== input.sha256) throw new CounterIntegrityError('The saved image fingerprint changed. No count was requested.');
  input.signal.throwIfAborted();
  const bitmap = await createImageBitmap(input.blob);
  let rgb: Uint8Array, width: number, height: number;
  try {
    const scale = Math.min(1, MAX_COUNTER_SIDE / Math.max(bitmap.width, bitmap.height));
    width = Math.max(1, Math.round(bitmap.width * scale)); height = Math.max(1, Math.round(bitmap.height * scale));
    if (width < 16 || height < 16) throw new Error('This image is too narrow for the small counter.');
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true }); if (!ctx) throw new Error('This browser cannot prepare image pixels.');
    ctx.fillStyle = 'white'; ctx.fillRect(0, 0, width, height); ctx.drawImage(bitmap, 0, 0, width, height);
    const rgba = ctx.getImageData(0, 0, width, height).data; rgb = new Uint8Array(width * height * 3);
    for (let p = 0; p < width * height; p++) { rgb[p * 3] = rgba[p * 4]; rgb[p * 3 + 1] = rgba[p * 4 + 1]; rgb[p * 3 + 2] = rgba[p * 4 + 2]; }
  } finally { bitmap.close(); }
  const pixelSha256 = await fingerprint(rgb.buffer as ArrayBuffer);
  const server = async () => {
    progress('Sending the reduced image to the Vercel counter…');
    let text = ''; for (let i = 0; i < rgb.length; i += 8192) text += String.fromCharCode(...rgb.subarray(i, i + 8192));
    const timeout = new AbortController(), abort = () => timeout.abort(input.signal.reason), timer = window.setTimeout(() => timeout.abort(new Error('The counting service timed out.')), 20000);
    input.signal.addEventListener('abort', abort, { once: true });
    try {
      const response = await fetch('/api/count-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store', credentials: 'omit', signal: timeout.signal,
        body: JSON.stringify({ schema: 'bead-counter-request-v1', imageSha256: input.sha256, pixelSha256, width, height, kind: input.kind, options, rgbBase64: btoa(text) }) });
      if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('The Vercel counting endpoint is unavailable on this host. Choose browser mode or open the Vercel deployment.');
      const raw = await response.json(); if (!response.ok) throw new Error(raw.error || 'The Vercel count failed.');
      if (raw.schema !== 'bead-counter-response-v1' || raw.source !== 'cloud' || raw.engine !== 'bead_cv' || raw.imageSha256 !== input.sha256 || !['vercel-node', 'node-preview'].includes(raw.runtime)) throw new CounterIntegrityError('Unexpected counting service or image reference.');
      return { result: validateCounterResult(raw, width, height, options, pixelSha256), execution: raw.runtime === 'vercel-node' ? 'vercel-function' as const : 'development-server' as const };
    } finally { window.clearTimeout(timer); input.signal.removeEventListener('abort', abort); }
  };
  const device = () => new Promise<{ result: CounterResult; execution: 'browser-worker' }>((resolve, reject) => {
    progress('Counting in this browser’s small image worker…'); input.signal.throwIfAborted();
    const worker = new Worker(new URL('./counter.worker.ts', import.meta.url), { type: 'module' });
    const abort = () => { clean(); reject(input.signal.reason || new DOMException('Cancelled', 'AbortError')); };
    const timer = window.setTimeout(() => { clean(); reject(new Error('The local counting worker timed out.')); }, 15000);
    const clean = () => { window.clearTimeout(timer); worker.terminate(); input.signal.removeEventListener('abort', abort); };
    input.signal.addEventListener('abort', abort, { once: true });
    worker.onerror = () => { clean(); reject(new Error('This browser could not run the image worker.')); };
    worker.onmessage = event => { clean(); try { if (event.data.error) throw new Error(event.data.error); resolve({ result: validateCounterResult(event.data.result, width, height, options, pixelSha256), execution: 'browser-worker' }); } catch (error) { reject(error); } };
    // Retain the source pixels for an explicitly permitted server fallback.
    const pixels = rgb.slice().buffer; worker.postMessage({ pixels, width, height, options, pixelSha256, kind: input.kind }, [pixels]);
  });
  const route = await executeCounterRoute<{ result: CounterResult; execution: 'vercel-function' | 'development-server' | 'browser-worker' }>(input.mode, input.online, localCounterReady(), server, device, input.signal), result = route.value.result;
  const routingNote = `${route.value.execution === 'browser-worker' ? 'Counted in this device’s browser worker; no image upload.' : route.value.execution === 'vercel-function' ? 'Counted by the Vercel Node function using a reduced RGB image.' : 'Counted by the development Node server.'} ${route.fallback ? 'Used the fallback permitted by your selected processing preference.' : 'Used the selected primary route.'}`;
  const { evidence, ...count } = result;
  return { ...count, id: crypto.randomUUID(), imageSha256: input.sha256, createdAt: new Date().toISOString(), model: COUNTER_MODEL, source: route.used, requestedMode: input.mode, promptVersion: COUNTER_VERSION, elapsedMs: Math.round(performance.now() - started), routingNote, rawResponse: JSON.stringify(result), engine: 'bead_cv', execution: route.value.execution, counterEvidence: evidence };
}
