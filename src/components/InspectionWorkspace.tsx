import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Icon from './Icon.tsx';
import { CONDITIONS, currentQA, ORIGINS, OUTCOMES, sampleQARecords } from '../lib/qa-records.ts';
import type { QAOrigin, QARecord } from '../lib/qa-records.ts';
import { getQAStore } from '../lib/qa-store.ts';
import { currentDataset, latestPlan } from '../lib/studies.ts';
import type { Study } from '../lib/studies.ts';
import { getStudyStore } from '../lib/study-store.ts';
import { currentInspectionDecision, INSPECTION_DECISIONS, INSPECTION_METHOD, inspectionAudit, inspectionCsv, inspectionRecords, inspectionReport, inspectionSourceChanges, makeInspectionPlan, PRIORITIES, sourceFromStudy, visibleInspectionData } from '../lib/inspection.ts';
import type { InspectionConfig, InspectionDecision, InspectionItem, InspectionPlan, InspectionSource } from '../lib/inspection.ts';
import { getInspectionStore } from '../lib/inspection-store.ts';

const errorText = (e: unknown) => e instanceof Error ? e.message : 'The inspection operation could not be completed.';
const today = () => { const d = new Date(); return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-'); };
const statusText = (d: InspectionDecision | undefined) => !d ? 'Pending review' : d.action === 'accept' ? 'Task accepted' : d.action === 'defer' ? 'Deferred' : 'Dismissed';
function download(name: string, contents: string, type: string) { const url = URL.createObjectURL(new Blob([contents], { type })), a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }

function DecisionEditor({ plan, item, blocked, onSave }: { plan: InspectionPlan; item: InspectionItem; blocked: boolean; onSave: (input: Omit<InspectionDecision, 'id' | 'number' | 'savedAt'>) => Promise<void> }) {
  const current = currentInspectionDecision(plan, item.id);
  const [action, setAction] = useState<InspectionDecision['action']>(current?.action || 'accept'), [reviewer, setReviewer] = useState(current?.reviewer || '');
  const [assignee, setAssignee] = useState(current?.assignee || ''), [dueOn, setDueOn] = useState(current?.dueOn || ''), [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function save(e: FormEvent) { e.preventDefault(); setBusy(true); setError(''); try { await onSave({ itemId: item.id, action, reviewer, reason, assignee: action === 'accept' ? assignee : '', dueOn: action === 'dismiss' ? null : dueOn || null }); } catch (e) { setError(errorText(e)); } finally { setBusy(false); } }
  return <form className="inspection-decision" onSubmit={save}><fieldset disabled={blocked || busy}><legend>{current ? 'Record a new decision version' : 'Human decision'}</legend>
    <label htmlFor="inspection-action">Decision</label><select id="inspection-action" value={action} onChange={e => setAction(e.target.value as InspectionDecision['action'])}>{Object.entries(INSPECTION_DECISIONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
    <label htmlFor="inspection-reviewer">Reviewer label</label><input id="inspection-reviewer" value={reviewer} maxLength={200} required onChange={e => setReviewer(e.target.value)}/>
    {action === 'accept' && <><label htmlFor="inspection-assignee">Assignee label</label><input id="inspection-assignee" value={assignee} maxLength={200} required onChange={e => setAssignee(e.target.value)}/></>}
    {action !== 'dismiss' && <><label htmlFor="inspection-due">{action === 'accept' ? 'Task due date' : 'Next-review date'}</label><input id="inspection-due" type="date" min={plan.config.asOf} value={dueOn} required onChange={e => setDueOn(e.target.value)}/></>}
    <label htmlFor="inspection-reason">Decision reason</label><textarea id="inspection-reason" rows={3} value={reason} maxLength={2000} required onChange={e => setReason(e.target.value)}/>
    {error && <p className="form-error" role="alert">{error}</p>}<button className="button primary" disabled={blocked || busy}>{busy ? 'Saving decision…' : 'Save inspection decision'}</button>
    <p className="helper">Labels are self-entered. This records a task/review decision; it sends no assignment or notification. Save before leaving this item.</p>
  </fieldset></form>;
}

export default function InspectionWorkspace({ onNotice }: { onNotice: (message: string) => void }) {
  const [store] = useState(() => { try { return getInspectionStore(); } catch { return null; } });
  const [records, setRecords] = useState<QARecord[]>([]), [studies, setStudies] = useState<Study[]>([]), [plans, setPlans] = useState<InspectionPlan[]>([]);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [sourceKey, setSourceKey] = useState('qa'), [origin, setOrigin] = useState<QAOrigin>('synthetic_demo'), [title, setTitle] = useState('Container inspection review');
  const [asOf, setAsOf] = useState(today), [maxAge, setMaxAge] = useState('7'), [capacity, setCapacity] = useState('5');
  const [stageCheck, setStageCheck] = useState(false), [waterCheck, setWaterCheck] = useState(false), [emergenceCheck, setEmergenceCheck] = useState(false);
  const [selectedId, setSelectedId] = useState(''), [itemId, setItemId] = useState(''), [query, setQuery] = useState(''), [filter, setFilter] = useState('all');
  const selected = plans.find(p => p.id === selectedId) || plans[0];
  const availableStudies = studies.filter(s => latestPlan(s).status === 'recorded' && currentDataset(s)?.qaRecords.length);
  const chosenStudy = availableStudies.find(s => s.id === sourceKey.slice(6));
  const sourceCount = sourceKey === 'qa' ? records.filter(r => currentQA(r).data.origin === origin).length : chosenStudy ? currentDataset(chosenStudy)!.qaRecords.length : 0;
  const filtered = selected?.items.filter(item => (filter === 'all' || filter === 'suggested' && item.suggested || item.priority === filter) && (item.container + ' ' + item.batch + ' ' + item.location).toLowerCase().includes(query.toLowerCase())) || [];
  const item = filtered.find(i => i.id === itemId) || filtered[0];
  const changes = selected ? inspectionSourceChanges(selected.source, records, studies) : [];
  const accepted = selected?.items.filter(i => currentInspectionDecision(selected, i.id)?.action === 'accept').length || 0;
  async function readSources() { const [qa, s] = await Promise.all([getQAStore().list(), getStudyStore().list()]); return { qa, studies: s }; }
  useEffect(() => { let alive = true; if (!store) { setError('Local inspection storage is unavailable.'); setLoading(false); return; } Promise.all([readSources(), store.list()]).then(([s, p]) => { if (alive) { setRecords(s.qa); setStudies(s.studies); setPlans(p); } }).catch(e => { if (alive) setError(errorText(e)); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, [store]);
  function accept(plan: InspectionPlan) { setPlans(current => [plan, ...current.filter(p => p.id !== plan.id)]); setSelectedId(plan.id); setItemId(''); setQuery(''); setFilter('all'); }
  async function refresh() { if (!store) return; setBusy(true); setError(''); try { const [s, p] = await Promise.all([readSources(), store.list()]); setRecords(s.qa); setStudies(s.studies); setPlans(p); onNotice('Refreshed planning records and source revisions.'); } catch (e) { setError(errorText(e)); } finally { setBusy(false); } }
  async function loadExamples() { setBusy(true); setError(''); try { await getQAStore().addExamples(sampleQARecords()); const s = await readSources(); setRecords(s.qa); setStudies(s.studies); setSourceKey('qa'); setOrigin('synthetic_demo'); onNotice('Loaded the synthetic QA examples without replacing existing revisions.'); } catch (e) { setError(errorText(e)); } finally { setBusy(false); } }
  function sourceFromSelection(qa: QARecord[], s: Study[]): InspectionSource {
    if (sourceKey === 'qa') return { kind: 'qa_store', origin, records: qa.filter(r => currentQA(r).data.origin === origin) };
    const study = s.find(study => study.id === sourceKey.slice(6)); if (!study) throw new Error('Refresh and select an available study.'); return sourceFromStudy(study);
  }
  async function generate(event: FormEvent) {
    event.preventDefault(); if (!store) return; setBusy(true); setError('');
    try {
      if (!/^\d+$/.test(capacity) || maxAge && !/^\d+$/.test(maxAge)) throw new Error('Use whole numbers for capacity and the observation-age threshold.');
      const prior = sourceFromSelection(records, studies), fresh = await readSources();
      if (inspectionSourceChanges(prior, fresh.qa, fresh.studies).length) { setRecords(fresh.qa); setStudies(fresh.studies); throw new Error('Source records changed. Review the refreshed selection and generate again.'); }
      const config: InspectionConfig = { asOf, maxAgeDays: maxAge ? Number(maxAge) : null, capacity: Number(capacity), requireStageCounts: stageCheck, requireWaterTemperature: waterCheck, requireEmergence: emergenceCheck };
      const plan = makeInspectionPlan({ id: crypto.randomUUID(), title, createdAt: new Date().toISOString(), source: sourceFromSelection(fresh.qa, fresh.studies), config });
      await store.add(plan); setRecords(fresh.qa); setStudies(fresh.studies); accept(plan); onNotice('Saved an evidence-linked inspection queue. Suggestions await human decisions.');
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  async function regenerate() {
    if (!store || !selected) return; setBusy(true); setError('');
    try {
      const fresh = await readSources(); let source: InspectionSource;
      if (selected.source.kind === 'qa_store') source = { kind: 'qa_store', origin: selected.source.origin, records: fresh.qa.filter(r => currentQA(r).data.origin === selected.source.origin) };
      else { const studyId = selected.source.studyId, study = fresh.studies.find(s => s.id === studyId); if (!study) throw new Error('The source study is unavailable.'); source = sourceFromStudy(study); }
      const plan = makeInspectionPlan({ id: crypto.randomUUID(), title: selected.title, createdAt: new Date().toISOString(), source, config: selected.config, replacesPlanId: selected.id });
      await store.add(plan); setRecords(fresh.qa); setStudies(fresh.studies); accept(plan); onNotice('Generated a new plan from refreshed sources. Earlier plans and decisions were retained; decisions were not copied.');
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  async function decide(input: Omit<InspectionDecision, 'id' | 'number' | 'savedAt'>) {
    if (!store || !selected) return;
    const fresh = await readSources(), stale = inspectionSourceChanges(selected.source, fresh.qa, fresh.studies); setRecords(fresh.qa); setStudies(fresh.studies);
    if (stale.length) throw new Error('The source changed. Refresh and regenerate this plan before recording a new decision.');
    const updated = await store.decide(selected.id, selected.sequence, input); setPlans(current => [updated, ...current.filter(p => p.id !== updated.id)]); setSelectedId(updated.id); onNotice('Saved a versioned human decision. No external assignment was sent.');
  }
  const model = selected?.source.kind === 'study' ? selected.source.model : null;
  const pinned = selected && item ? inspectionRecords(selected.source).filter(r => item.relatedRecordIds.includes(r.id)) : [];
  return <div className="inspection-workspace">
    <section className="panel"><div className="panel-title"><div><h2>Create an inspection queue</h2><p>Evidence and chosen project checks determine the suggestions</p></div><span className="tag">Step 5</span></div>
      <form className="study-form" onSubmit={generate}><fieldset disabled={!store || loading || busy}><legend>Source, planning date and capacity</legend><div className="study-form-grid">
        <div className="study-wide"><label htmlFor="inspection-title">Plan title</label><input id="inspection-title" value={title} maxLength={200} required onChange={e => setTitle(e.target.value)}/></div>
        <div><label htmlFor="inspection-source">Evidence source</label><select id="inspection-source" value={sourceKey} onChange={e => setSourceKey(e.target.value)}><option value="qa">Current Container QA records</option>{availableStudies.map(s => <option key={s.id} value={'study:' + s.id}>{latestPlan(s).data.title} · plan {latestPlan(s).number}</option>)}</select></div>
        <div><label htmlFor="inspection-origin">Data origin</label><select id="inspection-origin" disabled={sourceKey !== 'qa'} value={sourceKey === 'qa' ? origin : chosenStudy ? latestPlan(chosenStudy).data.expectedOrigin : origin} onChange={e => setOrigin(e.target.value as QAOrigin)}>{Object.entries(ORIGINS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <div><label htmlFor="inspection-asof">Planning date</label><input id="inspection-asof" type="date" value={asOf} required onChange={e => setAsOf(e.target.value)}/></div>
        <div><label htmlFor="inspection-capacity">Suggested task capacity</label><input id="inspection-capacity" type="number" min={0} max={500} step={1} value={capacity} required onChange={e => setCapacity(e.target.value)}/></div>
        <div><label htmlFor="inspection-age">Observation-age threshold, days (optional)</label><input id="inspection-age" type="number" min={1} max={3650} step={1} value={maxAge} placeholder="Disabled" onChange={e => setMaxAge(e.target.value)}/></div>
      </div><p className="helper">{sourceCount} matching source records. Origins stay separate. The age threshold and capacity are editable workflow choices, not biological or public-health thresholds.</p></fieldset>
      <fieldset disabled={!store || loading || busy}><legend>Additional fields required by your project protocol</legend><label className="study-checkbox"><input type="checkbox" checked={stageCheck} onChange={e => setStageCheck(e.target.checked)}/>Stage counts at every listed life stage</label><label className="study-checkbox"><input type="checkbox" checked={waterCheck} onChange={e => setWaterCheck(e.target.checked)}/>Container-water temperature</label><label className="study-checkbox"><input type="checkbox" checked={emergenceCheck} onChange={e => setEmergenceCheck(e.target.checked)}/>A separate emergence assessment</label><p className="helper">Unchecked fields remain visible as supporting gaps but do not raise priority by themselves.</p></fieldset>
      <div className="button-row"><button className="button primary" disabled={!store || loading || busy || !sourceCount}>{busy ? 'Working…' : 'Generate inspection queue'}</button><button className="button secondary" type="button" disabled={!store || loading || busy} onClick={loadExamples}>Load synthetic QA examples</button><button className="subtle-button" type="button" disabled={!store || loading || busy} onClick={refresh}>Refresh plans and sources</button></div>
      {error && <p className="form-error" role="alert">{error}</p>}<p className="helper">Suggestions use explicit rules. Model evaluations are historical context; model scores and dengue charts do not rank this queue. Records and decisions stay in this browser.</p></form>
    </section>
    <details className="study-details inspection-methods"><summary>Inspection rules and workflow limits</summary><div className="study-plan-body"><ol>{INSPECTION_METHOD.map(rule => <li key={rule}>{rule}</li>)}</ol><p className="helper">This operational review follows the data/model checks; it is not exploratory data analysis. Data exploration and method selection belong before training.</p></div></details>
    {loading ? <section className="panel empty-state" role="status">Loading inspection plans…</section> : !selected ? <section className="panel empty-state"><strong>No inspection plan yet</strong><p>Select evidence or load synthetic QA examples, then generate a queue.</p></section> : <>
      <div className="inspection-picker"><div><label htmlFor="inspection-plan">Saved inspection plan</label><select id="inspection-plan" value={selected.id} onChange={e => { setSelectedId(e.target.value); setItemId(''); setQuery(''); setFilter('all'); }}>{plans.map(p => <option key={p.id} value={p.id}>{p.title} · {p.createdAt}</option>)}</select></div><button className="button secondary" disabled={busy} onClick={regenerate}>Regenerate from current sources</button></div>
      <section className="panel"><div className="panel-title"><div><h2>{selected.title}</h2><p>{ORIGINS[selected.source.origin]} · planning date {selected.config.asOf} · {selected.algorithmVersion}</p></div></div><div className="study-plan-body">
        {changes.length > 0 && <div className="inspection-stale" role="alert"><strong>Source changed — regenerate before new decisions</strong><ul>{changes.map(c => <li key={c}>{c}</li>)}</ul><p>Existing evidence and decisions still refer to this saved snapshot.</p></div>}
        <div className="study-metrics">{Object.entries({ 'Candidate groups': selected.items.length, 'Review first': selected.items.filter(i => i.priority === 'review_first').length, 'Suggested in capacity': selected.items.filter(i => i.suggested).length, 'Decisions pending': selected.items.filter(i => !currentInspectionDecision(selected, i.id)).length, 'Tasks accepted': accepted }).map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
        <p className="helper">{inspectionRecords(selected.source).length} pinned records · {selected.excluded.length} future-observation exclusions. {selected.replacesPlanId ? 'Regenerated from plan ' + selected.replacesPlanId + '; earlier decisions were not copied.' : 'Independent plan snapshot.'}</p>
        {accepted > selected.config.capacity && <p className="inspection-stale">Accepted tasks exceed this plan's suggested capacity. Review your recorded assignments.</p>}
        {model && <div className="inspection-model-note"><strong>Historical model context — excluded from ranking</strong><p>{model.status === 'evaluated' && model.metrics ? 'This saved run found ' + model.metrics.model.tp + '/' + (model.metrics.model.tp + model.metrics.model.fn) + ' failed test groups. Model accuracy: ' + ((model.metrics.model.accuracy || 0) * 100).toFixed(1) + '%; constant baseline: ' + ((model.metrics.prevalence.accuracy || 0) * 100).toFixed(1) + '%.' : 'The captured model run has insufficient data; no fitted performance is used.'}</p><p className="helper">{model.algorithmVersion} · {model.id} · {model.createdAt}. {model.createdAt.slice(0, 10) > selected.config.asOf ? 'This model run was created after the planning date and is retrospective context only.' : 'This is a retained evaluation, not a current field-risk forecast.'}</p></div>}
      </div></section>
      <div className="inspection-layout"><section className="panel inspection-queue"><div className="panel-title"><div><h2>Evidence-linked suggestions</h2><p>Priority, then oldest latest observation; every candidate remains reviewable</p></div></div><div className="inspection-filters"><div><label htmlFor="inspection-filter">Show</label><select id="inspection-filter" value={filter} onChange={e => { setFilter(e.target.value); setItemId(''); }}><option value="all">All candidates</option><option value="suggested">Within suggested capacity</option>{Object.entries(PRIORITIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div><label htmlFor="inspection-search">Find container or location</label><input id="inspection-search" value={query} onChange={e => setQuery(e.target.value)}/></div></div>
        <div className="table-scroll inspection-table"><table><thead><tr><th>Container / location</th><th>Priority / reason</th><th>Latest evidence</th><th>Decision</th><th>Action</th></tr></thead><tbody>{filtered.map(i => { const d = currentInspectionDecision(selected, i.id); return <tr key={i.id} className={item?.id === i.id ? 'inspection-selected' : ''}><td><strong>{i.container}</strong><span className="table-sub">{i.batch} · {i.location}</span><span className="table-sub">{i.suggested ? 'Suggested within capacity' : 'Outside suggested capacity'}</span></td><td><span className={'inspection-priority priority-' + i.priority}>{PRIORITIES[i.priority]}</span><span className="table-sub">{i.reasons[0]}</span></td><td>{i.latestOn}<span className="table-sub">{i.evidence.length} record reference{i.evidence.length === 1 ? '' : 's'}</span></td><td>{statusText(d)}{d?.dueOn && <span className="table-sub">{d.dueOn}</span>}</td><td><button className="table-action" onClick={() => setItemId(i.id)} aria-label={'Review ' + i.container + ' / ' + i.batch}>Review</button></td></tr>; })}</tbody></table>{!filtered.length && <p className="empty-state">No matching candidates. Future observations are retained in the audit's exclusion list.</p>}</div>
      </section>
      <section className="panel inspection-detail"><div className="panel-title"><div><h2>{item?.container || 'Suggestion details'}</h2><p>{item ? item.batch + ' · ' + item.location : 'Select a queue item'}</p></div></div>{item && <><div className="study-plan-body"><span className={'inspection-priority priority-' + item.priority}>{PRIORITIES[item.priority]}</span><ul className="inspection-reasons">{item.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul><details className="study-details"><summary>Supporting gaps and evidence references</summary><div className="inspection-evidence"><p>{item.gaps.join('; ') || 'No supporting gaps recorded.'}</p><p className="helper">Only selected required-field checks affect priority. Latest calendar-date references:</p><ul>{item.evidence.map(e => <li key={e.recordId}>{e.recordId} · revision {e.revision} · {e.observedOn}</li>)}</ul>{pinned.filter(r => item.evidence.some(e => e.recordId === r.id)).map(record => { const raw = currentQA(record).data, d = visibleInspectionData(raw, selected.config.asOf); return <div key={record.id}><strong>{record.id}</strong><p>Condition: {CONDITIONS[d.condition]}. QA as of planning: {OUTCOMES[d.outcome]}.</p>{raw.assessedOn && raw.assessedOn > selected.config.asOf && <p className="helper">A later QA assessment is excluded from current planning reasons.</p>}</div>; })}</div></details>
        {currentInspectionDecision(selected, item.id) && <div className="inspection-current-decision"><strong>{statusText(currentInspectionDecision(selected, item.id))}</strong><p>{currentInspectionDecision(selected, item.id)!.reason}</p><p className="helper">{currentInspectionDecision(selected, item.id)!.reviewer} · {currentInspectionDecision(selected, item.id)!.savedAt}</p></div>}
      </div><DecisionEditor key={selected.id + item.id + selected.sequence} plan={selected} item={item} blocked={busy || changes.length > 0} onSave={decide}/>
        <div className="study-plan-body"><details className="study-details"><summary>Full pinned QA history for this group</summary><pre>{JSON.stringify(pinned, null, 2)}</pre></details><details className="study-details"><summary>Decision history for this suggestion</summary><pre>{JSON.stringify(selected.decisions.filter(d => d.itemId === item.id), null, 2)}</pre></details></div>
      </>}</section></div>
      <section className="panel"><div className="panel-title"><div><h2>Planning report and audit</h2><p>Saved evidence, chosen rules, suggestions and all human decision versions</p></div></div><div className="study-plan-body"><div className="button-row"><button className="button secondary" onClick={() => download('wolbachia-inspection-report.md', inspectionReport(selected), 'text/markdown;charset=utf-8')}><Icon name="download" size={16}/>Export inspection report</button><button className="button secondary" onClick={() => download('wolbachia-inspection-queue.csv', inspectionCsv(selected), 'text/csv;charset=utf-8')}>Export inspection CSV</button><button className="button secondary" onClick={() => download('wolbachia-inspection-audit.json', inspectionAudit(selected), 'application/json')}>Export inspection audit</button></div><p className="helper">Export to retain a copy. Clearing browser data removes local plans. These outputs do not prescribe release quantities, establish infection status or predict dengue reduction.</p></div></section>
    </>}
  </div>;
}
