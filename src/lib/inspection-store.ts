import { appendInspectionDecision, validateInspectionPlan } from './inspection.ts';
import type { InspectionDecision, InspectionPlan } from './inspection.ts';
export const INSPECTION_DB = 'wolbachia-field-review:inspection-plans:v1';
export function createInspectionStore(factory: IDBFactory, name = INSPECTION_DB) {
  let opened: Promise<IDBDatabase> | undefined;
  const open = () => opened ||= new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open(name, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('plans', { keyPath: 'id' });
    request.onerror = () => { opened = undefined; reject(request.error || new Error('Inspection storage is unavailable.')); };
    request.onblocked = () => { opened = undefined; reject(new Error('Close other tabs before opening inspection storage.')); };
    request.onsuccess = () => { const db = request.result; db.onversionchange = () => { db.close(); opened = undefined; }; resolve(db); };
  });
  return {
    async list(): Promise<InspectionPlan[]> { const db = await open(); return new Promise((resolve, reject) => { const r = db.transaction('plans').objectStore('plans').getAll(); r.onsuccess = () => { try { resolve(r.result.map(validateInspectionPlan).sort((a, b) => b.createdAt.localeCompare(a.createdAt))); } catch (e) { reject(e); } }; r.onerror = () => reject(r.error); }); },
    async add(input: InspectionPlan): Promise<void> { const plan = validateInspectionPlan(input), db = await open(); return new Promise((resolve, reject) => { const tx = db.transaction('plans', 'readwrite'), store = tx.objectStore('plans'), count = store.count(); let failure: Error | undefined; count.onsuccess = () => { if (count.result >= 50) { failure = new Error('This prototype stores up to 50 inspection plans.'); tx.abort(); } else store.add(plan); }; tx.oncomplete = () => resolve(); tx.onabort = tx.onerror = () => reject(failure || tx.error || new Error('The inspection plan could not be saved.')); }); },
    async decide(id: string, expectedSequence: number, input: Omit<InspectionDecision, 'id' | 'number' | 'savedAt'>): Promise<InspectionPlan> {
      const db = await open(); return new Promise((resolve, reject) => { const tx = db.transaction('plans', 'readwrite'), store = tx.objectStore('plans'), request = store.get(id); let updated: InspectionPlan, failure: unknown;
        request.onsuccess = () => { try { const prior = validateInspectionPlan(request.result); if (prior.sequence !== expectedSequence) throw new Error('This plan changed in another tab. Refresh before deciding.'); updated = validateInspectionPlan(appendInspectionDecision(prior, { ...input, id: crypto.randomUUID(), savedAt: new Date().toISOString() })); store.put(updated); } catch (e) { failure = e; tx.abort(); } };
        tx.oncomplete = () => resolve(updated); tx.onabort = tx.onerror = () => reject(failure || tx.error || new Error('The decision could not be saved.'));
      });
    },
    async close() { if (opened) (await opened).close(); opened = undefined; },
  };
}
export type InspectionStore = ReturnType<typeof createInspectionStore>;
let browserStore: InspectionStore | undefined;
export function getInspectionStore(): InspectionStore { if (typeof indexedDB === 'undefined') throw new Error('Local inspection storage is unavailable.'); return browserStore ||= createInspectionStore(indexedDB); }
