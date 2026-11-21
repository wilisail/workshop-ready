import { sampleQARecords, currentQA, validateQARecord } from './qa-records.ts';
import type { QARecord } from './qa-records.ts';
import { captureStudyDataset, defaultPlan, latestPlan, makeStudy, recordStudyPlan } from './studies.ts';
import { MODEL_PROTOCOL, MODEL_REFERENCES, MODEL_VERSION } from './prediction.ts';

export const GENERATOR_VERSION = 'qa-prediction-fixture-v1';
// Fictional relationships and seeded label noise illustrate the pipeline. No fitted
// relationship in this generator is an estimate from Wolbachia field studies.
export function predictionExampleRecords(now: string): QARecord[] {
  let seed = 4271;
  const random = () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
  const date = (offset: number) => new Date(Date.UTC(2026, 8, 1 + offset)).toISOString().slice(0, 10);
  const base = currentQA(sampleQARecords(now)[0]).data, records: QARecord[] = [];
  for (let i = 0; i < 48; i++) {
    const age = 3 + Math.floor(random() * 9), temperature = Math.round((25 + 8 * random()) * 10) / 10;
    const adverse = random() < .22, dead = Math.round(3 + 42 * random()), pupae = Math.round(4 + 26 * random()), larvae = Math.round(3 + 19 * random());
    const latentScore = -1.6 + .15 * (temperature - 28) + 4 * dead / 100 + 1.1 * Number(adverse) + .08 * (age - 6) - 3 * pupae / 100;
    const failed = random() < 1 / (1 + Math.exp(-latentScore));
    for (let visit = 0; visit < 2; visit++) {
      const data = { ...base, container: 'MOCK-ML-' + String(i + 1).padStart(2, '0'), batch: 'MOCK-COHORT-' + (i % 4 + 1), location: 'Fictional sector ' + (i % 6 + 1),
        setupOn: date(i - age), observedOn: date(i + visit), initialEggs: i % 13 === 0 ? null : 100,
        sourceReference: i % 13 === 0 ? '' : 'Generator fixture starting quantity; no real eggs',
        larvae, pupae, deadImmatures: dead, pupalSkins: null, deadAdults: null,
        condition: adverse ? 'dry' as const : 'intact' as const, temperatureC: temperature,
        temperatureBasis: i % 11 === 0 ? 'weather' as const : 'water' as const, temperatureSource: 'Synthetic value; not a sensor measurement',
        outcome: failed ? 'failed' as const : 'satisfactory' as const, assessedOn: date(i + 3), assessor: 'Synthetic outcome generator',
        protocolReference: 'Fictional QA label under ' + GENERATOR_VERSION + '; no biological threshold is asserted.',
        notes: 'Synthetic example with seeded noisy labels. Relationships are invented for software demonstration; no emergence or infection result is inferred.' };
      records.push(validateQARecord({ schemaVersion: 1, id: 'ml-fixture-' + i + '-' + visit, createdAt: now,
        revisions: [{ number: 1, savedAt: now, reason: 'Generate explicitly synthetic QA fixture', data }] }));
    }
  }
  const first = currentQA(records[0]).data;
  const extra = [
    { ...first, container: 'MOCK-UNRESOLVED', outcome: 'not_assessed', assessedOn: null, assessor: '', protocolReference: '' },
    { ...first, container: 'MOCK-REVIEW', outcome: 'needs_review' },
    { ...first, container: 'MOCK-SAME-DAY', assessedOn: first.observedOn },
    { ...first, container: 'MOCK-UNKNOWN-CONDITION', condition: 'unknown' },
  ];
  extra.forEach((data, i) => records.push(validateQARecord({ schemaVersion: 1, id: 'ml-fixture-excluded-' + i, createdAt: now,
    revisions: [{ number: 1, savedAt: now, reason: 'Illustrate a documented exclusion', data }] })));
  return records;
}

export function makePredictionExampleStudy(id: string, now: string) {
  const plan = { ...defaultPlan('prediction'), title: 'Synthetic container-performance evaluation', plannedUnits: 48,
    samplingRationale: '48 fictional container groups and repeated visits demonstrate computation. This is not a field sample-size justification or power calculation.',
    allocation: MODEL_PROTOCOL.split + '. ' + MODEL_PROTOCOL.grouping,
    blinding: 'Fixture labels are generated separately with seeded noise. No human blinding or field independence is claimed.',
    inclusion: 'Definitive later QA label and known condition; one earliest eligible observation per holdout group.',
    exclusion: 'Unresolved labels, same-day/earlier outcome, unknown condition, repeated group rows and training outcomes not before the test cutoff. All exclusions are retained.',
    comparator: MODEL_PROTOCOL.baseline + ' Also report a constant training-prevalence baseline.',
    analysisPlan: MODEL_VERSION + ': ' + MODEL_PROTOCOL.optimizer + '. ' + MODEL_PROTOCOL.objective + '. Report held-out confusion matrices, sensitivity, specificity, balanced accuracy, binary Brier score and conditional Wilson intervals. Threshold 0.5. No test-set tuning.',
    missingDataPlan: MODEL_PROTOCOL.preprocessing + '. No weather-for-water substitution. Missing/implausible denominator ratios stay unknown.',
    repeatedMeasuresPlan: MODEL_PROTOCOL.grouping + '. Groups are never shared across partitions; the split is also chronological.',
    references: MODEL_REFERENCES.map(r => r.url).join('\n') };
  const study = recordStudyPlan(makeStudy(plan, id, now), now);
  return captureStudyDataset(study, { id: id + '-fixture', planRevision: latestPlan(study).number, capturedAt: now,
    notes: 'Self-contained synthetic generator ' + GENERATOR_VERSION + ', seed 4271; 100 QA records. These are not external Container QA store entries.',
    generatorVersion: GENERATOR_VERSION, pairs: [], qaRecords: predictionExampleRecords(now) });
}
