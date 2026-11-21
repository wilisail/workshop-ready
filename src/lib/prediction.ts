import { currentQA, qaAge, validateQARecord } from './qa-records.ts';
import type { QAOrigin, QAPayload, QARecord } from './qa-records.ts';
import type { PlanRevision, StudyDataset } from './studies.ts';

export const MODEL_VERSION = 'container-logistic-v1';
export const MODEL_SOFTWARE = '0.6.0';
export const MODEL_PROTOCOL = {
  target: 'Later protocol-labelled failed (1) versus satisfactory (0) container QA',
  split: 'Latest 20% of groups by first eligible observation date; earlier training outcomes must precede the first test observation',
  grouping: 'One earliest eligible row per physical container across cycles, or per site when the plan unit is site',
  baseline: 'Flag dry, damaged or missing containers; do not flag intact containers. Unknown condition is excluded from both methods.',
  preprocessing: 'Training-only mean imputation and population standard deviation; six missingness indicators; standardized values clipped to ±12',
  objective: 'Mean binary log loss + 0.02/2 × sum(weight²); intercept unpenalized',
  optimizer: 'Full-batch gradient descent; 1,000 steps, learning rate 0.08; no test-set tuning',
  threshold: 0.5,
  holdoutFraction: 0.2,
  iterations: 1000,
  learningRate: 0.08,
  l2: 0.02,
} as const;
export const FEATURES = [
  ['ageDays', 'Age at observation (days)'],
  ['waterTemperatureC', 'Container-water temperature (°C)'],
  ['larvaePerEgg', 'Larvae / stated starting eggs'],
  ['pupaePerEgg', 'Pupae / stated starting eggs'],
  ['deadImmaturesPerEgg', 'Dead immatures / stated starting eggs'],
  ['adverseCondition', 'Dry, damaged or missing condition'],
] as const;
export const MODEL_REFERENCES = [
  { title: 'Grouped and chronological evaluation', url: 'https://scikit-learn.org/stable/modules/cross_validation.html' },
  { title: 'Preventing preprocessing and target leakage', url: 'https://scikit-learn.org/stable/common_pitfalls.html#data-leakage' },
  { title: 'Logistic regression', url: 'https://scikit-learn.org/stable/modules/linear_model.html#logistic-regression' },
  { title: 'Brier score', url: 'https://scikit-learn.org/stable/modules/model_evaluation.html#brier-score-loss' },
  { title: 'Binomial interval assumptions', url: 'https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm' },
];

export interface PredictionRow {
  recordId: string; revision: number; container: string; group: string;
  observedOn: string; assessedOn: string; target: 0 | 1;
  features: (number | null)[]; baseline: 0 | 1;
}
export interface ExcludedRow { recordId: string; reason: string; }
export interface PredictionSplit {
  inputCount: number; eligibleGroups: number; cutoff: string | null;
  train: PredictionRow[]; test: PredictionRow[]; excluded: ExcludedRow[];
}
export interface LogisticModel {
  means: number[]; scales: number[]; minimums: (number | null)[]; maximums: (number | null)[];
  weights: number[]; intercept: number; initialLoss: number; finalLoss: number;
}
export interface ClassificationMetrics {
  n: number; tp: number; tn: number; fp: number; fn: number;
  accuracy: number | null; sensitivity: number | null; specificity: number | null;
  precision: number | null; balancedAccuracy: number | null; brier: number | null;
  accuracyInterval: [number, number] | null;
  sensitivityInterval: [number, number] | null;
}
export interface PredictionScore {
  recordId: string; group: string; target: 0 | 1; score: number; predicted: 0 | 1;
  baseline: 0 | 1; missingFeatures: string[]; outsideTrainingRange: string[];
}
export interface PredictionRun {
  id: string; createdAt: string; planRevision: number; datasetId: string;
  algorithmVersion: typeof MODEL_VERSION; softwareVersion: string;
  origin: QAOrigin; status: 'evaluated' | 'insufficient_data';
  protocol: typeof MODEL_PROTOCOL; split: PredictionSplit; model: LogisticModel | null;
  predictions: PredictionScore[];
  metrics: { model: ClassificationMetrics; baseline: ClassificationMetrics; prevalence: ClassificationMetrics } | null;
  limitations: string[];
}
const norm = (value: string) => value.trim().toLowerCase();
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
const ratio = (numerator: number | null, denominator: number | null) => numerator !== null && denominator !== null && denominator > 0 && numerator <= denominator ? numerator / denominator : null;
export function featureValues(data: QAPayload): (number | null)[] {
  const adverse = data.condition === 'unknown' ? null : data.condition === 'intact' ? 0 : 1;
  return [qaAge(data), data.temperatureBasis === 'water' ? data.temperatureC : null,
    ratio(data.larvae, data.initialEggs), ratio(data.pupae, data.initialEggs),
    ratio(data.deadImmatures, data.initialEggs), adverse].map(v => v !== null && Number.isFinite(v) && Math.abs(v) <= 1e6 ? v : null);
}

