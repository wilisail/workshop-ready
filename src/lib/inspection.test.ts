import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { currentQA, sampleQARecords, validateQARecord } from './qa-records.ts';
import type { QARecord, QAPayload } from './qa-records.ts';
import { appendInspectionDecision, buildInspectionItems, currentInspectionDecision, inspectionAudit, inspectionCsv, inspectionReport, inspectionSourceChanges, makeInspectionPlan, sourceFromStudy, validateInspectionConfig, validateInspectionPlan, visibleInspectionData } from './inspection.ts';
import type { InspectionConfig, InspectionDecision, InspectionItem, InspectionSource } from './inspection.ts';
import { createInspectionStore } from './inspection-store.ts';
import { appendPredictionRun, captureStudyDataset, currentDataset, defaultPlan, latestPlan, makeStudy, recordStudyPlan, reviseStudyPlan } from './studies.ts';
import { makePredictionExampleStudy } from './prediction-example.ts';
const now = '2026-11-21T12:00:00Z', later = '2026-11-21T12:01:00Z';
const config = (): InspectionConfig => ({ asOf: '2026-11-21', maxAgeDays: 7, capacity: 1, requireStageCounts: false, requireWaterTemperature: false, requireEmergence: false });
const source = (): InspectionSource => ({ kind: 'qa_store', origin: 'synthetic_demo', records: sampleQARecords(now) });
const example = () => makeInspectionPlan({ id: 'inspection-one', title: 'Synthetic inspection plan', createdAt: now, source: source(), config: config() });
function record(id: string, patch: Partial<QAPayload> = {}): QARecord {
  const base = currentQA(sampleQARecords(now)[0]).data;
  return validateQARecord({ schemaVersion: 1, id, createdAt: now, revisions: [{ number: 1, savedAt: now, reason: 'Test record', data: { ...base, ...patch } }] });
}
const healthy = (patch: Partial<QAPayload> = {}) => record('healthy', { outcome: 'satisfactory', assessedOn: '2026-11-18', assessor: 'Test assessor', protocolReference: 'Test protocol', temperatureBasis: 'weather', temperatureC: 29, temperatureSource: 'Test weather', larvae: null, pupae: null, ...patch });
const decision = (plan = example(), patch: Partial<Omit<InspectionDecision, 'number'>> = {}): Omit<InspectionDecision, 'number'> => ({ id: 'decision-one', savedAt: later, itemId: plan.items[0].id, action: 'accept', reviewer: 'Reviewer label', reason: 'Confirm the recorded condition under the local protocol.', assignee: 'Inspector label', dueOn: '2026-11-22', ...patch });

