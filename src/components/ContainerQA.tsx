import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import Icon from './Icon.tsx';
import { CONDITIONS, currentQA, EMERGENCE, ORIGINS, OUTCOMES, qaAge, qaAudit, qaCsv, qaGaps, sampleQARecords, TEMPERATURES, validateQA } from '../lib/qa-records.ts';
import type { QAPayload, QARecord } from '../lib/qa-records.ts';
import { getQAStore } from '../lib/qa-store.ts';
import type { QAStore } from '../lib/qa-store.ts';

type Draft = { [K in keyof QAPayload]: string };
const COUNT_FIELDS = ['initialEggs','larvae','pupae','pupalSkins','deadImmatures','deadAdults','emergedAdults'] as const;
const STAGES = [['larvae','Live larvae'],['pupae','Live pupae'],['pupalSkins','Empty pupal cases'],['deadImmatures','Dead larvae / pupae'],['deadAdults','Dead adults']] as const;
const message = (error: unknown) => error instanceof Error ? error.message : 'The QA operation could not be completed.';
const shown = (value: number | string | null) => value === null || value === '' ? 'Unknown' : String(value);
function today() { const d=new Date(); return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'); }
function emptyQA(): QAPayload {
  return {origin:'bead_proxy',container:'',batch:'',location:'',locationKind:'mock',setupOn:null,observedOn:today(),observedTime:null,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC',initialEggs:null,sourceReference:'',larvae:null,pupae:null,pupalSkins:null,deadImmatures:null,deadAdults:null,condition:'unknown',temperatureC:null,temperatureBasis:'not_measured',temperatureSource:'',emergenceBasis:'not_assessed',emergedAdults:null,emergenceOn:null,emergenceMethod:'',outcome:'not_assessed',assessedOn:null,assessor:'',protocolReference:'',notes:''};
}
function draftFor(data: QAPayload): Draft { return Object.fromEntries(Object.entries(data).map(([key,value])=>[key,value===null?'':String(value)])) as Draft; }
function parsedDraft(draft: Draft): QAPayload {
  const data: Record<string,unknown> = {...draft};
  for(const key of COUNT_FIELDS) { if(draft[key] && !/^\d+$/.test(draft[key]))throw new Error('Counts must be whole numbers or blank for unknown.'); data[key]=draft[key]===''?null:Number(draft[key]); }
  for(const key of ['setupOn','observedTime','emergenceOn','assessedOn'] as const)data[key]=draft[key]||null;
  data.temperatureC=draft.temperatureC===''?null:Number(draft.temperatureC);
  return validateQA(data);
}
function download(name: string, contents: string, type: string) {
  const url=URL.createObjectURL(new Blob([contents],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function Field({name,label,children}: {name:string;label:string;children:ReactNode}) { return <div className="qa-field"><label htmlFor={'qa-'+name}>{label}</label>{children}</div>; }
function QAForm({record,store,onSaved,onCancel}:{record:QARecord|null;store:QAStore;onSaved:(record:QARecord)=>void;onCancel:()=>void}) {
  const [draft,setDraft]=useState<Draft>(()=>draftFor(record?currentQA(record).data:emptyQA()));
  const [reason,setReason]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  function change(key:keyof Draft,value:string) { setDraft(previous=>{
    const next={...previous,[key]:value};
    if(key==='origin' && value!=='field_observation')next.locationKind='mock';
    if(key==='temperatureBasis' && value==='not_measured'){next.temperatureC='';next.temperatureSource='';}
    if(key==='emergenceBasis' && value==='not_assessed'){next.emergedAdults='';next.emergenceOn='';next.emergenceMethod='';}
    if(key==='outcome' && value==='not_assessed'){next.assessedOn='';next.assessor='';next.protocolReference='';}
    return next;
  }); }
  function input(key:keyof Draft,label:string,type='text',required=false) {
    return <Field key={key} name={key} label={label}><input id={'qa-'+key} type={type} value={draft[key]} required={required} onChange={e=>change(key,e.target.value)} placeholder={type==='number'?'Unknown':undefined} min={type==='number'&&key!=='temperatureC'?0:undefined} max={COUNT_FIELDS.includes(key as typeof COUNT_FIELDS[number])?100000:undefined} step={type==='number'?(key==='temperatureC'?'any':1):undefined} maxLength={type==='text'?200:undefined}/></Field>;
  }
  function select(key:keyof Draft,label:string,options:Record<string,string>,disabled=false) {
    return <Field name={key} label={label}><div className="qa-select"><select id={'qa-'+key} value={draft[key]} onChange={e=>change(key,e.target.value)} disabled={disabled}>{Object.entries(options).map(([value,text])=><option key={value} value={value}>{text}</option>)}</select><Icon name="chevron" size={15}/></div></Field>;
  }
  async function save(event:FormEvent) {
    event.preventDefault();setError('');setBusy(true);
    try {
      const data=parsedDraft(draft);let saved:QARecord;
      if(record)saved=await store.revise(record.id,currentQA(record).number,data,reason);
      else {const at=new Date().toISOString();saved={schemaVersion:1,id:crypto.randomUUID(),createdAt:at,revisions:[{number:1,savedAt:at,reason:'Create manually entered QA observation',data}]};await store.add(saved);}
      onSaved(saved);
    }catch(e){setError(message(e));}finally{setBusy(false);}
  }
  return <section className="panel qa-editor"><div className="panel-title"><div><h2>{record?'Revise QA observation':'New QA observation'}</h2><p>Edits are unsaved until you save. Leave unobserved values blank.</p></div><span className="tag">{record?'Revision '+(currentQA(record).number+1):'Manual entry'}</span></div>
    <form onSubmit={save} className="qa-form">
      <fieldset disabled={busy}><legend>Container and observation</legend><div className="qa-form-grid">
        {select('origin','Record origin',ORIGINS,!!record)}{input('container','Container reference','text',true)}{input('batch','Batch / release cycle reference','text',true)}{input('location','Location reference','text',true)}
        {select('locationKind','Location provenance',{mock:'Mock / fictional reference',user_reference:'User-supplied reference'},draft.origin!=='field_observation')}{input('setupOn','Setup date (optional)','date')}{input('observedOn','Observation date','date',true)}{input('observedTime','Observation time (optional)','time')}{input('timeZone','Observation time zone','text',true)}
      </div><p className="helper">Origin stays fixed after creation. A field-observation label is user supplied; it is not independent verification. Repeated visits should be separate observations of the same container and batch.</p></fieldset>
      <fieldset disabled={busy}><legend>Stage counts and condition</legend><p className="helper">Blank means unknown; 0 means checked and none found. Viability must be checked separately; a still image alone may not establish it.</p><div className="qa-form-grid qa-stage-grid">{STAGES.map(([key,label])=>input(key,label,'number'))}</div><div className="qa-form-grid">{select('condition','Container condition',CONDITIONS)}{input('initialEggs','Starting eggs, if known','number')}{input('sourceReference','Starting quantity / image / source reference')}</div><p className="helper">A starting quantity needs a source reference. Image-review estimates are not automatically copied into biological stage counts.</p></fieldset>
      <details className="qa-form-section" open={draft.temperatureBasis!=='not_measured'}><summary>Temperature at observation (optional)</summary><fieldset disabled={busy}><legend className="sr-only">Temperature details</legend><div className="qa-form-grid">{select('temperatureBasis','Temperature basis',TEMPERATURES)}{draft.temperatureBasis!=='not_measured'&&<>{input('temperatureC','Temperature (°C)','number',true)}{input('temperatureSource','Sensor / station / source reference','text',true)}</>}</div><p className="helper">Air and weather records keep their own labels. They are not converted into container-water temperature or heat-exposure duration.</p></fieldset></details>
      <details className="qa-form-section" open={draft.emergenceBasis!=='not_assessed'}><summary>Emergence result (optional)</summary><fieldset disabled={busy}><legend className="sr-only">Emergence details</legend><div className="qa-form-grid">{select('emergenceBasis','Emergence basis',EMERGENCE)}{draft.emergenceBasis!=='not_assessed'&&<>{input('emergedAdults','Adult emergence count','number',true)}{input('emergenceOn','Emergence assessment date','date',true)}</>}</div>{draft.emergenceBasis!=='not_assessed'&&<Field name="emergenceMethod" label="Measurement or estimation method / reference"><textarea id="qa-emergenceMethod" value={draft.emergenceMethod} onChange={e=>change('emergenceMethod',e.target.value)} maxLength={2000} rows={2} required/></Field>}<p className="helper">This is a separately entered result. No emergence count is inferred from a decline in larvae or from empty pupal cases alone.</p></fieldset></details>
      <details className="qa-form-section" open={draft.outcome!=='not_assessed'}><summary>QA outcome and reference (optional)</summary><fieldset disabled={busy}><legend className="sr-only">QA outcome details</legend><div className="qa-form-grid">{select('outcome','QA outcome',OUTCOMES)}{draft.outcome!=='not_assessed'&&<>{input('assessedOn','QA assessment date','date',true)}{input('assessor','Assessor label','text',true)}</>}</div>{draft.outcome!=='not_assessed'&&<Field name="protocolReference" label="Applied protocol / assessment reference"><textarea id="qa-protocolReference" value={draft.protocolReference} onChange={e=>change('protocolReference',e.target.value)} maxLength={2000} rows={2} required/></Field>}<p className="helper">The outcome and assessor label are supplied by the operator. No pass/fail threshold or scientific certification is generated by this app.</p></fieldset></details>
      <fieldset disabled={busy}><legend>Notes and provenance</legend><Field name="notes" label="Observation notes"><textarea id="qa-notes" value={draft.notes} onChange={e=>change('notes',e.target.value)} maxLength={2000} rows={3}/></Field>{record&&<div className="qa-field"><label htmlFor="qa-reason">Reason for this revision</label><input id="qa-reason" value={reason} onChange={e=>setReason(e.target.value)} maxLength={500} required/></div>}<p className="helper">No Wolbachia assay result is captured here. Keep laboratory findings in their original records; image appearance cannot establish infection.</p></fieldset>
      {error&&<p className="form-error" role="alert">{error}</p>}<div className="qa-form-actions"><button type="submit" className="button primary" disabled={busy}>{busy?'Saving…':record?'Save new revision':'Save QA observation'}</button><button type="button" className="button secondary" onClick={onCancel} disabled={busy}>Cancel edit</button><span>Save before leaving this view</span></div>
    </form>
  </section>;
}
function QADetail({record,onEdit}:{record:QARecord;onEdit:()=>void}) {
  const r=currentQA(record),d=r.data,gaps=qaGaps(d),age=qaAge(d);
  return <section className="panel qa-detail"><div className="panel-title"><div><h2>{d.container}</h2><p>{d.batch} · {d.observedOn}</p></div><button className="button secondary" onClick={onEdit}>Revise record</button></div><div className="qa-detail-body"><span className="tag">{ORIGINS[d.origin]}</span><dl className="qa-facts"><div><dt>Location</dt><dd>{d.location} · {d.locationKind==='mock'?'mock':'user supplied'}</dd></div><div><dt>Observation</dt><dd>{d.observedOn} {d.observedTime||'· time unknown'} · {d.timeZone}</dd></div><div><dt>Setup / age</dt><dd>{d.setupOn||'Unknown'}{age!==null?' · '+age+' calendar days':''}</dd></div><div><dt>Starting eggs</dt><dd>{shown(d.initialEggs)}</dd></div><div><dt>Source reference</dt><dd>{d.sourceReference||'Not supplied'}</dd></div><div><dt>Container condition</dt><dd>{CONDITIONS[d.condition]}</dd></div></dl>
      <div className="qa-stage-values">{STAGES.map(([key,label])=><div key={key}><span>{label}</span><strong>{shown(d[key])}</strong></div>)}</div>
      <dl className="qa-facts"><div><dt>Temperature</dt><dd>{d.temperatureC===null?'Not measured':d.temperatureC+' °C · '+TEMPERATURES[d.temperatureBasis]}{d.temperatureSource&&<small>{d.temperatureSource}</small>}</dd></div><div><dt>Emergence</dt><dd>{EMERGENCE[d.emergenceBasis]}{d.emergenceBasis!=='not_assessed'&&<><strong> · {shown(d.emergedAdults)} adults</strong><small>{d.emergenceOn} · {d.emergenceMethod}</small></>}</dd></div><div><dt>QA outcome</dt><dd>{OUTCOMES[d.outcome]}{d.outcome!=='not_assessed'&&<small>{d.assessedOn} · {d.assessor} (self-entered label)<br/>{d.protocolReference}</small>}</dd></div><div><dt>Wolbachia status</dt><dd>Not captured / not inferred</dd></div></dl>
      {d.notes&&<p className="qa-record-note">{d.notes}</p>}<div className="qa-gaps"><strong>Completeness notes</strong>{gaps.length?<ul>{gaps.map(gap=><li key={gap}>{gap}</li>)}</ul>:<p>No missing items in these basic checks. This is not a validity assessment.</p>}</div>
      <details className="qa-history"><summary>Revision history ({record.revisions.length})</summary>{record.revisions.slice().reverse().map(version=><article key={version.number}><strong>Revision {version.number} · {version.savedAt}</strong><p>{version.reason}</p><p>{OUTCOMES[version.data.outcome]} · emergence {EMERGENCE[version.data.emergenceBasis].toLowerCase()}</p><details><summary>View saved snapshot</summary><pre>{JSON.stringify(version.data,null,2)}</pre></details></article>)}</details>
    </div></section>;
}
export default function ContainerQA({onNotice}:{onNotice:(text:string)=>void}) {
  const [store]=useState(()=>{try{return getQAStore();}catch{return null;}});
  const [records,setRecords]=useState<QARecord[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [selectedId,setSelectedId]=useState(''),[editing,setEditing]=useState<QARecord|null|undefined>(undefined),[busy,setBusy]=useState(false);
  const [search,setSearch]=useState(''),[origin,setOrigin]=useState('all');
  useEffect(()=>{let alive=true;if(!store){setError('Local QA storage is unavailable in this browser.');setLoading(false);return;}store.list().then(data=>{if(alive)setRecords(data);}).catch(e=>{if(alive)setError(message(e));}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[store]);
  async function refresh() { if(!store)return;setError('');setBusy(true);try{setRecords(await store.list());}catch(e){setError(message(e));}finally{setBusy(false);} }
  async function examples() { if(!store)return;setError('');setBusy(true);try{await store.addExamples(sampleQARecords());setRecords(await store.list());onNotice('Loaded synthetic QA examples. Your records and existing history were retained.');}catch(e){setError(message(e));}finally{setBusy(false);} }
  const filtered=records.filter(record=>{const d=currentQA(record).data;return(origin==='all'||d.origin===origin)&&(d.container+' '+d.batch+' '+d.location).toLowerCase().includes(search.trim().toLowerCase());});
  const selected=filtered.find(r=>r.id===selectedId)||filtered[0];
  function saved(record:QARecord) {setRecords(previous=>[record,...previous.filter(r=>r.id!==record.id)]);setSelectedId(record.id);setEditing(undefined);setOrigin('all');setSearch('');onNotice('QA observation saved with origin, unknown values and revision history.');}
  const assessed=filtered.filter(r=>currentQA(r).data.outcome!=='not_assessed').length;
  return <div className="qa-workspace"><div className="qa-intro"><div><h2>Container quality-assurance records</h2><p>Record what was checked, then add a separately assessed outcome. These records do not change the synthetic dengue charts.</p></div><div className="button-row"><button className="button secondary" disabled={!store||loading||busy||editing!==undefined} onClick={examples}>Load synthetic examples</button><button className="button primary" disabled={!store||loading||busy||editing!==undefined} onClick={()=>setEditing(null)}>New QA observation</button></div></div>
    <div className="inline-note"><Icon name="info" size={18}/><p>No Firebase setup is needed. QA records stay in this browser; clearing browser data removes them. Export the audit JSON to keep a copy. No ML, release decision or infection test runs here.</p></div>
    {error&&<p className="form-error" role="alert">{error}</p>}
    {editing!==undefined&&store?<QAForm record={editing} store={store} onSaved={saved} onCancel={()=>setEditing(undefined)}/>:<>
      <div className="qa-toolbar"><div className="search-input"><Icon name="search" size={17}/><input aria-label="Search QA records" placeholder="Find container, batch or location" value={search} onChange={e=>setSearch(e.target.value)}/></div><div className="qa-select"><label className="sr-only" htmlFor="qa-origin-filter">QA record origin</label><select id="qa-origin-filter" value={origin} onChange={e=>setOrigin(e.target.value)}><option value="all">All record origins</option>{Object.entries(ORIGINS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><Icon name="chevron" size={15}/></div><button className="subtle-button" disabled={!store||loading||busy} onClick={refresh}>Refresh records</button></div>
      <div className="qa-summary"><span><strong>{filtered.length}</strong> observations in view</span><span><strong>{assessed}</strong> with entered QA outcomes</span><span><strong>{filtered.length-assessed}</strong> outcomes not assessed</span></div>
      <div className="qa-export-row"><button className="button secondary" disabled={!filtered.length||loading} onClick={()=>download('wolbachia-container-qa.csv',qaCsv(filtered),'text/csv;charset=utf-8')}><Icon name="download" size={16}/>Export filtered QA CSV</button><button className="button secondary" disabled={!records.length||loading} onClick={()=>download('wolbachia-container-qa-audit.json',qaAudit(records),'application/json')}><Icon name="download" size={16}/>Export all QA history</button></div>
      {loading?<section className="panel empty-state" role="status">Loading QA records…</section>:!filtered.length?<section className="panel empty-state"><strong>{records.length?'No QA records match these filters':'No container-QA records yet'}</strong><p>{records.length?'Change the origin filter or search.':'Create a record or load three clearly labelled synthetic examples.'}</p></section>:<div className="qa-layout"><section className="panel qa-register"><div className="panel-title"><div><h2>Observation register</h2><p>Each row is an observation. Visits to one container are repeated measures.</p></div></div><div className="table-scroll"><table><thead><tr><th>Container / batch</th><th>Observed</th><th>Origin / outcome</th><th>Action</th></tr></thead><tbody>{filtered.map(record=>{const d=currentQA(record).data;return <tr key={record.id} className={selected?.id===record.id?'qa-selected-row':''}><td><strong>{d.container}</strong><span className="table-sub">{d.batch}</span></td><td>{d.observedOn}<span className="table-sub">{d.location}</span></td><td><span>{ORIGINS[d.origin]}</span><span className="table-sub">{OUTCOMES[d.outcome]}</span></td><td><button className="table-link" aria-label={'Open QA record '+d.container+' '+d.observedOn} onClick={()=>setSelectedId(record.id)}>Open</button></td></tr>;})}</tbody></table></div></section>{selected&&<QADetail record={selected} onEdit={()=>setEditing(selected)}/>}</div>}
    </>}
  </div>;
}
