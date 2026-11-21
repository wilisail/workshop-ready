import { appendPredictionRun, appendStudyReview, appendStudyRun, captureStudyDataset, recordStudyPlan, reviseStudyPlan, validateStudy } from './studies.ts';
import type { Study, StudyDataset, StudyPlan, StudyReview } from './studies.ts';
export const STUDY_DB='wolbachia-field-review:studies:v1';
export function createStudyStore(factory:IDBFactory,name=STUDY_DB){
  let opened:Promise<IDBDatabase>|undefined;
  const open=()=>opened ||= new Promise<IDBDatabase>((resolve,reject)=>{const request=factory.open(name,1);request.onupgradeneeded=()=>request.result.createObjectStore('studies',{keyPath:'id'});request.onerror=()=>{opened=undefined;reject(request.error||new Error('Study storage is unavailable.'));};request.onblocked=()=>{opened=undefined;reject(new Error('Close other tabs before opening study storage.'));};request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();opened=undefined;};resolve(db);};});
  async function change(id:string,expected:number,apply:(study:Study)=>Study):Promise<Study>{
    const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('studies','readwrite'),store=tx.objectStore('studies'),request=store.get(id);let updated:Study,failure:unknown;
      request.onsuccess=()=>{try{const study=validateStudy(request.result);if(study.sequence!==expected)throw new Error('This study changed in another tab. Refresh before editing or reviewing.');updated=validateStudy(apply(study));store.put(updated);}catch(e){failure=e;tx.abort();}};
      tx.oncomplete=()=>resolve(updated);tx.onabort=tx.onerror=()=>reject(failure||tx.error||new Error('The study change could not be saved.'));
    });
  }
  return {
    async list():Promise<Study[]>{const db=await open();return new Promise((resolve,reject)=>{const r=db.transaction('studies').objectStore('studies').getAll();r.onsuccess=()=>{try{resolve(r.result.map(validateStudy).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)));}catch(e){reject(e);}};r.onerror=()=>reject(r.error);});},
    async add(study:Study):Promise<void>{const checked=validateStudy(study),db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('studies','readwrite'),store=tx.objectStore('studies'),r=store.count();let failure:unknown;r.onsuccess=()=>{if(r.result>=50){failure=new Error('This prototype stores up to 50 studies per browser.');tx.abort();}else store.add(checked);};tx.oncomplete=()=>resolve();tx.onabort=tx.onerror=()=>reject(failure||tx.error||new Error('The study could not be created.'));});},
    revise(id:string,expected:number,plan:StudyPlan,reason:string){return change(id,expected,s=>reviseStudyPlan(s,plan,reason,new Date().toISOString()));},
    record(id:string,expected:number){return change(id,expected,s=>recordStudyPlan(s,new Date().toISOString()));},
    capture(id:string,expected:number,data:StudyDataset){return change(id,expected,s=>captureStudyDataset(s,data));},
    run(id:string,expected:number){return change(id,expected,s=>appendStudyRun(s,crypto.randomUUID(),new Date().toISOString()));},
    predict(id:string,expected:number){return change(id,expected,s=>appendPredictionRun(s,crypto.randomUUID(),new Date().toISOString()));},
    review(id:string,expected:number,input:Pick<StudyReview,'reviewer'|'decision'|'comments'>){return change(id,expected,s=>appendStudyReview(s,{...input,id:crypto.randomUUID(),createdAt:new Date().toISOString()}));},
    async close(){if(opened)(await opened).close();opened=undefined;},
  };
}
export type StudyStore=ReturnType<typeof createStudyStore>;
let browserStore:StudyStore|undefined;
export function getStudyStore():StudyStore{if(typeof indexedDB==='undefined')throw new Error('Local study storage is unavailable.');return browserStore ||= createStudyStore(indexedDB);}
