import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import Icon from './components/Icon.tsx';
import type { IconName } from './components/Icon.tsx';
import CaseChart from './components/CaseChart.tsx';
import BeadSample from './components/BeadSample.tsx';
import PhotoWorkspace from './components/PhotoWorkspace.tsx';
import { COUNTER_MODES, readImageEngine, saveImageEngine } from './lib/counter-routing.ts';
import type { ImageEngine } from './lib/counter-routing.ts';
import ContainerQA from './components/ContainerQA.tsx';
import StudyWorkspace from './components/StudyWorkspace.tsx';
import ModelWorkspace from './components/ModelWorkspace.tsx';
import InspectionWorkspace from './components/InspectionWorkspace.tsx';
import { readBrowserCapacity, formatCapacityBytes } from './lib/capacity.ts';
import type { BrowserCapacity } from './lib/capacity.ts';
import { parseFirebaseConfig, readSettings, storeSettings } from './lib/storage.ts';
import type { FirebaseSettings } from './lib/storage.ts';
import { caseSeries, csvCell, DASHBOARD_KEY, DATASET_ID, filteredObservations, LOCATIONS, locationName, MODE_LABELS, observationCsv, percentChange, PERIOD_END, readDashboardState, shortDate, validateReviewCount, VIEWS, WEEKS } from './lib/dashboard.ts';
import type { DashboardState, Observation, ProcessingMode, ReviewStatus, View } from './lib/dashboard.ts';

const NAV: { id: View; name: string; icon: IconName }[] = [
  { id: 'overview', name: 'Overview', icon: 'overview' }, { id: 'review', name: 'Image review', icon: 'image' },
  { id: 'containers', name: 'Container QA', icon: 'layers' },
  { id: 'studies', name: 'Study & review', icon: 'flask' },
  { id: 'trends', name: 'Trends & modelling', icon: 'chart' }, { id: 'planning', name: 'Inspection planning', icon: 'pin' },
  { id: 'settings', name: 'Data & settings', icon: 'settings' },
];
const TITLES: Record<View, [string, string]> = {
  overview: ['Field overview', 'Release-container observations, review queues and reported case trends.'],
  review: ['Image review', 'Count a bead-proxy image on Vercel or this device and preserve the human review.'],
  containers: ['Container QA', 'Stage-aware observations, separate outcomes and traceable records.'],
  studies: ['Study & review', 'Dated methods, pinned inputs, descriptive checks and review history.'],
  trends: ['Trends & modelling', 'Explore observed changes. Keep prediction and evidence distinct.'],
  planning: ['Inspection planning', 'Review evidence-linked suggestions and record accountable follow-up decisions.'],
  settings: ['Data & settings', 'Manage this demonstration workspace and your processing preferences.'],
};
const STATUS: Record<ReviewStatus, string> = { pending: 'To review', reviewed: 'Reviewed', rejected: 'Rejected' };
function Badge({ status }: { status: ReviewStatus }) { return <span className={'badge badge-' + status}>{status === 'reviewed' && <Icon name="check" size={13}/>} {STATUS[status]}</span>; }
function PanelTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return <div className="panel-title"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>;
}
function DownloadButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) { return <button className="button secondary" onClick={onClick}><Icon name="download" size={16}/>{children}</button>; }
function downloadFile(filename: string, contents: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function initialView(): View { const hash = window.location.hash.slice(1); return VIEWS.includes(hash as View) ? hash as View : 'overview'; }
function changeLabel(current: number, previous: number): string {
  const change = percentChange(current, previous);
  return change === null ? 'No prior-week comparison' : (change > 0 ? '+' : '') + change.toFixed(1) + '% vs prior week';
}
function FirebaseForm({ settings, onSave }: { settings: FirebaseSettings | null; onSave: (value: FirebaseSettings) => void }) {
  const [config, setConfig] = useState(settings ? JSON.stringify(settings.config, null, 2) : '');
  const [siteKey, setSiteKey] = useState(settings?.siteKey || '');
  const [model, setModel] = useState(settings?.model || 'gemini-3.5-flash-lite');
  const [error, setError] = useState('');
  function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    try {
      const value = { config: parseFirebaseConfig(config), siteKey: siteKey.trim(), model: model.trim() };
      if (!value.siteKey && !(import.meta.env.DEV && import.meta.env.VITE_APPCHECK_DEBUG === 'true')) throw new Error('Add the public reCAPTCHA Enterprise site key for App Check.');
      if (!value.model) throw new Error('Enter the model ID you enabled in Firebase.');
      storeSettings(value); onSave(value);
    } catch (err) { setError(err instanceof Error ? err.message : 'Settings could not be saved in this browser.'); }
  }
  return <form className="firebase-form" onSubmit={submit}>
    <div className="inline-note"><Icon name="info" size={17}/><p>You can connect later. Saving configuration does not make a live request or verify the connection.</p></div>
    <label htmlFor="firebase-config">Firebase web app configuration <span>Public JSON</span></label>
    <textarea id="firebase-config" className="code-input" value={config} onChange={e => setConfig(e.target.value)} spellCheck={false} placeholder={'{\n  "apiKey": "your-web-api-key",\n  "projectId": "your-project",\n  "appId": "your-web-app-id"\n}'} required/>
    <div className="form-grid"><div><label htmlFor="site-key">App Check site key</label><input id="site-key" value={siteKey} onChange={e => setSiteKey(e.target.value)} placeholder="reCAPTCHA Enterprise site key"/></div><div><label htmlFor="model-id">Cloud model ID</label><input id="model-id" value={model} onChange={e => setModel(e.target.value)} placeholder="Model enabled in your project" required/></div></div>
    <p className="helper">Use the Firebase web configuration and public site key. Keep service-account keys and App Check debug tokens out of this form. Verify the selected vision model, allowed domain and App Check when you perform the live image test.</p>
    {error && <p className="form-error" role="alert">{error}</p>}<button className="button primary" type="submit">Save Firebase settings</button>
  </form>;
}

