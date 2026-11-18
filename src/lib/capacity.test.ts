import test from 'node:test';
import assert from 'node:assert/strict';
import { planRoute } from './capacity.ts';

test('cloud-only never prepares the browser model even when it is available', () => {
  assert.deepEqual(planRoute('cloud', 'available', true), { mode: 'cloud', prepareDevice: false, explanation: 'Cloud-only was selected. No local model was initialized.' });
});
test('local-only never sends an unsupported request to cloud', () => {
  for (const state of ['unavailable', 'unknown'] as const) assert.throws(() => planRoute('local', state, true), /No cloud request/);
});
test('hybrid immediately chooses cloud when local is unavailable, unknown, or downloading', () => {
  for (const state of ['unavailable', 'unknown', 'downloading', 'downloadable'] as const) {
    const route = planRoute('hybrid', state, true);
    assert.equal(route.mode, 'cloud');
    assert.equal(route.prepareDevice, false);
  }
});
test('an offline user with a downloaded model can use either preference without cloud', () => {
  for (const mode of ['hybrid', 'cloud-first'] as const) assert.equal(planRoute(mode, 'available', false).mode, 'local');
});
test('offline and unavailable never becomes a cloud attempt', () => {
  for (const mode of ['cloud', 'hybrid', 'cloud-first', 'local'] as const) assert.throws(() => planRoute(mode, 'unavailable', false));
});
test('cloud-first preserves the requested fallback policy when the device model is ready', () => {
  const route = planRoute('cloud-first', 'available', true);
  assert.equal(route.mode, 'cloud-first');
  assert.equal(route.prepareDevice, true);
});
test('only an explicit local-only request may initiate an undownloaded local model', () => {
  assert.equal(planRoute('local', 'downloadable', true).prepareDevice, true);
  assert.equal(planRoute('hybrid', 'downloadable', true).prepareDevice, false);
  assert.equal(planRoute('cloud-first', 'downloadable', true).prepareDevice, false);
});
test('local preparation requires internet until the model is downloaded', () => {
  assert.throws(() => planRoute('local', 'downloadable', false), /undownloaded/);
});