test('condition and assessed QA evidence determine priority; capacity limits suggestions without dropping candidates', () => {
  const plan = example(); assert.equal(plan.items.length, 3); assert.equal(plan.items[0].container, 'DEMO-QA-02');
  assert.equal(plan.items[0].priority, 'review_first'); assert.equal(plan.items.filter(i => i.suggested).length, 1);
  assert.deepEqual(plan.items.slice(1).map(i => i.priority), ['complete_record', 'complete_record']);
  assert.ok(plan.items[0].reasons.some(r => r.includes('condition'))); assert.ok(plan.items[0].reasons.some(r => r.includes('labelled failed')));
  const zero = buildInspectionItems(plan.source, { ...plan.config, capacity: 0 }); assert.equal(zero.items.length, 3); assert.equal(zero.items.filter(i => i.suggested).length, 0);
});
test('later observations and later outcomes are not used for an earlier planning date', () => {
  const data = currentQA(healthy()).data;
  const masked = visibleInspectionData({ ...data, outcome: 'failed', emergenceBasis: 'measured', emergedAdults: 0, emergenceOn: '2026-11-18', emergenceMethod: 'Test direct count' }, '2026-11-17');
  assert.equal(masked.outcome, 'not_assessed'); assert.equal(masked.emergenceBasis, 'not_assessed'); assert.equal(masked.emergedAdults, null);
  const plan = makeInspectionPlan({ id: 'earlier', title: 'Earlier date', createdAt: now, source: { kind: 'qa_store', origin: 'synthetic_demo', records: [healthy({ outcome: 'failed' })] }, config: { ...config(), asOf: '2026-11-17' } });
  assert.equal(plan.items[0].priority, 'complete_record'); assert.ok(!plan.items[0].reasons.some(r => r.includes('labelled failed')));
  const future = makeInspectionPlan({ id: 'future', title: 'Earlier date', createdAt: now, source: source(), config: { ...config(), asOf: '2026-11-16' } });
  assert.equal(future.items.length, 0); assert.equal(future.excluded.length, 3);
});
test('optional measurement gaps do not create universal field requirements', () => {
  const s: InspectionSource = { kind: 'qa_store', origin: 'synthetic_demo', records: [healthy()] };
  const normal = buildInspectionItems(s, config()).items[0]; assert.equal(normal.priority, 'routine'); assert.ok(normal.gaps.includes('No container-water temperature')); assert.ok(normal.gaps.includes('Emergence not assessed'));
  for (const flag of ['requireStageCounts', 'requireWaterTemperature', 'requireEmergence'] as const) {
    const required: InspectionItem = buildInspectionItems(s, { ...config(), [flag]: true }).items[0]; assert.equal(required.priority, 'complete_record'); assert.ok(required.reasons.some(r => r.includes('selected project checks')));
  }
});
test('latest-date evidence replaces earlier reasons while all related input records remain retained', () => {
  const old = healthy({ outcome: 'failed' }), next = record('newer', { ...currentQA(healthy()).data, observedOn: '2026-11-19', assessedOn: '2026-11-20' });
  const s: InspectionSource = { kind: 'qa_store', origin: 'synthetic_demo', records: [old, next] };
  const item = buildInspectionItems(s, config()).items[0]; assert.equal(item.latestOn, '2026-11-19'); assert.equal(item.priority, 'routine'); assert.deepEqual(item.evidence.map(e => e.recordId), ['newer']); assert.equal(item.relatedRecordIds.length, 2);
  const tie = buildInspectionItems({ ...s, records: [old, { ...old, id: 'same-day' }] }, config()).items[0];
  assert.equal(tie.priority, 'review_first'); assert.equal(tie.evidence.length, 2); assert.ok(tie.reasons.some(r => r.includes('latest calendar date')));
});
test('age thresholds, stable ordering and configuration limits are explicit workflow settings', () => {
  const s: InspectionSource = { kind: 'qa_store', origin: 'synthetic_demo', records: [healthy()] };
  assert.equal(buildInspectionItems(s, { ...config(), maxAgeDays: 3 }).items[0].priority, 'complete_record');
  assert.equal(buildInspectionItems(s, { ...config(), maxAgeDays: null }).items[0].priority, 'routine');
  for (const patch of [{ asOf: '2026-02-31' }, { capacity: -1 }, { capacity: 1.5 }, { capacity: 501 }, { maxAgeDays: 0 }, { requireEmergence: 'yes' }]) assert.throws(() => validateInspectionConfig({ ...config(), ...patch }));
  const one = buildInspectionItems(source(), config()), reversed = source(); if (reversed.kind === 'qa_store') reversed.records.reverse();
  assert.deepEqual(one.items, buildInspectionItems(reversed, config()).items);
});
test('origins, pinned revisions and stored reasons cannot be silently relabelled or overwritten', () => {
  const input = source(); if (input.kind !== 'qa_store') throw new Error();
  const plan = makeInspectionPlan({ id: 'pinned', title: 'Pinned inputs', createdAt: now, source: input, config: config() });
  input.records[0].revisions[0].data.larvae = 999; assert.equal(currentQA((plan.source as typeof input).records[0]).data.larvae, 12);
  const mixed = source(); if (mixed.kind !== 'qa_store') throw new Error(); currentQA(mixed.records[0]).data.origin = 'field_observation';
  assert.throws(() => makeInspectionPlan({ id: 'mixed', title: 'Mixed', createdAt: now, source: mixed, config: config() }), /cannot be pooled/);
  assert.throws(() => validateInspectionPlan({ ...plan, items: [{ ...plan.items[0], suggested: false }, ...plan.items.slice(1)] }), /pinned evidence/);
  assert.equal(validateInspectionPlan(plan).algorithmVersion, 'inspection-review-v1');
});
test('accept, defer and dismiss need explicit attribution, reasons and appropriate dates', () => {
  const p = example();
  for (const patch of [{ reviewer: '' }, { reason: '' }, { assignee: '' }, { dueOn: null }, { dueOn: '2026-02-31' }, { dueOn: '2026-11-20' }, { itemId: 'unknown' }]) assert.throws(() => appendInspectionDecision(p, decision(p, patch)));
  assert.throws(() => appendInspectionDecision(p, decision(p, { action: 'defer', assignee: '', dueOn: null })), /next-review date/);
  const deferred = appendInspectionDecision(p, decision(p, { action: 'defer', assignee: '' })); assert.equal(currentInspectionDecision(deferred, p.items[0].id)?.action, 'defer');
  assert.throws(() => appendInspectionDecision(p, decision(p, { action: 'dismiss' })), /must not retain/);
  const dismissed = appendInspectionDecision(p, decision(p, { action: 'dismiss', assignee: '', dueOn: null })); assert.equal(currentInspectionDecision(dismissed, p.items[0].id)?.action, 'dismiss');
});
test('decision changes append history and regenerating requires fresh human decisions', () => {
  const original = example(), accepted = appendInspectionDecision(original, decision(original));
  const deferred = appendInspectionDecision(accepted, decision(accepted, { id: 'decision-two', action: 'defer', assignee: '', reason: 'Wait for the protocol reviewer.' }));
  assert.equal(original.decisions.length, 0); assert.equal(accepted.decisions.length, 1); assert.equal(deferred.decisions.length, 2); assert.equal(deferred.sequence, 3);
  assert.equal(currentInspectionDecision(deferred, original.items[0].id)?.reason, 'Wait for the protocol reviewer.');
  const regenerated = makeInspectionPlan({ id: 'new-plan', title: original.title, createdAt: later, source: source(), config: config(), replacesPlanId: original.id });
  assert.equal(regenerated.replacesPlanId, original.id); assert.equal(regenerated.decisions.length, 0);
  assert.throws(() => appendInspectionDecision(accepted, decision(accepted)), /already exists/);
});
test('new/revised QA evidence invalidates the source freshness without changing saved decisions', () => {
  const p = appendInspectionDecision(example(), decision()), qa = sampleQARecords(now);
  assert.deepEqual(inspectionSourceChanges(p.source, qa, []), []);
  qa[0].revisions.push({ number: 2, savedAt: later, reason: 'Correct count', data: { ...currentQA(qa[0]).data, larvae: 10 } });
  assert.ok(inspectionSourceChanges(p.source, qa, []).some(c => c.includes('revised'))); assert.equal(p.decisions.length, 1);
  assert.ok(inspectionSourceChanges(p.source, [...qa, record('added')], []).some(c => c.includes('added or removed')));
});
test('study/model snapshots support context without affecting the rule-based ranking', () => {
  const study = appendPredictionRun(makePredictionExampleStudy('study', now), 'model', now), s = sourceFromStudy(study);
  if (s.kind !== 'study') throw new Error();
  const withModel = makeInspectionPlan({ id: 'with-model', title: 'With context', createdAt: now, source: s, config: config() });
  const withoutModel = makeInspectionPlan({ id: 'without-model', title: 'Without context', createdAt: now, source: { ...s, model: null }, config: config() });
  assert.deepEqual(withModel.items, withoutModel.items); assert.equal(withModel.items.length, 52);
  assert.deepEqual(inspectionSourceChanges(s, [], [study]), []);
  const rerun = appendPredictionRun(study, 'new-model', later); assert.ok(inspectionSourceChanges(s, [], [rerun]).some(c => c.includes('model run changed')));
  const amended = reviseStudyPlan(study, { ...latestPlan(study).data, title: 'Changed' }, 'Clarify wording', later); assert.ok(inspectionSourceChanges(s, [], [amended]).some(c => c.includes('plan version')));
});
test('a study backed by QA-store observations also reports underlying source revisions', () => {
  let study = recordStudyPlan(makeStudy({ ...defaultPlan('prediction'), samplingRationale: 'Synthetic demonstration.' }, 'qa-study', now), now);
  const qa = sampleQARecords(now); study = captureStudyDataset(study, { id: 'qa-snapshot', capturedAt: now, planRevision: latestPlan(study).number, notes: '', pairs: [], qaRecords: qa });
  const s = sourceFromStudy(study); assert.deepEqual(inspectionSourceChanges(s, qa, [study]), []);
  qa[0].revisions.push({ number: 2, savedAt: later, reason: 'Changed', data: { ...currentQA(qa[0]).data, larvae: 8 } });
  assert.ok(inspectionSourceChanges(s, qa, [study]).some(c => c.includes('Recapture')));
});
test('exports retain rule versions, full evidence, decisions and formula-safe text', () => {
  let p = example(); p = appendInspectionDecision(p, decision(p, { reviewer: '=FORMULA', assignee: '@LABEL' }));
  const csv = inspectionCsv(p), report = inspectionReport(p), audit = JSON.parse(inspectionAudit(p));
  assert.ok(csv.includes("'=FORMULA")); assert.ok(csv.includes("'@LABEL")); assert.ok(csv.includes('qa-demo-2@1'));
  for (const phrase of ['inspection-review-v1', 'Pending', 'reviewer', 'Synthetic demonstration']) assert.ok(report.toLowerCase().includes(phrase.toLowerCase()), phrase);
  assert.equal(audit.plan.source.records.length, 3); assert.equal(audit.plan.decisions[0].action, 'accept'); assert.equal(audit.plan.items[0].evidence[0].revision, 1); assert.equal('imageBytes' in audit, false);
  const s = appendPredictionRun(makePredictionExampleStudy('study-report', now), 'model-report', now);
  const modelPlan = makeInspectionPlan({ id: 'context-report', title: 'Context', createdAt: now, source: sourceFromStudy(s), config: config() });
  assert.ok(inspectionReport(modelPlan).includes('found 0/3')); assert.ok(inspectionReport(modelPlan).includes('Not used to rank'));
});
test('inspection decisions persist through reopening and reject stale concurrent writes atomically', async () => {
  const factory = new IDBFactory(), first = createInspectionStore(factory, 'inspection-store-test'), second = createInspectionStore(factory, 'inspection-store-test');
  const p = example(); await first.add(p); const { id, savedAt, ...input } = decision(p);
  const accepted = await first.decide(p.id, 1, input); assert.equal(accepted.sequence, 2);
  await assert.rejects(second.decide(p.id, 1, { ...input, action: 'dismiss', assignee: '', dueOn: null }), /another tab/);
  await first.close(); await second.close(); const reopened = createInspectionStore(factory, 'inspection-store-test');
  assert.deepEqual((await reopened.list())[0], accepted); await reopened.close();
});