export default function App() {
  const [view, setView] = useState<View>(initialView);
  const [studyFocusId,setStudyFocusId]=useState('');
  const [imageTab, setImageTab] = useState<'photos' | 'samples'>('photos');
  const [state, setState] = useState<DashboardState>(readDashboardState);
  const [imageEngine,setImageEngine]=useState<ImageEngine>(readImageEngine);
  useEffect(()=>saveImageEngine(imageEngine),[imageEngine]);
  const [settings, setSettings] = useState<FirebaseSettings | null>(readSettings);
  const [locationId, setLocationId] = useState('all'), [weeks, setWeeks] = useState(12);
  const [mobileNav, setMobileNav] = useState(false), [saveFailed, setSaveFailed] = useState(false);
  const [toast, setToast] = useState(''), [online, setOnline] = useState(navigator.onLine), [cacheFailed, setCacheFailed] = useState(false);
  const [capacity, setCapacity] = useState<BrowserCapacity | null>(null), [checking, setChecking] = useState(false);
  const [showNumbers, setShowNumbers] = useState(false);
  const [queueStatus, setQueueStatus] = useState<ReviewStatus | 'all'>('pending'), [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('OBS-004'), [count, setCount] = useState(''), [reviewNote, setReviewNote] = useState('');
  const [reviewError, setReviewError] = useState(''), [showGuides, setShowGuides] = useState(false);
  const observations = useMemo(() => filteredObservations(state, locationId, weeks), [state, locationId, weeks]);
  const series = useMemo(() => caseSeries(locationId, weeks), [locationId, weeks]);
  const locations = LOCATIONS.filter(l => locationId === 'all' || l.id === locationId);
  const pending = observations.filter(o => o.status === 'pending'), reviewed = observations.filter(o => o.status === 'reviewed');
  const last = series.at(-1)!, previous = series.at(-2)!;
  const queue = observations.filter(o => (queueStatus === 'all' || o.status === queueStatus) && (o.id + ' ' + o.container + ' ' + locationName(o.locationId)).toLowerCase().includes(query.toLowerCase().trim())).sort((a,b) => Number(a.status !== 'pending') - Number(b.status !== 'pending') || b.capturedAt.localeCompare(a.capturedAt));
  const selected = queue.find(o => o.id === selectedId) || queue[0];
  const totalCases = series.reduce((sum,p) => sum+p.cases, 0), reviewedPercentage = observations.length ? reviewed.length / observations.length * 100 : 0;

  useLayoutEffect(() => { window.scrollTo({ top: 0 }); }, [view]);
  useEffect(() => {
    const hash = () => { const next = window.location.hash.slice(1) as View; if (VIEWS.includes(next)) { setView(next); window.scrollTo({ top: 0 }); } setMobileNav(false); };
    const connection = () => setOnline(navigator.onLine), cache = () => setCacheFailed(true);
    window.addEventListener('hashchange', hash); window.addEventListener('online', connection); window.addEventListener('offline', connection); window.addEventListener('workshop-cache-error', cache);
    return () => { window.removeEventListener('hashchange', hash); window.removeEventListener('online', connection); window.removeEventListener('offline', connection); window.removeEventListener('workshop-cache-error', cache); };
  }, []);
  useEffect(() => { try { localStorage.setItem(DASHBOARD_KEY, JSON.stringify(state)); setSaveFailed(false); } catch { setSaveFailed(true); } }, [state]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 5000); return () => window.clearTimeout(timer); }, [toast]);
  const editNote = selected ? state.reviews[selected.id]?.note || '' : '';
  useEffect(() => {
    setCount(selected ? String(selected.reviewedCount ?? selected.estimate) : ''); setReviewNote(editNote); setReviewError(''); setShowGuides(false);
  }, [selected?.id, selected?.reviewedCount, selected?.estimate, editNote]);

  function navigate(next: View) { window.location.hash = next; setView(next); setMobileNav(false); window.scrollTo({ top: 0 }); }
  function openObservation(o: Observation) { setImageTab('samples'); setQueueStatus('all'); setQuery(''); setSelectedId(o.id); navigate('review'); }
  function exportObservations() { downloadFile('wolbachia-synthetic-observations.csv', observationCsv(observations)); setToast('Exported filtered sample records with synthetic-data labels.'); }
  function exportCases() {
    const rows: (string | number)[][] = [['dataset','provenance','location','week','reported_cases']];
    for (const l of locations) for (const p of caseSeries(l.id, weeks)) rows.push([DATASET_ID,'synthetic_demo',l.name,p.week,p.cases]);
    downloadFile('wolbachia-synthetic-case-records.csv', rows.map(row => row.map(csvCell).join(',')).join('\r\n'));
  }
  function saveReview(status: 'reviewed' | 'rejected') {
    if (!selected) return;
    try {
      const reviewedCount = status === 'reviewed' ? validateReviewCount(count) : null;
      if (status === 'rejected' && !reviewNote.trim()) throw new Error('Add a short reason before rejecting this demo record.');
      setState(current => ({ ...current, reviews: { ...current.reviews, [selected.id]: { status, count: reviewedCount, note: reviewNote.trim(), reviewedAt: new Date().toISOString() } } }));
      setReviewError(''); setToast(selected.container + ': demo review saved in this browser.');
    } catch (err) { setReviewError(err instanceof Error ? err.message : 'The review could not be saved.'); }
  }
  async function checkDevice() { setChecking(true); try { setCapacity(await readBrowserCapacity()); } catch { setToast('The browser could not provide a capacity reading.'); } finally { setChecking(false); } }
  function toggleFollowUp(id: string) { setState(current => ({ ...current, followUps: current.followUps.includes(id) ? current.followUps.filter(l => l !== id) : [...current.followUps, id] })); }
  function observationTable(rows: Observation[], limit?: number) {
    const shown = limit ? rows.slice(0, limit) : rows;
    return <div className="table-scroll"><table><thead><tr><th>Container / location</th><th>Captured</th><th className="numeric">Sample estimate</th><th className="numeric">Reviewed count</th><th>Status</th><th><span className="sr-only">Action</span></th></tr></thead><tbody>{shown.map(o => <tr key={o.id}><td><strong className="table-id">{o.container}</strong><span className="table-sub">{locationName(o.locationId)} · {o.id}</span></td><td>{shortDate(o.capturedAt)}</td><td className="numeric">{o.estimate}</td><td className="numeric">{o.reviewedCount ?? '—'}</td><td><Badge status={o.status}/></td><td><button className="table-link" onClick={() => openObservation(o)}>Open</button></td></tr>)}</tbody></table>{!shown.length && <div className="empty-state">No observations match these filters.</div>}</div>;
  }
  function trendPanel() {
    return <section className="panel trend-panel"><PanelTitle title="Reported dengue cases" subtitle="Synthetic weekly counts · observed, not predicted" action={<button className="subtle-button" onClick={() => setShowNumbers(v => !v)}>{showNumbers ? 'Hide numbers' : 'View numbers'}</button>}/><CaseChart series={series}/>{showNumbers && <div className="table-scroll chart-data"><table><thead><tr><th>Week starting</th><th className="numeric">Synthetic cases</th></tr></thead><tbody>{series.map(p => <tr key={p.week}><td>{shortDate(p.week,true)}</td><td className="numeric">{p.cases}</td></tr>)}</tbody></table></div>}<div className="panel-foot"><span><span className="mini-line"/>Weekly reported cases</span><span>Observed change does not establish intervention impact.</span></div></section>;
  }
  function overview() {
    return <>
      <div className="metric-grid">
        <article className="metric"><div><span>Locations in view</span><Icon name="pin" size={18}/></div><strong>{locations.length.toString().padStart(2,'0')}</strong><p>Fictional release locations</p></article>
        <article className="metric"><div><span>Container observations</span><Icon name="layers" size={18}/></div><strong>{observations.length}</strong><p>{reviewed.length} reviewed · {observations.filter(o => o.status === 'rejected').length} rejected</p></article>
        <article className="metric"><div><span>Awaiting review</span><Icon name="clock" size={18}/></div><strong>{pending.length.toString().padStart(2,'0')}</strong><p><button className="inline-link" onClick={() => { setImageTab('samples'); setQueueStatus('pending'); navigate('review'); }}>Open the review queue</button></p></article>
        <article className="metric"><div><span>Latest weekly cases</span><Icon name="chart" size={18}/></div><strong>{last.cases}</strong><p>{changeLabel(last.cases,previous.cases)}</p></article>
      </div>
      <div className="overview-grid">{trendPanel()}<section className="panel review-summary"><PanelTitle title="Review progress" subtitle="Human checks on sample observations"/><div className="review-donut" role="img" aria-label={reviewed.length + ' of ' + observations.length + ' sample observations reviewed'} style={{ background: 'conic-gradient(#148478 0% ' + reviewedPercentage + '%, #e9eef2 ' + reviewedPercentage + '% 100%)' }}><div><strong>{Math.round(reviewedPercentage)}<small>%</small></strong><span>reviewed</span></div></div><div className="review-legend"><span><i className="legend-dot reviewed-dot"/>Reviewed <strong>{reviewed.length}</strong></span><span><i className="legend-dot pending-dot"/>To review <strong>{pending.length}</strong></span><span><i className="legend-dot rejected-dot"/>Rejected <strong>{observations.filter(o => o.status === 'rejected').length}</strong></span></div><button className="button secondary full-width" onClick={() => { setImageTab('samples'); setQueueStatus('pending'); navigate('review'); }}>Continue reviewing</button></section></div>
      <section className="panel"><PanelTitle title="Review queue" subtitle="Sample estimates need a human check before use" action={<button className="subtle-button" onClick={() => { setImageTab('samples'); setQueueStatus('all'); navigate('review'); }}>View all observations</button>}/>{observationTable([...pending].sort((a,b) => b.capturedAt.localeCompare(a.capturedAt)),5)}<div className="panel-foot"><span>Sample estimates are fixtures. No image AI has run.</span><span>{pending.length} awaiting review</span></div></section>
      <section className="next-build-note"><div className="note-icon"><Icon name="flask" size={20}/></div><div><strong>From observation to field decision</strong><p>Container QA, study review, model evaluation and evidence-linked inspection planning are available.</p></div><button className="subtle-button" onClick={() => navigate('trends')}>View modelling scope</button></section>
    </>;
  }
  function demoReviewView() {
    return <>
      <div className="review-toolbar"><div className="segmented" aria-label="Filter review status">{(['pending','all','reviewed','rejected'] as const).map(status=><button key={status} className={queueStatus===status?'active':''} aria-pressed={queueStatus===status} onClick={()=>setQueueStatus(status)}>{status==='all'?'All records':STATUS[status]}<span>{status==='all'?observations.length:observations.filter(o=>o.status===status).length}</span></button>)}</div><div className="search-input"><Icon name="search" size={17}/><input aria-label="Search container or location" placeholder="Find container or location" value={query} onChange={e=>setQuery(e.target.value)}/></div></div>
      <div className="image-review-layout"><section className="panel queue-panel"><div className="queue-heading"><h2>Demo observations</h2><span className="muted">{queue.length} records</span></div><div className="observation-list">{queue.map(o=><button className={'observation-item '+(selected?.id===o.id?'selected':'')} key={o.id} onClick={()=>setSelectedId(o.id)} aria-pressed={selected?.id===o.id}><span className="queue-thumb"><Icon name="image" size={22}/></span><span className="observation-detail"><strong>{o.container}</strong><span>{locationName(o.locationId)} · {shortDate(o.capturedAt)}</span><Badge status={o.status}/></span></button>)}{!queue.length&&<div className="empty-state"><strong>No matching demo records</strong><button className="subtle-button" onClick={()=>{setQueueStatus('all');setQuery('');}}>Show all records</button></div>}</div></section>
      <section className="panel image-panel"><PanelTitle title={selected?.container||'Sample illustration'} subtitle={selected?locationName(selected.locationId)+' · '+shortDate(selected.capturedAt,true):'Select a demo observation'} action={<span className="tag">Fixture · no AI</span>}/><div className="image-stage">{selected?<BeadSample count={selected.beadCount} seed={Number(selected.id.slice(-3))} showGuides={showGuides}/>:<div className="empty-state">Choose a sample observation.</div>}</div><div className="image-stage-footer"><span>Bead illustration · not a photograph</span><label className="checkbox-label"><input type="checkbox" checked={showGuides} onChange={e=>setShowGuides(e.target.checked)}/>Illustration guides</label></div><p className="image-caption">Reference positions and sample estimates are predefined fixtures, not AI detections.</p><div className="upload-row"><button className="button secondary" onClick={()=>setImageTab('photos')}><Icon name="upload" size={16}/>Open saved image tests</button></div></section>
      <section className="panel decision-panel"><PanelTitle title="Demo count review" subtitle="Synthetic observation"/><div className="estimate-box"><span>Sample estimate</span><strong>{selected?.estimate??'—'}</strong><span>Predefined fixture · no AI request</span></div><div className="review-form"><label htmlFor="review-count">Reviewed count</label><input id="review-count" inputMode="numeric" value={count} disabled={!selected} onChange={e=>setCount(e.target.value)}/><label htmlFor="review-note">Review note <span>Optional for acceptance</span></label><textarea id="review-note" value={reviewNote} onChange={e=>setReviewNote(e.target.value)} disabled={!selected} maxLength={500} rows={3}/>{reviewError&&<p className="form-error" role="alert">{reviewError}</p>}<button className="button primary full-width" disabled={!selected} onClick={()=>saveReview('reviewed')}>Save demo review</button><button className="button secondary full-width" disabled={!selected} onClick={()=>saveReview('rejected')}>Reject demo record</button></div><div className="review-trace"><Icon name="info" size={16}/><p>Demo edits update only the synthetic overview. Saved image tests have their own review history.</p></div></section></div>
    </>;
  }
  function reviewView() {
    return <><div className="image-workspace-tabs" aria-label="Image workspace"><button className={imageTab==='photos'?'active':''} aria-pressed={imageTab==='photos'} onClick={()=>setImageTab('photos')}>Your image tests</button><button className={imageTab==='samples'?'active':''} aria-pressed={imageTab==='samples'} onClick={()=>setImageTab('samples')}>Demo examples <span>Fixtures · no AI</span></button></div>{imageTab==='photos'?<PhotoWorkspace settings={settings} engine={imageEngine} onEngine={setImageEngine} mode={state.mode} onMode={mode=>setState(current=>({...current,mode}))} onConfigure={()=>navigate('settings')} onNotice={setToast}/>:demoReviewView()}</>;
  }
  function filterBar() { return <div className="filter-bar"><div className="filter-controls"><div className="filter-select"><Icon name="pin" size={16}/><label className="sr-only" htmlFor="location-filter">Location</label><select id="location-filter" value={locationId} onChange={e => setLocationId(e.target.value)}><option value="all">All demo locations</option>{LOCATIONS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select><Icon name="chevron" size={15}/></div><div className="filter-select"><Icon name="clock" size={16}/><label className="sr-only" htmlFor="week-filter">Date range</label><select id="week-filter" value={weeks} onChange={e => setWeeks(Number(e.target.value))}><option value="12">Last 12 weeks</option><option value="8">Last 8 weeks</option><option value="4">Last 4 weeks</option></select><Icon name="chevron" size={15}/></div><span className="filter-date">{shortDate(WEEKS[12-weeks])} – {shortDate(PERIOD_END,true)}</span></div><button className="runtime-chip" onClick={() => navigate('settings')}><Icon name={state.mode === 'local' ? 'device' : 'cloud'} size={16}/>{state.mode === 'cloud' ? 'Cloud default' : state.mode === 'local' ? 'Device only' : state.mode === 'cloud-first' ? 'Cloud preferred' : 'Device preferred'}<span>· {imageEngine==='bead_cv'?'Small bead counter':settings ? 'Firebase unverified' : 'Firebase not connected'}</span></button></div>; }
  function trends() {
    const change = percentChange(last.cases,series[0].cases);
    return <><ModelWorkspace onNotice={setToast} onOpenStudy={id=>{setStudyFocusId(id);navigate('studies');}}/><div className="case-context-note"><h2>Synthetic case context</h2><p>The filters and charts below do not change the model dataset or establish dengue impact.</p></div>{filterBar()}<div className="metric-grid trends-metrics"><article className="metric"><div><span>Cases in selected period</span><Icon name="layers" size={18}/></div><strong>{totalCases}</strong><p>Sum of synthetic reported cases</p></article><article className="metric"><div><span>First-to-latest week</span><Icon name="chart" size={18}/></div><strong>{change === null ? '—' : change.toFixed(1) + '%'}</strong><p>Observed change · no causal claim</p></article><article className="metric"><div><span>Container prediction</span><Icon name="flask" size={18}/></div><strong>QA</strong><p>Evaluated separately above</p></article></div>{trendPanel()}<section className="panel"><PanelTitle title="Location comparison" subtitle={'Latest two weeks · ' + shortDate(previous.week) + ' and ' + shortDate(last.week)} action={<DownloadButton onClick={exportCases}>Export case data</DownloadButton>}/><div className="table-scroll"><table><thead><tr><th>Location</th><th className="numeric">Previous week</th><th className="numeric">Latest week</th><th className="numeric">Observed change</th><th className="numeric">Population, mock</th></tr></thead><tbody>{locations.map(l => <tr key={l.id}><td><strong>{l.name}</strong><span className="table-sub">{l.sector} sector · fictional</span></td><td className="numeric">{l.cases.at(-2)}</td><td className="numeric">{l.cases.at(-1)}</td><td className="numeric">{changeLabel(l.cases.at(-1)!,l.cases.at(-2)!).replace(' vs prior week','')}</td><td className="numeric">{l.population.toLocaleString()}</td></tr>)}</tbody></table></div></section></>;
  }
  function legacyPlanning() {
    return <><div className="planning-intro"><Icon name="info" size={20}/><p><strong>Manual demonstration planning.</strong> The signals below come from sample records. They are not model-generated deployment recommendations.</p><span className="tag">{state.followUps.length} on follow-up list</span></div><div className="location-grid">{locations.map(l => {
      const waiting = observations.filter(o => o.locationId === l.id && o.status === 'pending').length, change = percentChange(l.cases.at(-1)!,l.cases.at(-2)!);
      return <article className={'panel location-card ' + (state.followUps.includes(l.id) ? 'in-plan' : '')} key={l.id}><div className="location-heading"><span className="location-icon"><Icon name="pin" size={22}/></span><div><h2>{l.name}</h2><p>{l.sector} sector · mock location</p></div><span className="location-code">{l.id}</span></div><div className="location-values"><div><span>Latest cases</span><strong>{l.cases.at(-1)}</strong></div><div><span>To review</span><strong>{waiting}</strong></div><div><span>Week change</span><strong>{change === null ? '—' : (change > 0 ? '+' : '') + change.toFixed(0) + '%'}</strong></div></div><div className="location-signal"><span className="mini-label">RECORD SIGNALS</span><p>{waiting ? waiting + ' container observations awaiting review.' : 'No observations awaiting review in this selection.'} {change !== null && change > 0 ? 'Synthetic reported cases increased from the prior week.' : 'Inspect reporting completeness before interpreting the case trend.'}</p></div><div className="mock-coordinates">Mock coordinates: {l.coordinates.map(n => n.toFixed(3)).join(', ')}</div><button className={'button full-width ' + (state.followUps.includes(l.id) ? 'selected-button' : 'secondary')} onClick={() => toggleFollowUp(l.id)} aria-pressed={state.followUps.includes(l.id)}>{state.followUps.includes(l.id) && <Icon name="check" size={16}/>} {state.followUps.includes(l.id) ? 'On demo follow-up list' : 'Add to demo follow-up'}</button></article>;
    })}</div><section className="panel"><PanelTitle title="Before real deployment" subtitle="Future field phase"/><div className="field-scope">{[
      ['Validate the observations','Use real images, reliable counts and dated laboratory or intervention records where needed.'],
      ['Evaluate the planning method','Check predictive performance, missing data and operating constraints with researchers.'],
      ['Obtain human approval','Field deployment decisions belong with the responsible health programme.'],
    ].map(([title,text],i) => <div key={title}><span className="scope-number">{i+1}</span><div><strong>{title}</strong><p>{text}</p></div></div>)}</div></section></>;
  }
  function dataSettings() {
    return <div className="settings-layout"><div className="settings-main"><section className="panel"><PanelTitle title="Processing preference" subtitle="Small image counting works without Firebase"/><div className="settings-content"><label htmlFor="settings-image-engine">Image counting method</label><div className="select-wrap"><Icon name="image" size={18}/><select id="settings-image-engine" value={imageEngine} onChange={e=>setImageEngine(e.target.value as ImageEngine)}><option value="bead_cv">Small bead counter · no Firebase</option><option value="firebase">Firebase vision model · optional</option></select><Icon name="chevron" size={16}/></div><label htmlFor="processing-mode">Where should image counting run?</label><div className="select-wrap"><Icon name={state.mode === 'local' || state.mode === 'hybrid' ? 'device' : 'cloud'} size={18}/><select id="processing-mode" value={state.mode} onChange={e => setState(current => ({ ...current, mode: e.target.value as ProcessingMode }))}>{Object.entries(imageEngine==='bead_cv'?COUNTER_MODES:MODE_LABELS).map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select><Icon name="chevron" size={16}/></div><p className="helper">{imageEngine==='bead_cv'?(state.mode==='local'?'The small counter runs in this browser; no image upload. Its worker needs no model download.':'The same small counter can run in a Vercel function. Fallback happens only if your selected mode permits it. The result names the route actually used.') : state.mode === 'local' ? 'Device-only never permits cloud fallback. The image-capable local model must already be ready; manual review is available otherwise.' : state.mode === 'cloud' ? 'Cloud-only avoids preparing a local model. Image counting uses the cloud adapter after Firebase setup.' : 'This preference permits fallback. Image requests check image-model readiness separately from text.'}</p><div className="settings-status"><Icon name="cloud" size={17}/><span>Computed results identify their actual execution source. Manual counts keep their own label.</span></div></div></section><section className="panel" id="firebase-settings"><PanelTitle title="Optional Firebase connection" subtitle="Separate vision-model adapter · AI Logic + App Check" action={<span className="tag">{settings ? 'Configuration saved · unverified' : 'Set up later'}</span>}/><FirebaseForm settings={settings} onSave={value => { setSettings(value); setToast('Firebase configuration saved. A live connection has not been tested.'); }}/></section><section className="panel"><PanelTitle title="Demonstration data" subtitle="Transparent inputs for interface testing"/><div className="settings-content"><dl className="definition-list"><div><dt>Dataset</dt><dd>{DATASET_ID}</dd></div><div><dt>Locations and cases</dt><dd>Fictional locations · synthetic weekly counts</dd></div><div><dt>Image material</dt><dd>Bead illustrations used as larva proxies</dd></div><div><dt>Your changes</dt><dd>Demo reviews and follow-up choices, saved on this browser</dd></div><div><dt>Saved image tests</dt><dd>Original photos, computed results and human review history, stored separately on this browser</dd></div></dl><div className="button-row"><DownloadButton onClick={exportObservations}>Export observations</DownloadButton><DownloadButton onClick={exportCases}>Export case data</DownloadButton></div><button className="reset-button" onClick={() => { setState(current => ({ ...current, reviews: {}, followUps: [] })); setToast('Demo changes reset. Firebase settings and processing preference were kept.'); }}>Reset demo changes</button><p className="helper">Reset affects demo edits and follow-ups only. Saved image tests are kept.</p></div></section></div><aside className="settings-aside"><section className="panel"><PanelTitle title="Device capacity" subtitle="Read only, on your click"/><div className="settings-content"><p className="helper">Browser measurements are limited. They do not expose exact spare system RAM or establish support for image inference.</p><button className="button secondary full-width" onClick={checkDevice} disabled={checking}><Icon name="device" size={17}/>{checking ? 'Reading…' : capacity ? 'Refresh device reading' : 'Check this browser'}</button>{capacity && <><dl className="capacity-list"><div><dt>RAM estimate</dt><dd>{capacity.approximateMemoryGiB === null ? 'Not exposed' : '≈ ' + capacity.approximateMemoryGiB + ' GiB'}</dd></div><div><dt>Logical processors</dt><dd>{capacity.logicalProcessors ?? 'Not exposed'}</dd></div><div><dt>Free system RAM</dt><dd>Not exposed</dd></div><div><dt>Site storage use</dt><dd>{formatCapacityBytes(capacity.storageUsageBytes)}</dd></div><div><dt>Site storage quota</dt><dd>{formatCapacityBytes(capacity.storageQuotaBytes)}</dd></div><div><dt>Text model readiness</dt><dd>{capacity.localModel}</dd></div></dl><p className="helper">Site quota is not free disk. Text-model readiness does not establish image capability. This reading stays in the browser.</p></>}</div></section><section className="panel"><PanelTitle title="Build status"/><div className="settings-content build-checklist"><span><Icon name="check" size={16}/>Dashboard & sample workflow</span><span><Icon name="check" size={16}/>Small bead counter, cloud/device routes & review</span><span><Icon name="check" size={16}/>Container QA records & history</span><span><Icon name="check" size={16}/>Study setup & numeric ML evaluation</span><span><Icon name="check" size={16}/>Evidence-linked inspection planning</span><span><Icon name="clock" size={16}/>Statistical hypothesis tests not implemented</span><span><Icon name="clock" size={16}/>Real-image validation & optional Firebase verification</span></div></section></aside></div>;
  }
  return <div className="dashboard-app">
    <header className="app-titlebar"><div><Icon name="layers" size={18}/><strong>Wolbachia Field Review</strong></div><span>Demonstration · Browser-local records</span></header>
    <a className="skip-link" href="#main-content">Skip to dashboard content</a>
    {mobileNav && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)}/>}
    <aside className={'sidebar ' + (mobileNav ? 'is-open' : '')} aria-label="Main navigation"><a className="brand" href="#overview" onClick={() => setMobileNav(false)}><span className="brand-mark"><Icon name="layers" size={25}/></span><span>Wolbachia<strong>Field Review</strong></span></a><div className="workspace-label"><span className="workspace-symbol">D</span><div><strong>Demo district</strong><span>Demonstration workspace</span></div></div><span className="nav-section-label">WORKSPACE</span><nav>{NAV.map(item => <a key={item.id} href={'#'+item.id} className={'nav-item '+(view === item.id ? 'active' : '')} aria-current={view === item.id ? 'page' : undefined} onClick={() => setMobileNav(false)}><Icon name={item.icon} size={19}/>{item.name}{item.id === 'review' && imageTab === 'samples' && pending.length > 0 && <span className="nav-count">{pending.length}</span>}</a>)}</nav><div className="sidebar-bottom"><div className="sidebar-build"><Icon name="flask" size={18}/><div><strong>Research prototype</strong><p>Vercel / browser counter · v0.8</p></div></div><div className="sidebar-person"><span className="avatar">WK</span><div><strong>Demo operator</strong><span>Browser-local workspace</span></div></div></div></aside>
    <div className="main-column"><header className="topbar"><div className="breadcrumb"><button className="icon-button menu-button" aria-label="Open navigation" aria-expanded={mobileNav} onClick={() => setMobileNav(v => !v)}><Icon name="menu"/></button><span>Programme workspace</span><span className="breadcrumb-separator">/</span><strong>{NAV.find(n => n.id === view)?.name}</strong></div><div className="topbar-right"><span className={'connection-state '+(online ? '' : 'offline')}><i/>{online ? 'Browser online' : 'Browser offline'}</span><button className="topbar-settings" onClick={() => navigate('settings')} aria-label="Open data and settings"><Icon name="settings" size={19}/></button><span className="avatar top-avatar">WK</span></div></header>
    <nav className="workspace-tabs" aria-label="Workspace views">{NAV.map(item => <a key={item.id} href={'#'+item.id} className={'workspace-tab '+(view === item.id ? 'active' : '')} aria-current={view === item.id ? 'page' : undefined} onClick={() => setMobileNav(false)}><Icon name={item.icon} size={16}/>{item.name}</a>)}</nav>
    <main id="main-content" className="main-content" tabIndex={-1}><div className="demo-banner"><span className="demo-label"><Icon name="flask" size={15}/>{view === 'containers' || view === 'studies' || view === 'trends' || view === 'planning' ? 'RECORD PROVENANCE' : 'PROTOTYPE DATA'}</span><p>{view === 'planning' ? 'Inspection plans retain their selected evidence origin and source revisions. Suggestions require human review; model scores and case charts do not rank the queue.' : view === 'containers' ? 'QA records carry their own origin labels. Synthetic examples, bead proxies and user-entered field observations remain distinct.' : view === 'trends' ? 'Models use the selected study snapshot’s declared origin. Case charts remain separate synthetic context.' : view === 'studies' ? 'Studies retain declared data origins, dated plan versions and input snapshots. Review labels are entered by the operator.' : 'Case records and locations are synthetic. Image tests distinguish uploaded photos, generated proxies and computed results.'}</p><button onClick={() => navigate('settings')}>About the data</button></div>{saveFailed && <p className="storage-warning" role="alert">Browser storage is unavailable. Changes last only in this open tab; export records before leaving.</p>}{cacheFailed && <p className="storage-warning" role="alert">Offline page caching was unavailable. Browser-local data storage is separate.</p>}
      <div className="page-heading"><div><span className="eyebrow">WOLBACHIA OPERATIONS · PROTOTYPE</span><h1>{TITLES[view][0]}</h1><p>{TITLES[view][1]}</p></div><div className="heading-actions">{view === 'overview' || (view === 'review' && imageTab === 'samples') ? <DownloadButton onClick={exportObservations}>Export sample data</DownloadButton> : null}{view !== 'containers' && view !== 'studies' && view !== 'trends' && view !== 'planning' && <button className="button primary" onClick={() => navigate(view === 'settings' ? 'overview' : 'settings')}>{view === 'settings' ? 'Back to overview' : 'Processing settings'}</button>}</div></div>
      {view !== 'settings' && view !== 'trends' && view !== 'planning' && view !== 'containers' && view !== 'studies' && !(view === 'review' && imageTab === 'photos') && filterBar()}
      <div className="page-body">{view === 'overview' ? overview() : view === 'review' ? reviewView() : view === 'containers' ? <ContainerQA onNotice={setToast}/> : view === 'studies' ? <StudyWorkspace onNotice={setToast} initialStudyId={studyFocusId}/> : view === 'trends' ? trends() : view === 'planning' ? <><InspectionWorkspace onNotice={setToast}/><details className="legacy-planning"><summary>Earlier manual location demo</summary><div className="legacy-planning-body">{legacyPlanning()}</div></details></> : dataSettings()}</div>
      <footer className="workspace-footer"><span><Icon name={saveFailed ? 'info' : 'check'} size={14}/>{saveFailed ? 'Changes are temporary in this tab' : 'Preferences saved on this browser'}</span><span>Independent prototype · no field deployment</span></footer>
    </main></div>
    {toast && <div className="toast" role="status"><Icon name="check" size={18}/><span>{toast}</span><button className="icon-button" onClick={() => setToast('')} aria-label="Dismiss notification"><Icon name="close" size={16}/></button></div>}
  </div>;
}
