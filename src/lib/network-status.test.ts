import test from 'node:test';
import assert from 'node:assert/strict';
import { countImageRequest } from '../../api/count-image.ts';
import { COUNTER_VERSION, MAX_COUNTER_SIDE } from './bead-counter.ts';
import { actualImageRoute, checkCounterService } from './network-status.ts';
import type { ImageAnalysis } from './image-analysis.ts';

const metadata = { engine: 'bead_cv', version: COUNTER_VERSION, maxSide: MAX_COUNTER_SIDE, kinds: ['bead_proxy'], runtime: 'vercel-node' };
const signal = () => new AbortController().signal;
const fetchResult = (value: unknown): typeof fetch => async () => Response.json(value);

test('service check exercises actual metadata handler without sending a photo or using count quota', async () => {
  const fetcher: typeof fetch = async (url, init) => {
    assert.equal(url, '/api/count-image');
    assert.equal(init?.method, 'GET');
    assert.equal(init?.body, undefined);
    assert.equal(init?.cache, 'no-store');
    assert.equal(init?.credentials, 'omit');
    assert.equal(init?.redirect, 'error');
    return countImageRequest(new Request('https://demo.example/api/count-image', init));
  };
  const result = await checkCounterService(signal(), fetcher);
  assert.equal(result.status, 'reachable');
  assert.ok(['node-preview', 'vercel-node'].includes(result.runtime!));
  assert.ok(Number.isFinite(Date.parse(result.checkedAt)));
  assert.ok(result.elapsedMs >= 0);
});

test('Vercel metadata and development metadata retain distinct runtime labels', async () => {
  const vercel = await checkCounterService(signal(), fetchResult(metadata));
  assert.equal(vercel.runtime, 'vercel-node');
  const development = await checkCounterService(signal(), fetchResult({ ...metadata, runtime: 'node-preview' }));
  assert.equal(development.runtime, 'node-preview');
  assert.match(development.message, /Development/);
});

test('HTTP failure, sign-in page and wrong counter metadata never certify service access', async () => {
  assert.equal((await checkCounterService(signal(), async () => new Response('Forbidden', { status: 403 }))).status, 'unavailable');
  assert.equal((await checkCounterService(signal(), async () => new Response('<html>Sign in</html>', { headers: { 'content-type': 'text/html' } }))).status, 'unexpected');
  for (const value of [null, {}, { ...metadata, runtime: 'unknown' }, { ...metadata, version: 'wrong' }, { ...metadata, maxSide: 9999 }, { ...metadata, kinds: ['larvae'] }, { ...metadata, engine: 'firebase' }]) {
    assert.equal((await checkCounterService(signal(), fetchResult(value))).status, 'unexpected');
  }
});

test('broken JSON and network failure are explicit failed checks', async () => {
  assert.equal((await checkCounterService(signal(), async () => new Response('{', { headers: { 'content-type': 'application/json' } }))).status, 'unavailable');
  const result = await checkCounterService(signal(), async () => { throw new TypeError('Failed to fetch'); });
  assert.equal(result.status, 'unavailable');
  assert.equal(result.runtime, undefined);
});

const hanging: typeof fetch = async (_url, init) => new Promise((_resolve, reject) => {
  init!.signal!.addEventListener('abort', () => reject(init!.signal!.reason), { once: true });
});
test('a stalled service is bounded by a timeout', async () => {
  const result = await checkCounterService(signal(), hanging, 5);
  assert.equal(result.status, 'unavailable');
  assert.match(result.message, /timed out/);
});
test('cancellation discards a pending check instead of reporting a false outage', async () => {
  const controller = new AbortController();
  const result = checkCounterService(controller.signal, hanging);
  controller.abort();
  await assert.rejects(result, { name: 'AbortError' });
  let requested = false;
  await assert.rejects(checkCounterService(controller.signal, async () => { requested = true; return Response.json(metadata); }));
  assert.equal(requested, false);
});
test('actual route labels use retained execution evidence rather than requested preference', () => {
  const sample = { requestedMode: 'cloud-first', source: 'device', execution: 'browser-worker' } as ImageAnalysis;
  assert.equal(actualImageRoute(sample), 'This browser’s worker');
  assert.equal(actualImageRoute({ ...sample, source: 'cloud', execution: 'development-server' }), 'Development Node service');
  assert.equal(actualImageRoute({ ...sample, source: 'cloud', execution: 'vercel-function' }), 'Vercel function');
  assert.equal(actualImageRoute({ ...sample, execution: undefined, source: 'cloud' }), 'Cloud (reported by optional adapter)');
  assert.equal(actualImageRoute(), 'No computed result selected');
});