export function preparePrediction(records: QARecord[], unit: PlanRevision['data']['unit']): PredictionSplit {
  const excluded: ExcludedRow[] = [], groups = new Map<string, PredictionRow[]>();
  for (const record of records) {
    const revision = currentQA(validateQARecord(record)), d = revision.data;
    let reason = '';
    if (d.outcome !== 'failed' && d.outcome !== 'satisfactory') reason = 'QA outcome is unresolved; no success/failure label is invented.';
    else if (!d.assessedOn || d.assessedOn <= d.observedOn) reason = 'A definitive QA assessment must be dated strictly after the input observation.';
    else if (d.condition === 'unknown') reason = 'Condition is unknown; excluded from both methods so the inspection baseline has the same test rows.';
    if (reason) { excluded.push({ recordId: record.id, reason }); continue; }
    const group = unit === 'site' ? JSON.stringify([d.locationKind, norm(d.location)]) : JSON.stringify([norm(d.container)]);
    const row: PredictionRow = { recordId: record.id, revision: revision.number, container: d.container, group,
      observedOn: d.observedOn, assessedOn: d.assessedOn!, target: d.outcome === 'failed' ? 1 : 0,
      features: featureValues(d), baseline: d.condition === 'intact' ? 0 : 1 };
    groups.set(group, [...(groups.get(group) || []), row]);
  }
  const representatives = [...groups.values()].map(rows => {
    rows.sort((a, b) => a.observedOn.localeCompare(b.observedOn) || a.recordId.localeCompare(b.recordId));
    for (const row of rows.slice(1)) excluded.push({ recordId: row.recordId, reason: 'Repeated group: retain only its earliest eligible observation, without consulting the outcome value.' });
    return rows[0];
  }).sort((a, b) => a.observedOn.localeCompare(b.observedOn) || a.group.localeCompare(b.group));
  const testCount = Math.max(1, Math.ceil(representatives.length * MODEL_PROTOCOL.holdoutFraction));
  const test = representatives.slice(-testCount), candidates = representatives.slice(0, -testCount), cutoff = test[0]?.observedOn ?? null;
  const testContainers = new Set(test.map(r => norm(r.container)));
  const train = candidates.filter(row => {
    const reason = testContainers.has(norm(row.container)) ? 'Physical container also occurs in the held-out set.' : row.assessedOn >= cutoff! ? 'Training outcome is not earlier than the first held-out observation (chronological embargo).' : '';
    if (reason) excluded.push({ recordId: row.recordId, reason });
    return !reason;
  });
  return { inputCount: records.length, eligibleGroups: representatives.length, cutoff, train, test, excluded };
}

