import { useEffect, useState } from 'react';
import Icon from './Icon.tsx';
import { ORIGINS } from '../lib/qa-records.ts';
import { getQAStore } from '../lib/qa-store.ts';
import type { QARecord } from '../lib/qa-records.ts';
import { csvCell } from '../lib/dashboard.ts';
import { currentDataset, currentPredictionRun, currentStudyReview, latestPlan, studyAudit, studyDatasetStale, studyReport } from '../lib/studies.ts';
import type { Study } from '../lib/studies.ts';
import { getStudyStore } from '../lib/study-store.ts';
import { makePredictionExampleStudy } from '../lib/prediction-example.ts';
import { FEATURES, MODEL_PROTOCOL, MODEL_REFERENCES, MODEL_VERSION } from '../lib/prediction.ts';
import type { ClassificationMetrics, PredictionRun } from '../lib/prediction.ts';

const percent = (n: number | null) => n === null ? 'Unknown' : (100 * n).toFixed(1) + '%';
const decimal = (n: number | null) => n === null ? 'Unknown' : n.toFixed(3);
const interval = (values: [number, number] | null) => values ? values.map(percent).join('–') : 'Unknown';
const errorText = (e: unknown) => e instanceof Error ? e.message : 'The model operation could not be completed.';
function download(name: string, data: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type })), a = document.createElement('a');
  a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function predictionCsv(run: PredictionRun) {
  const rows: (string | number)[][] = [['algorithm', 'data_origin', 'plan_version', 'snapshot_id', 'run_id', 'record_id', 'group', 'observed_outcome', 'model_score_uncalibrated', 'model_flag', 'inspection_rule_flag', 'missing_features', 'outside_training_range']];
  for (const p of run.predictions) rows.push([run.algorithmVersion, run.origin, run.planRevision, run.datasetId, run.id, p.recordId, p.group, p.target, p.score, p.predicted, p.baseline, p.missingFeatures.join('; '), p.outsideTrainingRange.join('; ')]);
  return rows.map(row => row.map(csvCell).join(',')).join('\r\n');
}
function ResultRow({ title, metrics }: { title: string; metrics: ClassificationMetrics }) {
  return <tr><th scope="row">{title}</th><td className="numeric">{metrics.n}</td><td className="numeric">{metrics.tp}/{metrics.tp + metrics.fn}<span className="table-sub">{percent(metrics.sensitivity)}</span></td><td className="numeric">{percent(metrics.specificity)}</td><td className="numeric">{percent(metrics.balancedAccuracy)}</td><td className="numeric">{decimal(metrics.brier)}</td><td className="numeric">{percent(metrics.accuracy)}<span className="table-sub">95%: {interval(metrics.accuracyInterval)}</span></td></tr>;
}
export default function ModelWorkspace({ onNotice, onOpenStudy }: { onNotice: (text: string) => void; onOpenStudy: (id: string) => void }) {
  const [store] = useState(() => { try { return getStudyStore(); } catch { return null; } });
  const [studies, setStudies] = useState<Study[]>([]), [sources, setSources] = useState<QARecord[]>([]);
  const [selectedId, setSelectedId] = useState(''), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const selected = studies.find(s => s.id === selectedId) || studies[0], plan = selected ? latestPlan(selected) : undefined;
  const data = selected ? currentDataset(selected) : undefined, run = selected ? currentPredictionRun(selected) : undefined, review = selected ? currentStudyReview(selected) : undefined;
  useEffect(() => {
    let alive = true;
    if (!store) { setError('Local study storage is unavailable.'); setLoading(false); return; }
    Promise.all([store.list(), getQAStore().list()]).then(([s, q]) => { if (alive) { setStudies(s.filter(s => latestPlan(s).data.template === 'prediction')); setSources(q); } }).catch(e => { if (alive) setError(errorText(e)); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [store]);
  function accept(s: Study) { setStudies(current => [s, ...current.filter(old => old.id !== s.id)]); setSelectedId(s.id); }
  async function refresh() {
    if (!store) return; setBusy(true); setError('');
    try { const [s, q] = await Promise.all([store.list(), getQAStore().list()]); setStudies(s.filter(s => latestPlan(s).data.template === 'prediction')); setSources(q); } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  async function example() {
    if (!store) return; setBusy(true); setError('');
    try { const s = makePredictionExampleStudy(crypto.randomUUID(), new Date().toISOString()); await store.add(s); accept(s); onNotice('Created a synthetic prediction study and 100-record snapshot. Select Train and evaluate to fit the model.'); } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  async function train() {
    if (!store || !selected) return; setBusy(true); setError('');
    try {
      // Yield one frame so the busy state paints before bounded local arithmetic.
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const s = await store.predict(selected.id, selected.sequence); accept(s);
      onNotice(currentPredictionRun(s)?.status === 'evaluated' ? 'Saved the fitted model, untouched test predictions and baseline comparison.' : 'Saved an insufficient-data result. No model or evaluation was invented.');
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  return <div className="model-workspace">
    <section className="panel"><div className="panel-title"><div><h2>Container-performance evaluation</h2><p>Small numeric ML · independent of the image AI connection</p></div><span className="tag">Step 4C</span></div><div className="study-plan-body">
      <p>Fit logistic regression to earlier container observations and compare it with a fixed inspection rule on later, unseen groups. The target is a separately entered QA outcome.</p>
      <div className="button-row model-actions"><button className="button secondary" onClick={example} disabled={!store || loading || busy}>Create synthetic prediction example</button><button className="subtle-button" onClick={refresh} disabled={!store || loading || busy}>Refresh model studies</button></div>
      <div className="model-picker"><label htmlFor="model-study">Prediction study</label><select id="model-study" value={selected?.id || ''} disabled={!studies.length || loading || busy} onChange={e => setSelectedId(e.target.value)}><option value="" disabled>Choose a saved prediction study</option>{studies.map(s => <option key={s.id} value={s.id}>{latestPlan(s).data.title} · plan {latestPlan(s).number} {latestPlan(s).status}</option>)}</select></div>
      {loading && <p role="status">Loading prediction studies…</p>}{error && <p role="alert" className="form-error">{error}</p>}
      {!loading && !selected && <p className="helper">Create the explicit synthetic example, or record a prediction plan and capture QA inputs in Study & review. No Firebase setup or model download is needed here.</p>}
      {selected && plan && <><dl className="study-facts"><div><dt>Source</dt><dd>{ORIGINS[plan.data.expectedOrigin]} · plan {plan.number} {plan.status}</dd></div><div><dt>Input snapshot</dt><dd>{data ? data.qaRecords.length + ' QA records · ' + data.capturedAt : 'No snapshot for this plan version'}</dd></div><div><dt>Current model run</dt><dd>{run ? (run.status === 'evaluated' ? 'Evaluated · exploratory' : 'Insufficient data') + ' · ' + run.createdAt : 'Not trained for this plan and snapshot'}</dd></div></dl>
        {data && studyDatasetStale(data, sources) && <p className="form-error">Some QA sources changed or are unavailable. This model uses the retained snapshot; capture a new dataset to use refreshed sources.</p>}
        <div className="button-row"><button className="button primary" onClick={train} disabled={busy || plan.status !== 'recorded' || !data}>{busy ? 'Training and evaluating…' : 'Train and evaluate'}</button><button className="button secondary" onClick={() => onOpenStudy(selected.id)} disabled={busy}>Open this study and review</button></div>
        <p className="helper">Training appends a versioned result and requires a fresh review. Computation and records stay in this browser; image inference retains your separate cloud/device preference.</p></>}
    </div></section>
    <section className="panel"><div className="panel-title"><div><h2>Fixed evaluation method</h2><p>{MODEL_VERSION} · inspect before running</p></div></div><div className="study-plan-body"><dl className="study-facts"><div><dt>Holdout</dt><dd>{MODEL_PROTOCOL.split}</dd></div><div><dt>Repeated records</dt><dd>{MODEL_PROTOCOL.grouping}</dd></div><div><dt>Inspection baseline</dt><dd>{MODEL_PROTOCOL.baseline}</dd></div><div><dt>Model threshold</dt><dd>0.5 · fixed before evaluation · scores are uncalibrated</dd></div></dl><details className="study-details"><summary>Features, missing values and training settings</summary><div className="model-methods"><ul>{FEATURES.map(([key, label]) => <li key={key}>{label}</li>)}</ul><p>{MODEL_PROTOCOL.preprocessing}.</p><p>Ratios with unknown/zero starting quantities or counts above that quantity stay unknown. Values beyond the numeric guard of ±1,000,000 stay unknown. Starting quantity is not assumed to be a verified hatch denominator. Emergence results, infection tests, final QA labels, notes, IDs and dengue data are excluded from the feature vector.</p><p>{MODEL_PROTOCOL.objective}. {MODEL_PROTOCOL.optimizer}.</p><p>One observation per group gives each selected group equal weight. Site/batch dependence and field transportability still need separate evaluation. Review the recorded free-text analysis plan alongside this software protocol.</p></div></details></div></section>
    {run && <><section className="panel"><div className="panel-title"><div><h2>Evaluation scope</h2><p>{ORIGINS[run.origin]} · {run.algorithmVersion} · {run.status === 'evaluated' ? 'Computed result' : 'Insufficient data'}</p></div></div><div className="study-plan-body"><div className="study-metrics">{Object.entries({ 'Input records': run.split.inputCount, 'Eligible groups': run.split.eligibleGroups, 'Training groups': run.split.train.length, 'Test groups': run.split.test.length, 'Excluded input rows': run.split.excluded.length }).map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><p className="helper">First held-out observation: {run.split.cutoff || 'Unknown'}. Every training outcome precedes that date. Test inputs and labels do not fit preprocessing or parameters.</p>
      {run.model && <p className="helper">Training objective: {decimal(run.model.initialLoss)} before fitting, {decimal(run.model.finalLoss)} after fitting. A lower training loss does not establish useful test performance.</p>}
      <details className="study-details"><summary>Exact partitions and exclusion reasons</summary><pre>{JSON.stringify(run.split, null, 2)}</pre></details></div></section>
      {run.metrics && <section className="panel"><div className="panel-title"><div><h2>Held-out comparison</h2><p>Failed QA is the positive class · identical test groups for all three methods</p></div></div><div className="table-scroll"><table><caption className="sr-only">Held-out model, inspection-rule and training-prevalence baseline metrics</caption><thead><tr><th>Method</th><th className="numeric">Test n</th><th className="numeric">Failed groups found</th><th className="numeric">Specificity</th><th className="numeric">Balanced accuracy</th><th className="numeric">Brier loss, lower better</th><th className="numeric">Accuracy / Wilson interval</th></tr></thead><tbody><ResultRow title="Logistic model" metrics={run.metrics.model}/><ResultRow title="Inspection rule" metrics={run.metrics.baseline}/><ResultRow title="Training-prevalence baseline" metrics={run.metrics.prevalence}/></tbody></table></div><div className="study-plan-body"><p className="model-result-note">The model found {run.metrics.model.tp} of {run.metrics.model.tp + run.metrics.model.fn} failed test groups and missed {run.metrics.model.fn}. {run.metrics.model.fn > 0 ? 'Missed failures remain visible; this result does not support automatic field decisions.' : 'This is one exploratory holdout result and does not establish field reliability.'}</p><p className="helper">Binary Brier loss is mean squared score error (0–1). The inspection rule uses hard 0/1 flags; the constant baseline uses training failure prevalence. Unknown precision/recall denominators remain unknown. Intervals describe finite test counts under independence assumptions, not calibrated risk or field effectiveness.</p>
        <details className="study-details"><summary>Confusion counts and conditional sensitivity intervals</summary><div className="table-scroll"><table><thead><tr><th>Method</th><th>True failed found</th><th>Failed missed</th><th>False alarms</th><th>Correctly clear</th><th>Sensitivity 95% interval</th></tr></thead><tbody>{Object.entries(run.metrics).map(([key, value]) => <tr key={key}><th scope="row">{key === 'model' ? 'Logistic model' : key === 'baseline' ? 'Inspection rule' : 'Training prevalence'}</th><td>{value.tp}</td><td>{value.fn}</td><td>{value.fp}</td><td>{value.tn}</td><td>{interval(value.sensitivityInterval)}</td></tr>)}</tbody></table></div></details>
        <details className="study-details"><summary>Held-out predictions and missing-input flags</summary><div className="table-scroll"><table><thead><tr><th>QA reference</th><th>Later QA label</th><th>Model score</th><th>Model flag</th><th>Rule flag</th><th>Input flags</th></tr></thead><tbody>{run.predictions.map(p => <tr key={p.recordId}><td>{p.recordId}</td><td>{p.target ? 'Failed' : 'Satisfactory'}</td><td>{decimal(p.score)}</td><td>{p.predicted ? 'Flag' : 'No flag'}</td><td>{p.baseline ? 'Flag' : 'No flag'}</td><td>{p.missingFeatures.length ? 'Missing: ' + p.missingFeatures.join(', ') + '. ' : ''}{p.outsideTrainingRange.length ? 'Outside training range: ' + p.outsideTrainingRange.join(', ') : p.missingFeatures.length ? '' : 'No input flags'}</td></tr>)}</tbody></table></div></details>
        {run.model && <details className="study-details"><summary>Fitted parameters and training preprocessing</summary><pre>{JSON.stringify({ featureOrder: FEATURES.map(([key]) => key), missingIndicatorOrder: FEATURES.map(([key]) => key + 'Missing'), ...run.model }, null, 2)}</pre></details>}
      </div></section>}
      <section className="panel"><div className="panel-title"><div><h2>Interpretation and review</h2><p>{review ? 'A comment is recorded for these exact versions' : 'No review for this plan / snapshot / readiness / model combination'}</p></div></div><div className="study-plan-body">{review && <p className="model-result-note">{review.reviewer}: {review.comments}</p>}<ul className="study-checks">{run.limitations.map(c => <li key={c}>{c}</li>)}</ul>{selected && <div className="button-row"><button className="button secondary" onClick={() => onOpenStudy(selected.id)}>Review this model in Study & review</button><button className="button secondary" onClick={() => download('wolbachia-model-methods.md', studyReport(selected), 'text/markdown;charset=utf-8')}><Icon name="download" size={16}/>Export model methods</button><button className="button secondary" onClick={() => download('wolbachia-model-audit.json', studyAudit(selected), 'application/json')}><Icon name="download" size={16}/>Export model audit</button>{run.predictions.length > 0 && <button className="button secondary" onClick={() => download('wolbachia-held-out-predictions.csv', predictionCsv(run), 'text/csv;charset=utf-8')}>Export test predictions</button>}</div>}</div></section>
    </>}
    <details className="study-details model-references"><summary>Method references</summary><div className="study-plan-body study-references">{MODEL_REFERENCES.map(r => <a key={r.url} href={r.url} target="_blank" rel="noreferrer">{r.title}<Icon name="external" size={14}/></a>)}<p className="helper">The lightweight TypeScript implementation is in this repository; scikit-learn is a method reference, not a runtime dependency or institutional endorsement.</p></div></details>
  </div>;
}
