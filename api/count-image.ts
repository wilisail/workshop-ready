import { createHash } from 'node:crypto';
import { countBeadPixels, COUNTER_VERSION, MAX_COUNTER_SIDE } from '../src/lib/bead-counter.ts';

const MAX_BODY = 2400000;
const visits = new Map<string, { start: number; count: number }>();
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...extra } });
export const maxDuration = 10;
export async function countImageRequest(request: Request): Promise<Response> {
  const runtime = process.env.VERCEL ? 'vercel-node' : 'node-preview';
  if (request.method === 'GET') return json({ engine: 'bead_cv', version: COUNTER_VERSION, runtime, maxSide: MAX_COUNTER_SIDE, kinds: ['bead_proxy'] });
  if (request.method !== 'POST') return json({ error: 'Use POST for counting.' }, 405, { Allow: 'GET, POST' });
  if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'Send JSON image data.' }, 415);
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'Use this website’s own counting endpoint.' }, 403);
  const now = Date.now(), key = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'anonymous';
  for (const [k, v] of visits) if (now - v.start > 60000) visits.delete(k);
  const previous = visits.get(key), visit = previous || { start: now, count: 0 };
  if (visit.count >= 12 || (!previous && visits.size >= 1000)) return json({ error: 'The demonstration count limit was reached. Wait a minute or choose this-device mode.' }, 429, { 'Retry-After': '60' });
  visit.count++; visits.set(key, visit);
  try {
    if (Number(request.headers.get('content-length') || 0) > MAX_BODY) return json({ error: 'Image request is too large.' }, 413);
    // Bound the stream before JSON parsing, including requests without Content-Length.
    const reader = request.body?.getReader(); if (!reader) return json({ error: 'Image data is missing.' }, 400);
    const chunks: Uint8Array[] = []; let length = 0;
    while (true) { const part = await reader.read(); if (part.done) break; length += part.value.length; if (length > MAX_BODY) { await reader.cancel(); return json({ error: 'Image request is too large.' }, 413); } chunks.push(part.value); }
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!body || body.schema !== 'bead-counter-request-v1' || !/^[a-f0-9]{64}$/.test(body.imageSha256) || !/^[a-f0-9]{64}$/.test(body.pixelSha256) || !Number.isInteger(body.width) || !Number.isInteger(body.height) || body.width < 16 || body.height < 16 || body.width > MAX_COUNTER_SIDE || body.height > MAX_COUNTER_SIDE || typeof body.rgbBase64 !== 'string' || body.rgbBase64.length !== Math.ceil(body.width * body.height * 3 / 3) * 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(body.rgbBase64)) return json({ error: 'Invalid or oversized image request.' }, 400);
    if (body.kind !== 'bead_proxy') return json({ error: 'This method accepts bead proxies only, not biological larvae.' }, 400);
    const rgb = Buffer.from(body.rgbBase64, 'base64');
    const pixelSha256 = createHash('sha256').update(rgb).digest('hex');
    if (pixelSha256 !== body.pixelSha256) return json({ error: 'Pixel fingerprint mismatch.' }, 400);
    const result = countBeadPixels(rgb, body.width, body.height, body.options, pixelSha256, body.kind);
    return json({ schema: 'bead-counter-response-v1', engine: 'bead_cv', source: 'cloud', runtime, imageSha256: body.imageSha256, ...result });
  } catch (error) { return json({ error: error instanceof Error && !(error instanceof SyntaxError) ? error.message.slice(0, 200) : 'Invalid image JSON.' }, 400); }
}
export default { fetch: countImageRequest };