export function fitPreprocessing(rows: PredictionRow[]): Pick<LogisticModel, 'means' | 'scales' | 'minimums' | 'maximums'> {
  if (!rows.length) throw new Error('Training inputs are required.');
  const columns = FEATURES.map((_, j) => rows.flatMap(row => row.features[j] === null ? [] : [row.features[j]!]));
  const means = columns.map(values => values.length ? mean(values) : 0);
  // Missing values are imputed to the training mean, so their squared deviation is zero.
  const scales = columns.map((values, j) => Math.sqrt(values.reduce((sum, v) => sum + (v - means[j]) ** 2, 0) / rows.length) || 1);
  return { means, scales, minimums: columns.map(v => v.length ? Math.min(...v) : null), maximums: columns.map(v => v.length ? Math.max(...v) : null) };
}
export function transformFeatures(values: (number | null)[], model: Pick<LogisticModel, 'means' | 'scales'>): number[] {
  return [...values.map((value, j) => Math.max(-12, Math.min(12, ((value ?? model.means[j]) - model.means[j]) / model.scales[j]))), ...values.map(value => value === null ? 1 : 0)];
}
export function sigmoid(value: number): number { return value >= 0 ? 1 / (1 + Math.exp(-value)) : Math.exp(value) / (1 + Math.exp(value)); }
export function logisticScore(values: (number | null)[], model: LogisticModel): number {
  return sigmoid(transformFeatures(values, model).reduce((sum, value, j) => sum + value * model.weights[j], model.intercept));
}
export function fitLogistic(rows: PredictionRow[]): LogisticModel {
  const preprocessing = fitPreprocessing(rows), X = rows.map(r => transformFeatures(r.features, preprocessing));
  const prevalence = mean(rows.map(r => r.target));
  if (prevalence <= 0 || prevalence >= 1) throw new Error('Both outcome classes are required in training.');
  let intercept = Math.log(prevalence / (1 - prevalence));
  const weights = Array<number>(FEATURES.length * 2).fill(0);
  const loss = () => mean(X.map((x, i) => { const z = x.reduce((sum, v, j) => sum + v * weights[j], intercept); return Math.max(z, 0) - z * rows[i].target + Math.log1p(Math.exp(-Math.abs(z))); })) + MODEL_PROTOCOL.l2 / 2 * weights.reduce((s, w) => s + w * w, 0);
  const initialLoss = loss();
  for (let step = 0; step < MODEL_PROTOCOL.iterations; step++) {
    const gradient = weights.map(() => 0); let interceptGradient = 0;
    for (let i = 0; i < X.length; i++) {
      const x = X[i], error = sigmoid(x.reduce((sum, v, j) => sum + v * weights[j], intercept)) - rows[i].target;
      interceptGradient += error;
      for (let j = 0; j < weights.length; j++) gradient[j] += error * x[j];
    }
    for (let j = 0; j < weights.length; j++) weights[j] -= MODEL_PROTOCOL.learningRate * (gradient[j] / rows.length + MODEL_PROTOCOL.l2 * weights[j]);
    intercept -= MODEL_PROTOCOL.learningRate * interceptGradient / rows.length;
  }
  const model = { ...preprocessing, weights, intercept, initialLoss, finalLoss: loss() };
  if (![...weights, intercept, model.finalLoss].every(Number.isFinite)) throw new Error('The model did not produce finite parameters.');
  return model;
}
export function wilson(successes: number, n: number): [number, number] | null {
  if (!n) return null;
  const z = 1.959963984540054, p = successes / n, divisor = 1 + z * z / n;
  const center = (p + z * z / (2 * n)) / divisor;
  const half = z / divisor * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
  return [Math.max(0, center - half), Math.min(1, center + half)];
}
export function classificationMetrics(labels: (0 | 1)[], scores: number[]): ClassificationMetrics {
  if (labels.length !== scores.length || scores.some(s => !Number.isFinite(s) || s < 0 || s > 1)) throw new Error('Metrics need matching labels and finite scores from zero to one.');
  let tp = 0, tn = 0, fp = 0, fn = 0;
  labels.forEach((label, i) => { const flag = scores[i] >= MODEL_PROTOCOL.threshold; if (label) { if (flag) tp++; else fn++; } else if (flag) fp++; else tn++; });
  const divide = (a: number, b: number) => b ? a / b : null;
  const sensitivity = divide(tp, tp + fn), specificity = divide(tn, tn + fp);
  return { n: labels.length, tp, tn, fp, fn, accuracy: divide(tp + tn, labels.length), sensitivity, specificity,
    precision: divide(tp, tp + fp), balancedAccuracy: sensitivity === null || specificity === null ? null : (sensitivity + specificity) / 2,
    brier: scores.length ? mean(scores.map((s, i) => (s - labels[i]) ** 2)) : null,
    accuracyInterval: wilson(tp + tn, labels.length), sensitivityInterval: wilson(tp, tp + fn) };
}

