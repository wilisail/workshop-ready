import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPrompt, parseOrganizedNotes, resolveSource } from './notes.ts';

test('unknown execution source is never presented as on-device', () => {
  assert.throws(() => resolveSource(undefined, 'hybrid'), /did not identify/);
});
test('local-only rejects a cloud response', () => {
  assert.throws(() => resolveSource('IN_CLOUD', 'local'), /rejected/);
});
test('hybrid reports the actual cloud fallback or device source', () => {
  assert.equal(resolveSource('in_cloud', 'hybrid'), 'cloud');
  assert.equal(resolveSource('on_device', 'hybrid'), 'device');
});
test('malformed model responses and missing sections fail visibly', () => {
  assert.throws(() => parseOrganizedNotes('Here is your answer'), /readable sections/);
  assert.throws(() => parseOrganizedNotes('{"ready":["done"],"blocked":[]}'), /incomplete/);
  assert.throws(() => parseOrganizedNotes('{"ready":[1],"blocked":[],"nextActions":[]}'), /invalid/);
});
test('valid empty sections and fenced JSON are accepted', () => {
  assert.deepEqual(parseOrganizedNotes('```json\n{"ready":[],"blocked":[],"nextActions":[]}\n```'), { ready: [], blocked: [], nextActions: [] });
});
test('oversized inputs are blocked before an inference request', () => {
  assert.throws(() => buildPrompt('x'.repeat(12001)), /12,000/);
});
