import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { IDBFactory } from 'fake-indexeddb';
import { createPhotoStore } from './photo-store.ts';
import type { PhotoRecord, PhotoReview } from './photo-store.ts';
import type { ImageAnalysis } from './image-analysis.ts';
import { currentReference, makePhotoReference } from './photo-reference.ts';
import type { PhotoReferenceInput } from './photo-reference.ts';
import { photoValidation, photoValidationAudit, photoValidationCsv } from './photo-validation.ts';
import { photoCsv } from './photo-export.ts';

const blob = new Blob(['test fixture only'], { type: 'image/png' });
const base = (id: string): PhotoRecord => ({ id, name: id + '.png', container: 'C1', locationId: 'MEL', capturedOn: '2026-11-27', createdAt: '2026-11-27T00:00:00Z', kind: 'bead_proxy', sha256: createHash('sha256').update(id).digest('hex'), mimeType: blob.type, size: blob.size, width: 32, height: 32, provenance: 'user_upload', locationProvenance: 'mock', analyses: [], reviews: [] });
const input = (count: number | null, unitRef = 'setup-A'): PhotoReferenceInput => ({ count, unitRef, evidence: 'prepared_beads', method: 'Independent fixture count — test only', reviewer: 'Fixture reviewer', independent: count !== null, blinding: 'yes', excluded: false, exclusionReason: '', amendmentReason: '' });
const analysis = (record: PhotoRecord, count: number | null, id = 'analysis-1'): ImageAnalysis => ({ id, imageSha256: record.sha256, count, countable: count !== null, qualityWarnings: [], explanation: 'Test fixture only', model: 'test-counter', source: 'device', execution: 'browser-worker', engine: 'bead_cv', requestedMode: 'local', promptVersion: 'test-v1', elapsedMs: 1, createdAt: '2026-11-27T00:02:00Z', routingNote: 'Unit test; no field photo', rawResponse: '{}' });
function paired(id: string, estimate: number | null, reference: number | null, unit = 'setup-A') {
  const record = base(id);
  record.references = [makePhotoReference(record, input(reference, unit), 'ref-' + id, '2026-11-27T00:01:00Z')];
  record.analyses = [analysis(record, estimate)];
  return record;
}

