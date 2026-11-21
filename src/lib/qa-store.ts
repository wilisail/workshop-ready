import { currentQA, validateQA, validateQARecord } from './qa-records.ts';
import type { QAPayload, QARecord } from './qa-records.ts';

export const QA_DB = 'wolbachia-field-review:container-qa:v1';
export function createQAStore(factory: IDBFactory, name = QA_DB) {
  let opened: Promise<IDBDatabase> | undefined;
  const open = () => opened ||= new Promise<IDBDatabase>((resolve,reject)=>{
    const request = factory.open(name,1);
    request.onupgradeneeded = () => request.result.createObjectStore('records',{keyPath:'id'});
    request.onerror = () => { opened = undefined; reject(request.error || new Error('QA storage is unavailable.')); };
    request.onblocked = () => { opened = undefined; reject(new Error('Close other tabs before opening QA storage.')); };
    request.onsuccess = () => { const db=request.result; db.onversionchange=()=>{db.close();opened=undefined;}; resolve(db); };
  });
  return {
    async list(): Promise<QARecord[]> {
      const db=await open();
      return new Promise((resolve,reject)=>{ const tx=db.transaction('records'),r=tx.objectStore('records').getAll(); r.onsuccess=()=>{try{resolve(r.result.map(validateQARecord).sort((a,b)=>currentQA(b).savedAt.localeCompare(currentQA(a).savedAt)));}catch(e){reject(e);}};r.onerror=()=>reject(r.error); });
    },
    async add(record: QARecord): Promise<void> {
      const checked=validateQARecord(record);
      if (checked.revisions.length !== 1) throw new Error('New records must start with one revision.');
      const db=await open();
      return new Promise((resolve,reject)=>{
        const tx=db.transaction('records','readwrite'),store=tx.objectStore('records'),count=store.count(); let failure: Error | undefined;
        count.onsuccess=()=>{if(count.result>=500){failure=new Error('This prototype stores up to 500 QA records per browser.');tx.abort();}else store.add(checked);};
        tx.oncomplete=()=>resolve();tx.onabort=tx.onerror=()=>reject(failure||tx.error||new Error('The QA record could not be saved.'));
      });
    },
    async revise(id: string, expectedRevision: number, input: QAPayload, reason: string): Promise<QARecord> {
      const data=validateQA(input);
      if (!reason.trim() || reason.length>500) throw new Error('Add a revision reason of up to 500 characters.');
      const db=await open();
      return new Promise((resolve,reject)=>{
        const tx=db.transaction('records','readwrite'),store=tx.objectStore('records'),r=store.get(id);let updated:QARecord,failure:unknown;
        r.onsuccess=()=>{try{
          const record=validateQARecord(r.result),latest=currentQA(record);
          if(latest.number!==expectedRevision)throw new Error('This QA record changed in another tab. Cancel this edit, refresh and reopen it.');
          if(data.origin!==latest.data.origin)throw new Error('Record origin is fixed. Create a separate record for another data origin.');
          const savedAt=new Date(Math.max(Date.now(),Date.parse(latest.savedAt))).toISOString();
          updated=validateQARecord({...record,revisions:[...record.revisions,{number:latest.number+1,savedAt,reason:reason.trim(),data}]});store.put(updated);
        }catch(e){failure=e;tx.abort();}};
        tx.oncomplete=()=>resolve(updated);tx.onabort=tx.onerror=()=>reject(failure||tx.error||new Error('The QA revision could not be saved.'));
      });
    },
    async addExamples(examples: QARecord[]): Promise<void> {
      const checked=examples.map(validateQARecord);
      if (checked.some(r=>r.revisions.length!==1 || currentQA(r).data.origin!=='synthetic_demo')) throw new Error('Only new synthetic examples can be loaded through this action.');
      const db=await open();
      return new Promise((resolve,reject)=>{
        const tx=db.transaction('records','readwrite'),store=tx.objectStore('records'),all=store.getAllKeys();let failure:Error|undefined;
        all.onsuccess=()=>{const ids=new Set(all.result),fresh=checked.filter(r=>!ids.has(r.id));if(all.result.length+fresh.length>500){failure=new Error('QA storage has reached the 500-record prototype limit.');tx.abort();return;}for(const record of fresh)store.add(record);};
        tx.oncomplete=()=>resolve();tx.onabort=tx.onerror=()=>reject(failure||tx.error||new Error('The examples could not be saved.'));
      });
    },
    async close() { if(opened)(await opened).close();opened=undefined; },
  };
}
export type QAStore = ReturnType<typeof createQAStore>;
let browserStore: QAStore | undefined;
export function getQAStore(): QAStore {
  if(typeof indexedDB==='undefined')throw new Error('This browser does not provide local QA storage.');
  return browserStore ||= createQAStore(indexedDB);
}