function warnings(plan: PlanRevision): string[] {
  return [
    plan.data.expectedOrigin === 'synthetic_demo' ? 'Synthetic data demonstrate a computation pipeline; performance is not evidence of biological or field accuracy.' : 'User-entered field labels and dates are not independently verified. This run is exploratory.',
    'The target is a later operator-entered container QA label, not adult emergence, Wolbachia infection or dengue reduction.',
    'Dates must place inputs before the QA outcome and training outcomes before the first test observation. Date declarations do not establish when a measurement was actually available.',
    'Container/cycle grouping uses the physical container across cycles. Site grouping retains one earliest eligible container observation per site. Other correlated locations/batches can remain.',
    'Sample counts are software feasibility checks, not a power calculation or a sufficient field sample size. A single chronological holdout can be unstable.',
    'Wilson 95% intervals illustrate finite-test-sample uncertainty assuming independent Bernoulli units. They omit spatial dependence, model fitting uncertainty, label error and population shift.',
    'Scores are uncalibrated model outputs, not validated failure probabilities or confidence estimates. Coefficients are associations, not causal effects.',
    'No hyperparameter, feature, threshold or holdout selection uses test performance. Repeated manual inspection/tuning would require a new untouched evaluation set.',
    'This fixed software protocol may differ from the free-text study analysis plan. Inspect both before interpreting the result; local recording is not external preregistration.',
  ];
}
export function evaluatePrediction(plan: PlanRevision, dataset: StudyDataset, id: string, createdAt: string): PredictionRun {
  if (plan.status !== 'recorded' || plan.data.template !== 'prediction' || dataset.planRevision !== plan.number || !dataset.qaRecords.length) throw new Error('Use a recorded prediction plan with its captured QA snapshot.');
  if (dataset.qaRecords.length > 500 || dataset.pairs.length || new Set(dataset.qaRecords.map(r => r.id)).size !== dataset.qaRecords.length) throw new Error('Use a unique QA snapshot with up to 500 records.');
  if (dataset.qaRecords.some(r => currentQA(r).data.origin !== plan.data.expectedOrigin)) throw new Error('Model data origin does not match the plan.');
  const split = preparePrediction(dataset.qaRecords, plan.data.unit), limitations = warnings(plan);
  const selectedIds = new Set([...split.train, ...split.test].map(row => row.recordId));
  const selectedData = dataset.qaRecords.filter(record => selectedIds.has(record.id)).map(record => currentQA(record).data);
  if (new Set(selectedData.map(d => d.protocolReference)).size > 1) limitations.unshift('Selected outcomes cite multiple protocol references. Label definitions may differ; this run does not establish a common field outcome definition.');
  if (new Set(selectedData.map(d => (Date.parse(d.assessedOn!) - Date.parse(d.observedOn)) / 86400000)).size > 1) limitations.unshift('Selected outcomes have different observation-to-assessment intervals. This is not a validated fixed-horizon forecast; specify the intended horizon before a future field evaluation.');
  const output: PredictionRun = { id, createdAt, planRevision: plan.number, datasetId: dataset.id, algorithmVersion: MODEL_VERSION, softwareVersion: MODEL_SOFTWARE,
    origin: plan.data.expectedOrigin, status: 'insufficient_data', protocol: { ...MODEL_PROTOCOL }, split, model: null, predictions: [], metrics: null, limitations };
  const classes = (rows: PredictionRow[]) => new Set(rows.map(r => r.target)).size;
  if (plan.data.expectedOrigin === 'bead_proxy') limitations.unshift('Bead-proxy counts cannot supply biological container-performance labels. Use the explicit synthetic example or appropriate field QA data.');
  else if (split.train.length < 2 || classes(split.train) < 2 || split.test.length < 2 || classes(split.test) < 2) limitations.unshift('Insufficient data after grouping and chronological exclusion: both training and test need at least one failed and one satisfactory group. No model or performance result was fabricated.');
  else {
    const model = fitLogistic(split.train), prevalence = mean(split.train.map(r => r.target));
    const predictions = split.test.map(row => {
      const score = logisticScore(row.features, model);
      return { recordId: row.recordId, group: row.group, target: row.target, score, predicted: score >= MODEL_PROTOCOL.threshold ? 1 as const : 0 as const,
        baseline: row.baseline,
        missingFeatures: FEATURES.flatMap(([key], j) => row.features[j] === null ? [key] : []),
        outsideTrainingRange: FEATURES.flatMap(([key], j) => { const v = row.features[j], min = model.minimums[j], max = model.maximums[j]; return v !== null && (min === null || max === null || v < min || v > max) ? [key] : []; }) };
    });
    output.status = 'evaluated'; output.model = model; output.predictions = predictions;
    const labels = predictions.map(p => p.target);
    output.metrics = { model: classificationMetrics(labels, predictions.map(p => p.score)), baseline: classificationMetrics(labels, predictions.map(p => p.baseline)), prevalence: classificationMetrics(labels, labels.map(() => prevalence)) };
    if (model.finalLoss > model.initialLoss + 1e-10) throw new Error('Training did not reduce its objective; inspect the input data.');
    if (predictions.some(p => p.missingFeatures.length || p.outsideTrainingRange.length)) limitations.unshift('Some held-out inputs are missing or outside the training range. Per-row flags are retained. Missing ratios (including counts exceeding the stated starting quantity) use training means; air/weather values are not substituted for water temperature.');
  }
  return output;
}