test('photo errors use original estimates with missing, excluded, duplicate and repeated-unit accounting', () => {
  const a = paired('a', 12, 10), b = paired('b', 8, 10), c = paired('c', 20, 10, 'setup-B'), d = paired('d', null, 5, 'setup-C'), e = paired('e', 0, 20);
  e.references![0] = { ...e.references![0], excluded: true, exclusionReason: 'Declared image quality exclusion' };
  const duplicate = { ...a, id: 'z-duplicate' };
  a.reviews = [{ id: 'review', analysisId: a.analyses[0].id, status: 'reviewed', count: 10, note: 'Human correction', reviewer: 'Operator', createdAt: '2026-11-27T00:03:00Z' }];
  const report = photoValidation([duplicate, e, d, c, b, a]);
  assert.equal(report.summary.observations, 6); assert.equal(report.summary.excluded, 2); assert.equal(report.summary.missingPairs, 1);
  assert.equal(report.summary.validPairs, 3); assert.equal(report.summary.units, 2);
  assert.equal(report.summary.mae, 14 / 3); assert.equal(report.summary.bias, 10 / 3); assert.equal(report.summary.maximumError, 10); assert.equal(report.summary.unitBalancedMae, 6);
  assert.equal(report.rows.find(row => row.recordId === a.id)!.pair.estimate, 12);
  assert.equal(report.rows.find(row => row.recordId === duplicate.id)!.duplicateOf, 'a');
});
test('empty, generated, unclassified and known generated-copy inputs never establish prepared-photo accuracy', () => {
  assert.equal(photoValidation([]).summary.mae, null);
  const generated = { ...base('generated'), provenance: 'generated_proxy' as const, referenceCount: 8 };
  const copy = paired('copy', 8, 8); copy.sha256 = generated.sha256; copy.analyses[0].imageSha256 = generated.sha256; copy.references![0].imageSha256 = generated.sha256;
  const report = photoValidation([generated, base('unclassified'), copy]);
  assert.equal(report.summary.validPairs, 0); assert.equal(report.summary.mae, null); assert.equal(report.inventory.awaitingReference, 1);
  assert.ok(report.rows.some(row => row.status === 'known_generated_bytes_not_prepared_photo'));
  assert.throws(() => makePhotoReference(generated, input(8), 'r', new Date().toISOString()), /Generated examples/);
});
test('uploaded test images and biological manual observations remain outside prepared-bead metrics', () => {
  const diagnostic = paired('test-only', 8, 10); diagnostic.references![0].evidence = 'synthetic_test';
  const biological = { ...base('biological'), kind: 'larvae' as const };
  biological.references = [makePhotoReference(biological, { ...input(5), evidence: 'biological_photo' }, 'bio-ref', new Date().toISOString())];
  assert.equal(photoValidation([diagnostic, biological]).summary.validPairs, 0);
  const tests = photoValidation([diagnostic, biological], 'synthetic_test'); assert.equal(tests.summary.mae, 2); assert.match(tests.checks.join(' '), /diagnostic fixtures/);
  assert.throws(() => makePhotoReference(biological, input(5), 'wrong', new Date().toISOString()), /must match/);
});
test('zero and unknown references differ; counts and independent declarations require explicit provenance', () => {
  assert.equal(makePhotoReference(base('zero'), input(0), 'r', new Date().toISOString()).count, 0);
  assert.equal(makePhotoReference(base('unknown'), input(null), 'r', new Date().toISOString()).count, null);
  for (const count of [-1, 0.5, Infinity, 100001]) assert.throws(() => makePhotoReference(base('bad'), input(count), 'r', new Date().toISOString()), /whole number/);
  assert.throws(() => makePhotoReference(base('bad'), { ...input(1), reviewer: '' }, 'r', new Date().toISOString()), /method and/);
  assert.throws(() => makePhotoReference(base('bad'), { ...input(null), independent: true }, 'r', new Date().toISOString()), /needs a count/);
  assert.throws(() => makePhotoReference(base('bad'), { ...input(1), excluded: true }, 'r', new Date().toISOString()), /needs a reason/);
  assert.equal(makePhotoReference(base('included'), { ...input(1), exclusionReason: 'Inactive old reason' }, 'r', new Date().toISOString()).exclusionReason, '');
});
test('independence, blinding and post-estimate reference timing remain visible qualifications', () => {
  const r = paired('qualifications', 8, 10);
  r.references = [makePhotoReference(r, { ...input(10), independent: false, blinding: 'unknown', amendmentReason: 'Record revised method declaration' }, 'new-ref', new Date().toISOString())];
  const report = photoValidation([r]);
  assert.equal(report.summary.mae, 2); assert.match(report.checks.join(' '), /independence is not confirmed/); assert.match(report.checks.join(' '), /blinding is not confirmed/); assert.match(report.checks.join(' '), /after a computed estimate/);
});
test('different method/settings groups are reported separately while matching cloud/worker methods may share a group', () => {
  const a = paired('a', 12, 10), b = paired('b', 8, 10);
  b.analyses[0].source = 'cloud'; b.analyses[0].execution = 'vercel-function';
  assert.equal(photoValidation([a, b]).methods.length, 1);
  b.analyses[0].promptVersion = 'different-settings-version';
  const report = photoValidation([a, b]); assert.equal(report.methods.length, 2); assert.equal(report.summary.mae, null);
  assert.deepEqual(report.methods.map(method => method.summary.mae), [2, 2]);
});
test('latest computed run is used and a wrong-image result cannot supply a metric', () => {
  const record = paired('latest', 12, 10); record.analyses.push(analysis(record, 20, 'new-run'));
  assert.equal(photoValidation([record]).summary.mae, 10);
  assert.match(photoValidation([record]).checks.join(' '), /latest run is used, not the best/);
  record.analyses[1].imageSha256 = 'b'.repeat(64);
  assert.equal(photoValidation([record]).summary.validPairs, 0); assert.equal(photoValidation([record]).summary.missingPairs, 1);
});
test('reference amendments preserve history across reopening and reject stale concurrent edits', async () => {
  const factory = new IDBFactory(), store = createPhotoStore(factory, 'references-test'), r = base('persist');
  await store.add(r, blob); let saved = await store.appendReference(r.id, null, input(0));
  const first = currentReference(saved)!; assert.equal(first.recordedAfterAnalysis, false);
  await store.appendAnalysis(r.id, analysis(r, 8));
  await assert.rejects(store.appendReference(r.id, null, input(8)), /another tab/);
  await assert.rejects(store.appendReference(r.id, first.id, input(8)), /amendment/);
  saved = await store.appendReference(r.id, first.id, { ...input(1), amendmentReason: 'Recounted the original image' });
  assert.equal(saved.references!.length, 2); assert.equal(saved.references![0].count, 0); assert.equal(currentReference(saved)!.recordedAfterAnalysis, true);
  await store.close(); const reopened = createPhotoStore(factory, 'references-test');
  assert.equal((await reopened.list())[0].references!.length, 2); await reopened.close();
});
test('new imports cannot seed a fabricated reference history', async () => {
  const store = createPhotoStore(new IDBFactory(), 'no-seeded-references');
  const record = base('seeded'); record.references = [makePhotoReference(record, input(1), 'fake-history', new Date().toISOString())];
  await assert.rejects(store.add(record, blob), /failed validation/); await store.close();
});
test('validation exports retain paired provenance and frozen histories while escaping spreadsheet formula text', () => {
  const record = paired('exported', 8, 10); record.name = '=SUM(A1)';
  const csv = photoValidationCsv([record], 'prepared_beads'); assert.ok(csv.includes('"\'=SUM(A1)"')); assert.match(csv, /separate_reference_count/);
  const audit = photoValidationAudit([record], 'prepared_beads'); record.references![0].count = 7;
  const frozen = JSON.parse(audit); assert.equal(frozen.summary.mae, 2); assert.equal(frozen.records[0].references[0].count, 10); assert.equal('blob' in frozen.records[0], false);
  assert.match(photoCsv([record]), /separate_reference_id/); assert.match(photoCsv([record]), /prepared_beads/);
});
