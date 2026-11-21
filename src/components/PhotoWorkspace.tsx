import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import Icon from './Icon.tsx';
import CounterControls from './CounterControls.tsx';
import { defaultCounterOptions } from '../lib/bead-counter.ts';
import { countImageWithoutFirebase, localCounterReady } from '../lib/counter-runtime.ts';
import { COUNTER_MODES } from '../lib/counter-routing.ts';
import type { ImageEngine } from '../lib/counter-routing.ts';
import { createCounterExample, EXAMPLE_CIRCLES } from '../lib/counter-example.ts';
import { LOCATIONS, locationName, MODE_LABELS, shortDate, validateReviewCount } from '../lib/dashboard.ts';
import type { ProcessingMode } from '../lib/dashboard.ts';
import type { FirebaseSettings } from '../lib/storage.ts';
import { checkImageAvailability, countSavedImage, imageError } from '../lib/image-ai.ts';
import type { ImageKind } from '../lib/image-analysis.ts';
import type { LocalAvailability } from '../lib/capacity.ts';
import { prepareImage } from '../lib/image-files.ts';
import { currentReview, getBrowserPhotoStore, photoStatus, validatePhotoMetadata } from '../lib/photo-store.ts';
import type { PhotoRecord, PhotoStore } from '../lib/photo-store.ts';
import { photoAudit, photoCsv } from '../lib/photo-export.ts';

