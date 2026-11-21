// Optional development check; no browser, Firebase or private field data is used.
import { makePredictionExampleStudy } from '../src/lib/prediction-example.ts';
import { appendPredictionRun, currentPredictionRun } from '../src/lib/studies.ts';
const now = '2026-11-21T00:00:00Z';
const study = appendPredictionRun(makePredictionExampleStudy('reference-fixture', now), 'reference-run', now);
process.stdout.write(JSON.stringify(currentPredictionRun(study)));
