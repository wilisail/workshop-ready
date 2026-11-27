import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOfflineReply, queryOfflineWorker } from './offline.ts';
import { executeCounterRoute } from './counter-routing.ts';

const build = 'abcdef123456';
const complete = { schema: 'offline-assets-v1', build, assetCount: 10, missingCount: 0, workerReady: true };

test('offline readiness needs every asset and the counting worker for the current app version', () => {
  assert.equal(parseOfflineReply(complete, build).phase, 'ready');
  assert.equal(parseOfflineReply({ ...complete, missingCount: 1 }, build).phase, 'missing');
  assert.equal(parseOfflineReply({ ...complete, workerReady: false }, build).phase, 'missing');
  assert.equal(parseOfflineReply(complete, '123456abcdef').phase, 'outdated');
});
test('invalid or partial worker evidence cannot become a prepared state', () => {
  for (const value of [null, {}, { ...complete, assetCount: 0 }, { ...complete, missingCount: -1 },
    { ...complete, missingCount: 11 }, { ...complete, missingCount: 0.5 }, { ...complete, build: 'old' },
    { ...complete, workerReady: undefined }, { schema: 'offline-assets-error-v1', build }]) {
    assert.equal(parseOfflineReply(value, build).phase, 'unavailable');
  }
});
test('the preparation message contains only an app build identifier and repair choice', async () => {
  const worker = { postMessage(message: unknown, ports: Transferable[]) {
    assert.deepEqual(message, { schema: 'offline-assets-request-v1', expectedBuild: build, prepare: true });
    const port = ports[0] as MessagePort;
    port.postMessage(complete);
  } };
  const result = await queryOfflineWorker(worker as Pick<ServiceWorker, 'postMessage'>, build, true, new AbortController().signal);
  assert.equal(result.phase, 'ready');
});
test('a worker with no response times out without claiming readiness', async () => {
  const result = await queryOfflineWorker({ postMessage() {} }, build, false, new AbortController().signal, 5);
  assert.equal(result.phase, 'unavailable');
});
test('cancelled checks reject and do not send a later preparation message', async () => {
  const controller = new AbortController();
  const pending = queryOfflineWorker({ postMessage() {} }, build, false, controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  let requested = false;
  await assert.rejects(queryOfflineWorker({ postMessage() { requested = true; } }, build, true, controller.signal));
  assert.equal(requested, false);
});
test('a detached or rejected worker port stays unverified', async () => {
  const result = await queryOfflineWorker({ postMessage() { throw new Error('Detached'); } }, build, false, new AbortController().signal);
  assert.equal(result.phase, 'unavailable');
});
test('cloud-first while offline reports local fallback and makes no service request', async () => {
  let uploads = 0;
  const result = await executeCounterRoute('cloud-first', false, true, async () => { uploads++; return 'cloud'; }, async () => 'local', new AbortController().signal);
  assert.equal(result.used, 'device');
  assert.equal(result.fallback, true);
  assert.equal(uploads, 0);
});