const LABELS = {not_analysed:'Not analysed',pending:'To review',reviewed:'Reviewed',rejected:'Rejected'};
function download(name: string, content: string, type: string) {
  const url=URL.createObjectURL(new Blob([content],{type})), link=document.createElement('a');
  link.href=url; link.download=name; document.body.append(link); link.click(); link.remove(); window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function ImportPhoto({store,onSaved,onClose}: {store:PhotoStore;onSaved:(id:string)=>void;onClose:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null), fileInput=useRef<HTMLInputElement>(null);
  const [file,setFile]=useState<File|null>(null),[container,setContainer]=useState('TEST-001');
  const [locationId,setLocationId]=useState('MEL'),[capturedOn,setCapturedOn]=useState(()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Jakarta'}).format(new Date()));
  const [kind,setKind]=useState<ImageKind>('bead_proxy'),[busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{dialog.current?.showModal();},[]);
  async function save(event:FormEvent) {
    event.preventDefault(); setError('');
    if(!file) {setError('Choose an image first.');return;}
    setBusy(true);
    try {
      validatePhotoMetadata({container,locationId,capturedOn,kind});
      const prepared=await prepareImage(file),id=crypto.randomUUID();
      const record:PhotoRecord={id,name:file.name.slice(0,240),container:container.trim(),locationId,capturedOn,kind,createdAt:new Date().toISOString(),sha256:prepared.sha256,mimeType:prepared.mimeType,width:prepared.width,height:prepared.height,size:prepared.blob.size,provenance:'user_upload',locationProvenance:'mock',analyses:[],reviews:[]};
      await store.add(record,prepared.blob); onSaved(id);
    } catch(err) {setError(err instanceof Error?err.message:'The image could not be imported.');}
    finally {setBusy(false);}
  }
  return <dialog ref={dialog} className="photo-import-dialog" aria-labelledby="import-title" onCancel={e=>{e.preventDefault();if(!busy)onClose();}}>
    <form onSubmit={save}><div className="photo-dialog-heading"><div><span className="eyebrow">BROWSER-LOCAL OBSERVATION</span><h2 id="import-title">Save an image test</h2></div><button type="button" className="icon-button" aria-label="Close image import" disabled={busy} onClick={onClose}><Icon name="close"/></button></div>
      <p className="helper">The original image and its record are saved in this browser. Importing does not send the image to an AI service.</p>
      <div className="photo-file-picker" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(!busy)setFile(e.dataTransfer.files[0]||null);}}><Icon name="upload" size={27}/><strong>{file?file.name:'Choose a prepared photo'}</strong><span>Still JPG, PNG or WebP · up to 8 MB / 16 megapixels</span><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Image file" disabled={busy} onChange={e=>setFile(e.target.files?.[0]||null)}/></div>
      <div className="form-grid"><div><label htmlFor="photo-container">Container ID</label><input id="photo-container" value={container} onChange={e=>setContainer(e.target.value)} maxLength={80} disabled={busy} required/></div><div><label htmlFor="photo-date">Observation date</label><input id="photo-date" type="date" value={capturedOn} onChange={e=>setCapturedOn(e.target.value)} disabled={busy} required/></div></div>
      <label htmlFor="photo-location">Assigned location <span>Fictional demo location</span></label><div className="select-wrap"><Icon name="pin" size={17}/><select id="photo-location" value={locationId} disabled={busy} onChange={e=>setLocationId(e.target.value)}>{LOCATIONS.map(l=><option value={l.id} key={l.id}>{l.name} · mock location</option>)}</select><Icon name="chevron" size={15}/></div>
      <label htmlFor="photo-kind">Objects to count</label><div className="select-wrap"><Icon name="image" size={17}/><select id="photo-kind" value={kind} disabled={busy} onChange={e=>setKind(e.target.value as ImageKind)}><option value="bead_proxy">Beads — larva-proxy demonstration</option><option value="larvae">Larva-like objects — appearance only</option></select><Icon name="chevron" size={15}/></div>
      {error&&<p className="form-error" role="alert">{error}</p>}<div className="photo-dialog-actions"><button className="button secondary" type="button" disabled={busy} onClick={onClose}>Cancel</button><button className="button primary" type="submit" disabled={busy}>{busy?'Saving image…':'Save image locally'}</button></div>
    </form>
  </dialog>;
}
function ReviewFields({record,busy,onSave}: {record:PhotoRecord;busy:boolean;onSave:(status:'reviewed'|'rejected',count:string,note:string,reviewer:string)=>void}) {
  const previous=currentReview(record),analysis=record.analyses.at(-1);
  const [count,setCount]=useState(String(previous?.count??analysis?.count??''));
  const [note,setNote]=useState(previous?.note||''),[reviewer,setReviewer]=useState(previous?.reviewer||'Local operator');
  return <div className="review-form photo-review-fields"><label htmlFor="photo-reviewed-count">Reviewed count</label><input id="photo-reviewed-count" inputMode="numeric" value={count} onChange={e=>setCount(e.target.value)} disabled={busy} placeholder="Count visible objects manually"/>
    <label htmlFor="photo-reviewer">Reviewer label</label><input id="photo-reviewer" value={reviewer} onChange={e=>setReviewer(e.target.value)} maxLength={80} disabled={busy}/>
    <label htmlFor="photo-review-note">Review note <span>Required for a correction or rejection</span></label><textarea id="photo-review-note" value={note} onChange={e=>setNote(e.target.value)} rows={3} maxLength={500} disabled={busy} placeholder="Explain a correction, quality issue or rejection…"/>
    <button className="button primary full-width" disabled={busy} onClick={()=>onSave('reviewed',count,note,reviewer)}><Icon name="check" size={16}/>Save human review</button><button className="button secondary full-width" disabled={busy} onClick={()=>onSave('rejected',count,note,reviewer)}>Reject this observation</button><p className="helper">A manual count keeps its own label and does not run a model.</p>
  </div>;
}
export default function PhotoWorkspace({settings,mode,engine,onEngine,onMode,onConfigure,onNotice}: {settings:FirebaseSettings|null;engine:ImageEngine;onEngine:(engine:ImageEngine)=>void;mode:ProcessingMode;onMode:(mode:ProcessingMode)=>void;onConfigure:()=>void;onNotice:(message:string)=>void}) {
  const [counterOptions,setCounterOptions]=useState(defaultCounterOptions);
  const [store]=useState<PhotoStore|null>(()=>{try{return getBrowserPhotoStore();}catch{return null;}});
  const [records,setRecords]=useState<PhotoRecord[]>([]),[selectedId,setSelectedId]=useState(''),[loaded,setLoaded]=useState(false);
  const [query,setQuery]=useState(''),[filter,setFilter]=useState('all'),[importing,setImporting]=useState(false);
  const [error,setError]=useState(''),[busy,setBusy]=useState<'count'|'review'|null>(null),[progress,setProgress]=useState('');
  const [availability,setAvailability]=useState<LocalAvailability|'unchecked'>('unchecked'),[checking,setChecking]=useState(false);
  const [imageUrl,setImageUrl]=useState(''),[imageLoadError,setImageLoadError]=useState('');
  const active=useRef<AbortController|null>(null),requestId=useRef(0),busyRef=useRef(false);
  const filtered=records.filter(r=>(filter==='all'||photoStatus(r)===filter)&&(r.container+' '+r.name+' '+locationName(r.locationId)).toLowerCase().includes(query.trim().toLowerCase()));
  const selected=filtered.find(r=>r.id===selectedId)||filtered[0],latest=selected?.analyses.at(-1),review=selected?currentReview(selected):undefined;
  async function reload(selectId?:string) {if(!store)return;const list=await store.list();setRecords(list);if(selectId)setSelectedId(selectId);setLoaded(true);}
  useEffect(()=>{
    let mounted=true;
    if(!store){setError('Local image storage is unavailable in this browser. No image can be saved here.');setLoaded(true);return;}
    const refresh=()=>{store.list().then(list=>{if(mounted){setRecords(list);setLoaded(true);}}).catch(err=>{if(mounted){setError(err instanceof Error?err.message:'Image storage could not be opened.');setLoaded(true);}});};
    refresh(); window.addEventListener('focus',refresh);
    return()=>{mounted=false;window.removeEventListener('focus',refresh);active.current?.abort();requestId.current++;};
  },[store]);
  useEffect(()=>{
    let valid=true,url='';setImageUrl('');setImageLoadError('');
    if(selected&&store)store.getImage(selected.id).then(blob=>{if(valid){url=URL.createObjectURL(blob);setImageUrl(url);}}).catch(err=>{if(valid)setImageLoadError(err instanceof Error?err.message:'Image unavailable.');});
    return()=>{valid=false;if(url)URL.revokeObjectURL(url);};
  },[selected?.id,store]);
  async function checkLocal() {setChecking(true);try{setAvailability(await checkImageAvailability());}finally{setChecking(false);}}
  async function analyse() {
    if(!store||!selected||busyRef.current)return;
    busyRef.current=true;setBusy('count');setError('');setProgress('Checking this image request…');
    const record=selected,controller=new AbortController(),token=++requestId.current;active.current=controller;
    try {
      const blob=await store.getImage(record.id);controller.signal.throwIfAborted();
      const input={blob,sha256:record.sha256,kind:record.kind,mode,online:navigator.onLine,modelName:settings?.model||'',signal:controller.signal};
      const progressMessage=(message:string)=>{if(token===requestId.current)setProgress(message);};
      const result=engine==='bead_cv'?await countImageWithoutFirebase(input,counterOptions,progressMessage):await countSavedImage(input,settings,progressMessage);
      controller.signal.throwIfAborted();
      await store.appendAnalysis(record.id,result,controller.signal);
      if(token===requestId.current){await reload(record.id);onNotice('Computed result saved with its actual execution source. Human review is still required.');}
    }catch(err){if(token===requestId.current)setError(imageError(err));}
    finally{if(token===requestId.current){active.current=null;busyRef.current=false;setBusy(null);setProgress('');}}
  }
  function cancel() {active.current?.abort();requestId.current++;active.current=null;busyRef.current=false;setBusy(null);setProgress('');setError('Stopped waiting. Late results will not be saved. A cloud request already sent may still finish and incur provider charges.');}
  async function saveReview(status:'reviewed'|'rejected',count:string,note:string,reviewer:string) {
    if(!store||!selected||busyRef.current)return;
    busyRef.current=true;setBusy('review');setError('');
    try {
      const value=status==='reviewed'?validateReviewCount(count):null;
      await store.appendReview(selected.id,{id:crypto.randomUUID(),analysisId:selected.analyses.at(-1)?.id??null,status,count:value,note:note.trim(),reviewer:reviewer.trim(),createdAt:new Date().toISOString()});
      await reload(selected.id);onNotice(selected.analyses.length ? 'Human review saved. The computed estimate and earlier reviews were retained.' : 'Manual review saved. No AI estimate was created.');
    }catch(err){setError(err instanceof Error?err.message:'The review could not be saved.');}
    finally{busyRef.current=false;setBusy(null);}
  }
  async function loadExample() {
    if(!store||busyRef.current)return;
    busyRef.current=true;setBusy('review');setError('');
    try {
      const prepared=await prepareImage(new File([await createCounterExample()],'generated-eight-beads.png',{type:'image/png'})),id=crypto.randomUUID();
      const record:PhotoRecord={id,name:'Generated eight-bead example',container:'EXAMPLE-8',locationId:'MEL',capturedOn:new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Jakarta'}).format(new Date()),createdAt:new Date().toISOString(),kind:'bead_proxy',sha256:prepared.sha256,mimeType:prepared.mimeType,width:prepared.width,height:prepared.height,size:prepared.blob.size,provenance:'generated_proxy',referenceCount:EXAMPLE_CIRCLES.length,locationProvenance:'mock',analyses:[],reviews:[]};
      await store.add(record,prepared.blob);setFilter('all');setQuery('');setCounterOptions(defaultCounterOptions());onEngine('bead_cv');await reload(id);onNotice('Generated image saved. Its eight drawn objects are a construction reference; the counter still has to read its pixels.');
    } catch(err) {setError(imageError(err));} finally {busyRef.current=false;setBusy(null);}
  }
  return <div className="photo-workspace">
    <div className="photo-workspace-intro"><div><h2>Your saved image tests <span className="tag">{records.length} saved</span></h2><p>Saved photos and review history are stored in this browser, separately from synthetic case charts. Choose Vercel or this device for the small bead counter. A separate Firebase adapter remains optional.</p></div><div className="button-row"><button className="button secondary" disabled={!store||!!busy||!loaded} onClick={loadExample}>Load eight-bead example</button><button className="button secondary" disabled={!filtered.length||!!busy} onClick={()=>download('wolbachia-image-tests.csv',photoCsv(filtered),'text/csv;charset=utf-8')}><Icon name="download" size={16}/>Export image records</button><button className="button primary" disabled={!store||!!busy||!loaded} onClick={()=>setImporting(true)}><Icon name="upload" size={16}/>Add an image</button></div></div>
    <div className="photo-runtime"><div><label htmlFor="photo-engine">Image counting method</label><div className="select-wrap"><Icon name="image" size={17}/><select id="photo-engine" value={engine} disabled={!!busy} onChange={e=>onEngine(e.target.value as ImageEngine)}><option value="bead_cv">Small bead counter · no model download</option><option value="firebase">Firebase vision model · optional setup</option></select><Icon name="chevron" size={15}/></div><label htmlFor="photo-processing">Execution preference</label><div className="select-wrap"><Icon name={mode==='local'||mode==='hybrid'?'device':'cloud'} size={17}/><select id="photo-processing" value={mode} disabled={!!busy} onChange={e=>onMode(e.target.value as ProcessingMode)}>{Object.entries(engine==='bead_cv'?COUNTER_MODES:MODE_LABELS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select><Icon name="chevron" size={15}/></div></div><div className="image-readiness">{engine==='bead_cv'?<><strong>Small computer-vision baseline</strong><span>Browser worker: {localCounterReady()?'available':'unavailable'}</span><small>No Firebase, model key or Chrome-managed model required. Results show the actual execution route.</small><small>Real larvae require a validated method or human review.</small></>:<><span>Image-model readiness: <strong>{availability.replaceAll('_',' ')}</strong></span><button className="subtle-button" disabled={checking||!!busy} onClick={checkLocal}>{checking?'Checking…':'Check image model'}</button><small>Read-only check. No model download.</small></>}</div></div>
    {error&&<p className="form-error" role="alert">{error}</p>}
    {!records.length&&loaded?<section className="panel photo-first-image"><div className="photo-empty-icon"><Icon name="image" size={34}/></div><h2>Start with one prepared image</h2><p>Load the generated example or save your own separated-bead photo. Count it on Vercel or in this browser, inspect the marks, then save a human review.</p><button className="button primary" disabled={!store} onClick={()=>setImporting(true)}>Add your first image</button><span>JPG, PNG or WebP · original stored locally · no automatic AI request</span></section>:<>
    <div className="review-toolbar"><div className="filter-select"><Icon name="filter" size={16}/><label className="sr-only" htmlFor="photo-status-filter">Image record status</label><select id="photo-status-filter" value={filter} disabled={!!busy} onChange={e=>setFilter(e.target.value)}><option value="all">All saved image records</option>{Object.entries(LABELS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select><Icon name="chevron" size={15}/></div><div className="search-input"><Icon name="search" size={17}/><input aria-label="Search saved images" disabled={!!busy} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find image, container or location"/></div><button className="subtle-button" disabled={!!busy} onClick={()=>{setError('');reload().catch(err=>setError(imageError(err)));}}>Refresh saved records</button></div>
    <div className="image-review-layout photo-saved-layout"><section className="panel queue-panel"><div className="queue-heading"><h2>Saved images</h2><span className="muted">{filtered.length}</span></div><div className="observation-list">{filtered.map(r=><button key={r.id} disabled={!!busy} aria-pressed={r.id===selected?.id} className={'observation-item '+(r.id===selected?.id?'selected':'')} onClick={()=>{setSelectedId(r.id);setError('');}}><span className="queue-thumb"><Icon name="image" size={22}/></span><span className="observation-detail"><strong>{r.container}</strong><span>{locationName(r.locationId)} · {shortDate(r.capturedOn)}</span><span className={'badge badge-'+(photoStatus(r)==='reviewed'?'reviewed':photoStatus(r)==='rejected'?'rejected':'pending')}>{LABELS[photoStatus(r)]}</span><span className="photo-file-name">{r.name}</span></span></button>)}{!filtered.length&&<div className="empty-state">{loaded?'No saved images match these filters.':'Loading saved images…'}</div>}</div></section>
    <section className="panel image-panel"><div className="panel-title"><div><h2>{selected?.container||'Saved image'}</h2><p>{selected?locationName(selected.locationId)+' · '+shortDate(selected.capturedOn,true):'Choose an image record'}</p></div><span className="tag">{selected?.provenance==='generated_proxy'?'Generated proxy':'Uploaded photo'}</span></div><div className="image-stage photo-original-stage">{imageUrl?<div className="counter-image"><img src={imageUrl} alt={selected?.name||'Saved observation'} onError={()=>setImageLoadError('The saved image cannot be displayed in this browser.')}/>{latest?.counterEvidence&&<svg className="counter-marks" viewBox={'0 0 '+latest.counterEvidence.width+' '+latest.counterEvidence.height} role="img" aria-label="Saved counted regions: green accepted, amber rejected"><title>Saved counted regions: green accepted, amber rejected</title><rect x={latest.counterEvidence.options.roi.x/100*latest.counterEvidence.width} y={latest.counterEvidence.options.roi.y/100*latest.counterEvidence.height} width={latest.counterEvidence.options.roi.width/100*latest.counterEvidence.width} height={latest.counterEvidence.options.roi.height/100*latest.counterEvidence.height} className="counter-roi"/>{latest.counterEvidence.marks.map((m,i)=><g key={i} className={m.accepted?'counter-accepted':'counter-rejected'}><rect x={m.x-1} y={m.y-1} width={m.width+2} height={m.height+2}/><text x={m.x} y={Math.max(10,m.y-4)} fontSize={Math.max(9,latest.counterEvidence!.width/40)}>{i+1}</text></g>)}</svg>}</div>:<div className="empty-state">{imageLoadError||'Loading original image…'}</div>}</div>{imageLoadError&&<p className="form-error">{imageLoadError}</p>}{selected&&<><div className="image-stage-footer"><span>{selected.width.toLocaleString()} × {selected.height.toLocaleString()} · {(selected.size/1024/1024).toFixed(2)} MB</span><span>{selected.kind==='bead_proxy'?'Bead proxy':'Larva-like objects'}</span></div><p className="image-caption">Original saved locally. Assigned location is fictional. Appearance cannot establish species, Wolbachia infection or dengue efficacy.{selected.referenceCount!==undefined&&' Construction reference: '+selected.referenceCount+' drawn objects, not field data.'}</p>{latest?.counterEvidence&&<p className="counter-legend">Saved result marks: <strong>green accepted</strong> · amber rejected · dashed count area. Changes below apply to the next run.</p>}{engine==='bead_cv'&&<CounterControls options={counterOptions} onChange={setCounterOptions} disabled={!!busy}/>}<div className="photo-analysis-action">{engine==='firebase'&&!settings?<><div className="inline-note"><Icon name="cloud" size={17}/><p>The optional Firebase adapter needs setup. The small bead counter and manual review work now.</p></div><button className="button secondary" onClick={onConfigure}>Optional Firebase settings</button></>:<><p className="helper">{engine==='bead_cv'?(mode==='local'?'This-device only runs in a browser worker and never uploads the image.':'Vercel receives a reduced image only when this preference allows it. The original stays in this browser.'):(mode==='local'?'Device-only never allows cloud fallback. An image-capable local model must be ready.':'An AI request may send this image to your configured Firebase project.')}</p>{engine==='bead_cv'&&selected.kind!=='bead_proxy'&&<p className="form-error">This counter does not support real larvae. Use human review.</p>}{busy==='count'?<button className="button secondary" onClick={cancel}>Stop waiting</button>:<button className="button primary" disabled={!!busy||!imageUrl||!!imageLoadError||(engine==='bead_cv'&&selected.kind!=='bead_proxy')} onClick={analyse}><Icon name={mode==='local'?'device':'cloud'} size={17}/>{latest?'Run a new count':'Count this image'}</button>}<p className="photo-progress" role="status">{progress||'Nothing runs until you click. Each new result needs a new human review.'}</p></>}</div></>}

    </section>
    <section className="panel decision-panel"><div className="panel-title"><div><h2>Count & human review</h2><p>{latest?'Original computed result is preserved':'No computed result for this image'}</p></div></div><div className="estimate-box"><span>{latest?'Original computed estimate':'Computed estimate'}</span><strong>{latest?.count??'—'}</strong><span>{latest?latest.countable?'Visible objects only':'This method could not count this image':'No count has been computed'}</span>{latest&&<><span className={'source-tag source-'+latest.source}>{latest.execution==='vercel-function'?'Counted on Vercel':latest.execution==='browser-worker'?'Counted in this browser':latest.execution==='development-server'?'Counted on development server':latest.source==='cloud'?'Processed in cloud':'Processed on device'}</span><span>{latest.model} · {(latest.elapsedMs/1000).toFixed(1)}s</span><span>{latest.routingNote}</span></>}</div>{latest&&<div className="photo-quality"><p>{latest.explanation}</p>{latest.qualityWarnings.length>0&&<ul>{latest.qualityWarnings.map((warning,i)=><li key={i}>{warning}</li>)}</ul>}</div>}{review&&<div className={'photo-reviewed-value '+(review.status==='rejected'?'photo-rejected-value':'')}><Icon name={review.status==='rejected'?'close':'check'} size={16}/><span>{review.status==='reviewed'?'Reviewed count: '+review.count:'Observation rejected'}<small>{review.reviewer} · {shortDate(review.createdAt)}</small></span></div>}{selected&&<ReviewFields key={selected.id+':'+(latest?.id||'manual')+':'+(review?.id||'pending')} record={selected} busy={!!busy} onSave={saveReview}/>}</section></div>
    {selected&&<section className="panel photo-audit-panel"><div className="panel-title"><div><h2>Analysis & review history</h2><p>{selected.analyses.length} analyses · {selected.reviews.length} human reviews · image {selected.sha256.slice(0,12)}…</p></div><button className="button secondary" onClick={()=>download('image-audit-'+selected.id+'.json',photoAudit(selected),'application/json')}><Icon name="download" size={16}/>Export audit JSON</button></div><div className="photo-audit-events">{!selected.analyses.length&&!selected.reviews.length&&<p className="helper">No computed analysis or human review yet. Saving the photo did not start counting.</p>}{[...selected.analyses.map(a=>({id:a.id,time:a.createdAt,title:(a.source==='cloud'?'Cloud':'On-device')+' analysis · '+(a.count===null?'unable to count':a.count+' estimated'),detail:a.model+' · '+a.routingNote})),...selected.reviews.map(r=>({id:r.id,time:r.createdAt,title:r.status==='rejected'?'Rejected by '+r.reviewer:'Human count '+r.count+' · '+r.reviewer,detail:(r.analysisId?'Review of analysis '+r.analysisId.slice(0,8):'Manual review; no AI estimate')+(r.note?' · '+r.note:'')}))].sort((a,b)=>b.time.localeCompare(a.time)).map(event=><article key={event.id}><span><Icon name="clock" size={16}/></span><div><strong>{event.title}</strong><p>{event.detail}</p></div><time dateTime={event.time}>{shortDate(event.time,true)}</time></article>)}</div></section>}
    </>}
    {importing&&store&&<ImportPhoto store={store} onClose={()=>setImporting(false)} onSaved={id=>{setImporting(false);setFilter('all');setQuery('');reload(id).catch(err=>setError(imageError(err)));onNotice('Image saved in this browser. No AI request was made.');}}/>}
  </div>;
}