export function validatePredictionRun(value: unknown, plan: PlanRevision, dataset: StudyDataset): PredictionRun {
  const r = value as PredictionRun;
  if (!r || plan.status !== 'recorded' || plan.data.template !== 'prediction' || dataset.planRevision !== plan.number || typeof r.id !== 'string' || !r.id || !Number.isFinite(Date.parse(r.createdAt)) || r.planRevision !== plan.number || r.datasetId !== dataset.id || r.algorithmVersion !== MODEL_VERSION || r.origin !== plan.data.expectedOrigin || typeof r.softwareVersion !== 'string' || JSON.stringify(r.protocol) !== JSON.stringify(MODEL_PROTOCOL)) throw new Error('Invalid saved model provenance.');
  if (!['evaluated', 'insufficient_data'].includes(r.status) || !Array.isArray(r.limitations) || !r.limitations.every(s => typeof s === 'string')) throw new Error('Invalid saved model status.');
  if (!Array.isArray(r.predictions)) throw new Error('Invalid saved predictions.');
  const split = preparePrediction(dataset.qaRecords, plan.data.unit);
  if (JSON.stringify(split) !== JSON.stringify(r.split)) throw new Error('Saved model split does not match the pinned inputs.');
  const feasible = plan.data.expectedOrigin !== 'bead_proxy' && split.train.length >= 2 && split.test.length >= 2 && new Set(split.train.map(row => row.target)).size === 2 && new Set(split.test.map(row => row.target)).size === 2;
  if ((r.status === 'evaluated') !== feasible) throw new Error('Saved model status does not match dataset feasibility.');
  if (r.status === 'insufficient_data') {
    if (r.model !== null || r.metrics !== null || r.predictions.length) throw new Error('An insufficient-data run cannot contain a fitted model.');
    return r;
  }
  const model = r.model;
  if (!model || ![model.means, model.scales, model.minimums, model.maximums].every(v => Array.isArray(v) && v.length === FEATURES.length) || !Array.isArray(model.weights) || model.weights.length !== FEATURES.length * 2 || ![...model.means, ...model.scales, ...model.weights, model.intercept, model.initialLoss, model.finalLoss].every(Number.isFinite) || model.scales.some(s => s <= 0)) throw new Error('Invalid saved model parameters.');
  const preprocessing = fitPreprocessing(split.train);
  for (const key of ['means', 'scales', 'minimums', 'maximums'] as const) if (JSON.stringify(model[key]) !== JSON.stringify(preprocessing[key])) throw new Error('Saved preprocessing differs from training-only inputs.');
  if (r.predictions.length !== split.test.length) throw new Error('Saved evaluation rows are incomplete.');
  const prevalence = mean(split.train.map(row => row.target));
  r.predictions.forEach((p, i) => {
    const row = split.test[i], score = logisticScore(row.features, model);
    const missing = FEATURES.flatMap(([key], j) => row.features[j] === null ? [key] : []);
    const outside = FEATURES.flatMap(([key], j) => { const v = row.features[j], min = model.minimums[j], max = model.maximums[j]; return v !== null && (min === null || max === null || v < min || v > max) ? [key] : []; });
    if (p.recordId !== row.recordId || p.group !== row.group || p.target !== row.target || p.baseline !== row.baseline || p.score !== score || p.predicted !== (score >= .5 ? 1 : 0) || JSON.stringify(p.missingFeatures) !== JSON.stringify(missing) || JSON.stringify(p.outsideTrainingRange) !== JSON.stringify(outside)) throw new Error('Saved predictions do not match the pinned held-out inputs.');
  });
  const labels = r.predictions.map(p => p.target);
  const expected = { model: classificationMetrics(labels, r.predictions.map(p => p.score)), baseline: classificationMetrics(labels, r.predictions.map(p => p.baseline)), prevalence: classificationMetrics(labels, labels.map(() => prevalence)) };
  if (JSON.stringify(expected) !== JSON.stringify(r.metrics)) throw new Error('Saved evaluation metrics do not match predictions.');
  return r;
}
