import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { currentQA, sampleQARecords } from './qa-records.ts';
import { appendPredictionRun, appendStudyReview, captureStudyDataset, currentDataset, currentPredictionRun, currentStudyReview, defaultPlan, latestPlan, makeExampleStudy, makeStudy, recordStudyPlan, reviseStudyPlan, studyAudit, studyDatasetStale, studyReport, validateStudy } from './studies.ts';
import { classificationMetrics, evaluatePrediction, featureValues, fitLogistic, fitPreprocessing, logisticScore, MODEL_PROTOCOL, MODEL_VERSION, preparePrediction, sigmoid, transformFeatures, validatePredictionRun, wilson } from './prediction.ts';
import type { PredictionRow } from './prediction.ts';
import { makePredictionExampleStudy, predictionExampleRecords } from './prediction-example.ts';
import { createStudyStore } from './study-store.ts';
const now = '2026-11-21T09:00:00Z';
const example = () => makePredictionExampleStudy('model-study', now);
const evaluated = () => appendPredictionRun(example(), 'model-run', now);
const near = (a: number, b: number, tolerance = 1e-12) => assert.ok(Math.abs(a - b) <= tolerance, `${a} != ${b}`);

test('only pre-outcome allow-listed features enter the model, with explicit unknowns and observed zeros', () => {
  const d = currentQA(predictionExampleRecords(now)[2]).data, original = featureValues(d);
  assert.deepEqual(featureValues({ ...d, emergedAdults: 999, emergenceBasis: 'measured', outcome: d.outcome === 'failed' ? 'satisfactory' : 'failed', assessor: 'Other label', notes: 'Later outcome', pupalSkins: 555, deadAdults: 111, location: 'Other site', container: 'Different ID' }), original);
  assert.equal(featureValues({ ...d, temperatureBasis: 'weather', temperatureC: 30 })[1], null);
  assert.equal(featureValues({ ...d, temperatureBasis: 'water', temperatureC: 0 })[1], 0);
  assert.equal(featureValues({ ...d, temperatureC: 1e308 })[1], null);
  assert.equal(featureValues({ ...d, larvae: 0, initialEggs: 100 })[2], 0);
  for (const initialEggs of [null, 0]) assert.equal(featureValues({ ...d, initialEggs })[2], null);
  assert.equal(featureValues({ ...d, larvae: 101, initialEggs: 100 })[2], null);
});
test('the fixture has exhaustive disjoint partitions, repeated-unit exclusions and a chronological embargo', () => {
  const records = predictionExampleRecords(now), split = preparePrediction(records, 'container');
  assert.equal(records.length, 100); assert.equal(split.eligibleGroups, 48); assert.equal(split.train.length, 35); assert.equal(split.test.length, 10); assert.equal(split.excluded.length, 55); assert.equal(split.cutoff, '2026-10-09');
  const ids = [...split.train, ...split.test, ...split.excluded].map(r => r.recordId);
  assert.equal(new Set(ids).size, 100); assert.deepEqual([...ids].sort(), records.map(r => r.id).sort());
  const trainGroups = new Set(split.train.map(r => r.group));
  assert.ok(split.test.every(r => !trainGroups.has(r.group)));
  assert.ok(split.train.every(r => r.assessedOn < split.cutoff!));
  assert.ok(split.test.every(r => r.observedOn >= split.cutoff!));
  assert.ok([...split.train, ...split.test].every(r => r.recordId.endsWith('-0')));
  assert.equal(split.excluded.filter(e => e.reason.includes('chronological embargo')).length, 3);
});
test('same-day outcomes, unknown conditions and unresolved QA labels cannot enter training or testing', () => {
  const split = preparePrediction(predictionExampleRecords(now), 'container');
  for (let i = 0; i < 4; i++) assert.ok(split.excluded.some(e => e.recordId === 'ml-fixture-excluded-' + i));
  assert.ok([...split.train, ...split.test].every(r => r.assessedOn > r.observedOn));
});
test('physical containers stay grouped across batch cycles and site grouping is conservative', () => {
  const records = predictionExampleRecords(now);
  records[1].revisions[0].data.batch = 'Another cycle';
  const cycles = preparePrediction(records, 'container_batch');
  assert.equal(cycles.eligibleGroups, 48); assert.equal(cycles.train.length, 35);
  const sites = preparePrediction(records, 'site'); assert.equal(sites.eligibleGroups, 6);
  assert.equal(new Set([...sites.train, ...sites.test].map(r => r.group)).size, sites.train.length + sites.test.length);
});
test('preprocessing matches hand-calculated training means, deviations and missingness indicators', () => {
  const template = preparePrediction(predictionExampleRecords(now), 'container').train[0];
  const rows = [2, 4, null].map(value => ({ ...template, features: [value, null, 0, null, .2, 0] }));
  const p = fitPreprocessing(rows); near(p.means[0], 3); near(p.scales[0], Math.sqrt(2 / 3));
  assert.equal(p.means[1], 0); assert.equal(p.scales[1], 1); assert.equal(p.minimums[1], null);
  const transformed = transformFeatures([null, null, 0, null, .2, 0], p);
  assert.equal(transformed[0], 0); assert.equal(transformed[6], 1); assert.equal(transformed[8], 0);
  assert.equal(transformFeatures([1e6, null, 0, null, .2, 0], p)[0], 12);
});
test('training genuinely reduces its objective and is deterministic without fixture-result substitution', () => {
  const one = currentPredictionRun(evaluated())!, two = currentPredictionRun(evaluated())!;
  assert.equal(one.status, 'evaluated'); assert.ok(one.model!.finalLoss < one.model!.initialLoss);
  assert.equal(one.model!.weights.length, 12); assert.ok(one.model!.weights.some(w => w !== 0));
  assert.deepEqual(one.model, two.model); assert.deepEqual(one.predictions, two.predictions);
  assert.equal(one.metrics!.model.n, 10); assert.equal(one.metrics!.baseline.n, 10); assert.equal(one.metrics!.prevalence.n, 10);
  assert.equal(one.algorithmVersion, MODEL_VERSION); assert.equal(one.protocol.threshold, .5);
  // The honest fixture comparison need not beat a baseline or catch every failure.
  assert.equal(one.metrics!.model.fn, 3); assert.equal(one.metrics!.model.tp, 0);
});
test('changing held-out labels and input magnitudes cannot affect training or its preprocessing', () => {
  const s = example(), p = latestPlan(s), d = currentDataset(s)!, original = evaluatePrediction(p, d, 'original', now);
  const testContainers = new Set(original.split.test.map(r => r.container));
  const altered = structuredClone(d);
  for (const record of altered.qaRecords) {
    const data = currentQA(record).data;
    if (testContainers.has(data.container)) { data.outcome = data.outcome === 'failed' ? 'satisfactory' : 'failed'; data.temperatureBasis = 'water'; data.temperatureSource = 'Test-only value'; data.temperatureC = 500; }
  }
  const rerun = evaluatePrediction(p, altered, 'altered', now);
  assert.deepEqual(rerun.model, original.model); assert.deepEqual(rerun.split.train, original.split.train);
  assert.notDeepEqual(rerun.predictions.map(r => r.target), original.predictions.map(r => r.target));
  assert.ok(rerun.predictions.some(r => r.outsideTrainingRange.includes('waterTemperatureC')));
});
test('metrics agree with published Brier example and hand-calculated confusion counts, without invented denominators', () => {
  const m = classificationMetrics([0, 1, 1, 0], [.1, .9, .8, .4]); near(m.brier!, .055); assert.equal(m.tp, 2); assert.equal(m.tn, 2); assert.equal(m.accuracy, 1);
  const partial = classificationMetrics([1, 0], [.2, .2]); assert.equal(partial.fn, 1); assert.equal(partial.tn, 1); assert.equal(partial.sensitivity, 0); assert.equal(partial.precision, null);
  const absent = classificationMetrics([], []); assert.equal(absent.accuracy, null); assert.equal(absent.brier, null); assert.equal(absent.sensitivityInterval, null);
  assert.throws(() => classificationMetrics([1], [NaN])); assert.throws(() => classificationMetrics([1], [2])); assert.throws(() => classificationMetrics([1], []));
});
test('Wilson intervals have correct finite-sample boundaries and remain unknown without observations', () => {
  const [lower, upper] = wilson(6, 10)!; near(lower, .31267376973365824); near(upper, .8318196702937638);
  near(wilson(0, 3)![0], 0); near(wilson(0, 3)![1], .5614970317550455);
  near(wilson(3, 3)![1], 1); assert.equal(wilson(0, 0), null);
});
test('a sparse, one-class or bead-proxy snapshot returns an insufficient-data result rather than a model', () => {
  const study = recordStudyPlan(makeStudy({ ...defaultPlan('prediction'), samplingRationale: 'Pilot only.' }, 'sparse', now), now);
  const sparse = captureStudyDataset(study, { id: 'tiny', planRevision: 2, capturedAt: now, notes: '', pairs: [], qaRecords: sampleQARecords(now) });
  for (const s of [sparse, (() => { const e = example(); for (const r of currentDataset(e)!.qaRecords) { const d = currentQA(r).data; if (d.outcome === 'satisfactory') d.outcome = 'failed'; } return e; })()]) {
    const r = currentPredictionRun(appendPredictionRun(s, 'no-model', now))!;
    assert.equal(r.status, 'insufficient_data'); assert.equal(r.model, null); assert.equal(r.metrics, null); assert.deepEqual(r.predictions, []);
  }
  const bead = example(); for (const r of currentDataset(bead)!.qaRecords) currentQA(r).data.origin = 'bead_proxy'; latestPlan(bead).data.expectedOrigin = 'bead_proxy';
  assert.equal(currentPredictionRun(appendPredictionRun(bead, 'bead', now))!.status, 'insufficient_data');
});
test('saved models reject changed inputs, altered scores, feature flags, preprocessing and metrics', () => {
  const s = evaluated(), p = latestPlan(s), d = currentDataset(s)!, run = currentPredictionRun(s)!;
  assert.equal(validatePredictionRun(run, p, d).id, 'model-run');
  for (const mutate of [(r: typeof run) => { r.model!.means[0] += 1; }, (r: typeof run) => { r.predictions[0].score = .99; }, (r: typeof run) => { r.metrics!.model.tp = 99; }, (r: typeof run) => { r.predictions[0].missingFeatures = ['invented']; }, (r: typeof run) => { r.split.train.pop(); }]) {
    const bad = structuredClone(run); mutate(bad); assert.throws(() => validatePredictionRun(bad, p, d));
  }
  assert.throws(() => evaluatePrediction(p, { ...d, qaRecords: [d.qaRecords[0], d.qaRecords[0]] }, 'duplicate', now), /unique/);
  assert.throws(() => evaluatePrediction(p, { ...d, planRevision: 99 }, 'wrong', now), /recorded/);
});
test('different outcome protocols and follow-up horizons remain explicit interpretation limits', () => {
  const s = example(), data = currentDataset(s)!;
  currentQA(data.qaRecords[0]).data.protocolReference = 'Another outcome definition';
  currentQA(data.qaRecords[2]).data.assessedOn = '2026-09-06';
  const run = evaluatePrediction(latestPlan(s), data, 'mixed-methods', now);
  assert.ok(run.limitations.some(c => c.includes('multiple protocol references')));
  assert.ok(run.limitations.some(c => c.includes('different observation-to-assessment intervals')));
});
test('model reruns and new snapshots invalidate the current review while retaining older evidence', () => {
  let s = evaluated(); s = appendStudyReview(s, { id: 'review', createdAt: now, reviewer: 'Review label', decision: 'changes_requested', comments: 'Missed failures require investigation.' });
  assert.equal(currentStudyReview(s)?.predictionRunId, 'model-run');
  const next = appendPredictionRun(s, 'model-run-two', now); assert.equal(currentStudyReview(next), undefined); assert.equal(next.reviews.length, 1); assert.equal(next.predictionRuns!.length, 2);
  const snapshot = captureStudyDataset(s, { ...currentDataset(s)!, id: 'snapshot-two' }); assert.equal(currentPredictionRun(snapshot), undefined); assert.equal(currentStudyReview(snapshot), undefined);
  const draft = reviseStudyPlan(s, { ...latestPlan(s).data, title: 'Revised title' }, 'Clarify target', now); assert.equal(currentPredictionRun(draft), undefined);
  assert.equal(validateStudy(next).predictionRuns!.length, 2);
});
test('model reports and full audits preserve code/data versions, labels, exclusions, parameters and review binding', () => {
  const s = evaluated(), run = currentPredictionRun(s)!, report = studyReport(s), audit = JSON.parse(studyAudit(s));
  for (const word of ['Container-performance ML evaluation', 'container-logistic-v1', '0.3030818903743536', 'not evidence of biological', 'model-run']) assert.ok(report.includes(word), word);
  assert.equal(audit.study.datasets[0].qaRecords.length, 100); assert.equal(audit.study.predictionRuns[0].model.weights.length, 12); assert.equal(audit.modelAlgorithmVersion, MODEL_VERSION);
  assert.equal(audit.study.predictionRuns[0].split.excluded.length, 55); assert.deepEqual(audit.study.predictionRuns[0].predictions, run.predictions);
  assert.equal(studyDatasetStale(currentDataset(s), []), false); // Generator snapshots are self-contained, not missing QA-store links.
  assert.equal('imageBytes' in audit, false);
});
test('old 4B study formats remain readable and model history survives reopening with stale writes rejected', async () => {
  const old = makeExampleStudy('old', now); assert.equal(validateStudy(old).predictionRuns, undefined);
  const factory = new IDBFactory(), first = createStudyStore(factory, 'model-persistence'), second = createStudyStore(factory, 'model-persistence');
  await first.add(example()); const fitted = await first.predict('model-study', 3); assert.equal(fitted.sequence, 4);
  await assert.rejects(second.predict('model-study', 3), /another tab/);
  await first.close(); await second.close(); const reopened = createStudyStore(factory, 'model-persistence');
  const rows = await reopened.list(); assert.deepEqual(rows[0], fitted);
  const reviewed = await reopened.review('model-study', 4, { reviewer: 'Reviewer', decision: 'comments', comments: 'Synthetic only.' });
  assert.equal(reviewed.reviews[0].predictionRunId, currentPredictionRun(fitted)!.id); await reopened.close();
});
test('stable sigmoid and constant-feature training produce finite coefficients and scores', () => {
  assert.equal(sigmoid(0), .5); assert.equal(sigmoid(1e6), 1); assert.equal(sigmoid(-1e6), 0);
  const template = preparePrediction(predictionExampleRecords(now), 'container').train[0];
  const rows: PredictionRow[] = [0, 1, 0, 1].map((target, i) => ({ ...template, recordId: 'r' + i, target: target as 0 | 1, features: [0, null, 0, null, 0, 0] }));
  const fitted = fitLogistic(rows); near(logisticScore(rows[0].features, fitted), .5); assert.ok(fitted.weights.every(Number.isFinite)); assert.equal(fitted.initialLoss, fitted.finalLoss);
  assert.equal(MODEL_PROTOCOL.iterations, 1000);
});
