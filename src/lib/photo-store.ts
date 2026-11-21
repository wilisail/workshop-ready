import { LOCATIONS, validateReviewCount } from './dashboard.ts';
import type { ImageAnalysis, ImageKind } from './image-analysis.ts';

export interface PhotoReview { id: string; analysisId: string | null; status: 'reviewed' | 'rejected'; count: number | null; note: string; reviewer: string; createdAt: string; }
export interface PhotoRecord {
  id: string; name: string; container: string; locationId: string; capturedOn: string; createdAt: string;
  kind: ImageKind; sha256: string; mimeType: string; width: number; height: number; size: number;
  provenance: 'user_upload' | 'generated_proxy'; referenceCount?: number; locationProvenance: 'mock'; analyses: ImageAnalysis[]; reviews: PhotoReview[];
}
export function currentReview(record: PhotoRecord): PhotoReview | undefined {
  const review = record.reviews.at(-1);
  return review && review.analysisId === (record.analyses.at(-1)?.id ?? null) ? review : undefined;
}
export function photoStatus(record: PhotoRecord): 'not_analysed' | 'pending' | 'reviewed' | 'rejected' {
  return currentReview(record)?.status || (record.analyses.length ? 'pending' : 'not_analysed');
}
export function validatePhotoMetadata(value: { container: string; locationId: string; capturedOn: string; kind: string }) {
  if (!value.container.trim() || value.container.trim().length > 80) throw new Error('Enter a container ID of 1–80 characters.');
  if (!LOCATIONS.some(l => l.id === value.locationId)) throw new Error('Choose a demonstration location.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.capturedOn) || !Number.isFinite(Date.parse(value.capturedOn)) || new Date(value.capturedOn).toISOString().slice(0,10) !== value.capturedOn) throw new Error('Enter a valid observation date.');
  if (!['bead_proxy','larvae'].includes(value.kind)) throw new Error('Choose bead proxy or larva-like objects.');
}
export const PHOTO_DB = 'wolbachia-field-review:photos:v1';
export function createPhotoStore(factory: IDBFactory, databaseName = PHOTO_DB) {
  let opened: Promise<IDBDatabase> | undefined;
  const open = () => opened ||= new Promise<IDBDatabase>((resolve,reject) => {
    const request = factory.open(databaseName,1);
    request.onupgradeneeded = () => { request.result.createObjectStore('records',{keyPath:'id'}); request.result.createObjectStore('images'); };
    request.onsuccess = () => { const db = request.result; db.onversionchange = () => { db.close(); opened = undefined; }; resolve(db); };
    request.onerror = () => { opened = undefined; reject(request.error || new Error('Image storage is unavailable.')); };
    request.onblocked = () => { opened = undefined; reject(new Error('Close other tabs of this app, then retry opening image storage.')); };
  });
  async function change(id: string, update: (record: PhotoRecord) => PhotoRecord, signal?: AbortSignal): Promise<PhotoRecord> {
    signal?.throwIfAborted();
    const db = await open();
    signal?.throwIfAborted();
    return new Promise((resolve,reject) => {
      const tx = db.transaction('records','readwrite'), store = tx.objectStore('records');
      let updated: PhotoRecord, failure: unknown;
      const request = store.get(id);
      const abort = () => { failure = new DOMException('Cancelled','AbortError'); try { tx.abort(); } catch { /* A completed transaction needs no cancellation. */ } };
      signal?.addEventListener('abort',abort,{once:true});
      request.onsuccess = () => { try { signal?.throwIfAborted(); if (!request.result) throw new Error('The saved image record no longer exists.'); updated = update(request.result); store.put(updated); } catch(err) { failure = err; tx.abort(); } };
      tx.oncomplete = () => { signal?.removeEventListener('abort',abort); resolve(updated); };
      tx.onabort = tx.onerror = () => { signal?.removeEventListener('abort',abort); reject(failure || tx.error || new Error('The image update could not be saved.')); };
    });
  }
  return {
    async list(): Promise<PhotoRecord[]> { const db = await open(); return new Promise((resolve,reject) => { const request = db.transaction('records').objectStore('records').getAll(); request.onsuccess = () => resolve((request.result as PhotoRecord[]).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))); request.onerror = () => reject(request.error); }); },
    async getImage(id: string): Promise<Blob> { const db = await open(); return new Promise((resolve,reject) => { const request = db.transaction('images').objectStore('images').get(id); request.onsuccess = () => request.result instanceof Blob ? resolve(request.result) : reject(new Error('The stored image file is missing.')); request.onerror = () => reject(request.error); }); },
    async add(record: PhotoRecord, blob: Blob): Promise<void> {
      validatePhotoMetadata(record);
      if (!/^[a-f0-9]{64}$/.test(record.sha256) || record.size !== blob.size || record.mimeType !== blob.type || !['user_upload','generated_proxy'].includes(record.provenance) || record.locationProvenance !== 'mock' || record.analyses.length || record.reviews.length || (record.referenceCount !== undefined && (record.provenance !== 'generated_proxy' || !Number.isInteger(record.referenceCount) || record.referenceCount < 0))) throw new Error('The new image record failed validation.');
      const db = await open();
      return new Promise((resolve,reject) => {
        const tx = db.transaction(['records','images'],'readwrite'); let failure: Error | undefined;
        const store = tx.objectStore('records'), count = store.count();
        count.onsuccess = () => { if (count.result >= 50) { failure = new Error('This prototype stores up to 50 photos per browser.'); tx.abort(); return; } store.add(record); tx.objectStore('images').add(blob,record.id); };
        tx.oncomplete = () => resolve(); tx.onabort = tx.onerror = () => reject(failure || tx.error || new Error('The image could not be saved. Browser storage may be full.'));
      });
    },
    appendAnalysis(id: string, result: ImageAnalysis, signal?: AbortSignal) { return change(id, record => { if (record.sha256 !== result.imageSha256) throw new Error('The response belongs to a different image and was rejected.'); if (record.analyses.some(a=>a.id===result.id)) throw new Error('This analysis has already been saved.'); return { ...record, analyses: [...record.analyses,result] }; },signal); },
    appendReview(id: string, review: PhotoReview) { return change(id, record => {
      if (review.analysisId !== (record.analyses.at(-1)?.id ?? null)) throw new Error('The analysis changed in another request or tab. Reload this record before reviewing.');
      if (review.status !== 'reviewed' && review.status !== 'rejected') throw new Error('Choose a valid review status.');
      if (review.status === 'reviewed') validateReviewCount(String(review.count));
      if (review.status === 'reviewed' && record.analyses.at(-1)?.count != null && review.count !== record.analyses.at(-1)!.count && !review.note.trim()) throw new Error('Add a reason when correcting a computed estimate.');
      if (review.status === 'rejected' && !review.note.trim()) throw new Error('A rejected image needs a reason.');
      if (!review.reviewer.trim() || review.reviewer.length > 80 || review.note.length > 500) throw new Error('Add a reviewer label and keep the note under 500 characters.');
      return { ...record, reviews: [...record.reviews,{ ...review, count: review.status === 'reviewed' ? review.count : null }] };
    }); },
    async close() { if (opened) (await opened).close(); opened = undefined; },
  };
}
export type PhotoStore = ReturnType<typeof createPhotoStore>;
let browserStore: PhotoStore | undefined;
export function getBrowserPhotoStore(): PhotoStore {
  if (typeof indexedDB === 'undefined') throw new Error('This browser does not provide local image storage.');
  return browserStore ||= createPhotoStore(indexedDB);
}
