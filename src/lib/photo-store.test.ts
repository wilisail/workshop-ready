import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { createPhotoStore, currentReview, photoStatus, validatePhotoMetadata } from './photo-store.ts';
import type { PhotoRecord, PhotoReview } from './photo-store.ts';
import type { ImageAnalysis } from './image-analysis.ts';
import { photoAudit, photoCsv } from './photo-export.ts';
import { csvCell } from './dashboard.ts';
const blob=new Blob(['original-fixture-bytes'],{type:'image/png'});
const record=():PhotoRecord=>({id:'image-1',name:'fixture.png',container:'TEST-01',locationId:'MEL',capturedOn:'2026-11-21',createdAt:'2026-11-21T05:00:00Z',kind:'bead_proxy',sha256:'a'.repeat(64),mimeType:'image/png',width:10,height:10,size:blob.size,provenance:'user_upload',locationProvenance:'mock',analyses:[],reviews:[]});
const analysis=(id='analysis-1'):ImageAnalysis=>({id,imageSha256:'a'.repeat(64),count:12,countable:true,qualityWarnings:[],explanation:'Controlled transport fixture.',model:'mock-test-only',source:'cloud',requestedMode:'cloud',promptVersion:'visible-objects-v1',elapsedMs:1,createdAt:'2026-11-21T05:01:00Z',routingNote:'Unit test; no real inference.',rawResponse:'{"test":true}'});
const review=(analysisId:string|null='analysis-1'):PhotoReview=>({id:'review-1',analysisId,status:'reviewed',count:13,note:'Corrected one visible object.',reviewer:'Test operator',createdAt:'2026-11-21T05:02:00Z'});
test('image bytes persist separately from metadata and can be read through a fresh connection',async()=>{
  const factory=new IDBFactory(),one=createPhotoStore(factory,'persist-test');await one.add(record(),blob);await one.close();
  const two=createPhotoStore(factory,'persist-test');const listed=await two.list();assert.equal(listed.length,1);assert.equal('blob' in listed[0],false);assert.equal(await (await two.getImage('image-1')).text(),'original-fixture-bytes');await two.close();
});
test('failed duplicate imports leave the original metadata and image intact',async()=>{
  const store=createPhotoStore(new IDBFactory(),'atomic-test');await store.add(record(),blob);
  const replacement=new Blob(['different bytes'],{type:'image/png'});await assert.rejects(store.add({...record(),size:replacement.size},replacement));
  assert.equal((await store.list()).length,1);assert.equal(await(await store.getImage('image-1')).text(),'original-fixture-bytes');await store.close();
});
test('new analyses preserve original estimates and history while requiring a fresh review',async()=>{
  const store=createPhotoStore(new IDBFactory(),'history-test');await store.add(record(),blob);await store.appendAnalysis('image-1',analysis());let r=await store.appendReview('image-1',review());
  assert.equal(r.analyses[0].count,12);assert.equal(currentReview(r)!.count,13);assert.equal(photoStatus(r),'reviewed');
  r=await store.appendAnalysis('image-1',analysis('analysis-2'));assert.equal(r.reviews.length,1);assert.equal(currentReview(r),undefined);assert.equal(photoStatus(r),'pending');
  await assert.rejects(store.appendReview('image-1',review()),/analysis changed/);
  await assert.rejects(store.appendAnalysis('image-1',{...analysis('wrong'),imageSha256:'b'.repeat(64)}),/different image/);await store.close();
});
test('cancelled saves, silent corrections and negative counts never enter persisted history',async()=>{
  const store=createPhotoStore(new IDBFactory(),'validation-test');await store.add(record(),blob);const controller=new AbortController();controller.abort();
  await assert.rejects(store.appendAnalysis('image-1',analysis(),controller.signal),{name:'AbortError'});assert.equal((await store.list())[0].analyses.length,0);
  await store.appendAnalysis('image-1',analysis());await assert.rejects(store.appendReview('image-1',{...review(),note:''}),/reason/);await assert.rejects(store.appendReview('image-1',{...review(),count:-1}),/whole-number/);await store.close();
});
test('manual reviews and exports retain honest provenance and no invented model source',async()=>{
  const store=createPhotoStore(new IDBFactory(),'manual-test');await store.add(record(),blob);const saved=await store.appendReview('image-1',review(null));
  const csv=photoCsv([saved]);assert.match(csv,/user_upload/);assert.match(csv,/no_ai_request/);assert.match(csv,/mock/);assert.match(csv,/"13"/);assert.doesNotMatch(csv,/mock-test-only/);
  const audit=JSON.parse(photoAudit(saved));assert.equal('blob' in audit.record,false);assert.equal(audit.record.reviews.length,1);await store.close();
});
test('invalid dates and unknown locations are rejected before an observation is saved',()=>{
  assert.throws(()=>validatePhotoMetadata({...record(),capturedOn:'2026-02-31'}),/valid observation date/);
  assert.throws(()=>validatePhotoMetadata({...record(),locationId:'not-a-location'}),/demonstration location/);
});
test('image names and container labels cannot become spreadsheet formulas on export',()=>{
  for(const value of ['=1+1','  =1+1','+command','@SUM(A1)','-command']) assert.ok(csvCell(value).startsWith('"\''));
});

test('generated proxies and CV runtime evidence survive reopening and exports without becoming uploaded field data',async()=>{
  const factory=new IDBFactory(),store=createPhotoStore(factory,'cv-proxy-history');
  await store.add({...record(),provenance:'generated_proxy',referenceCount:8},blob);
  const cv:ImageAnalysis={...analysis(),engine:'bead_cv',execution:'browser-worker',source:'device',count:8,model:'CV baseline'};
  await store.appendAnalysis('image-1',cv);await store.appendReview('image-1',{...review(),count:8});await store.close();
  const reopened=createPhotoStore(factory,'cv-proxy-history'),saved=(await reopened.list())[0];
  assert.equal(saved.provenance,'generated_proxy');assert.equal(saved.referenceCount,8);assert.equal(saved.analyses[0].execution,'browser-worker');assert.equal(currentReview(saved)?.count,8);
  assert.match(photoCsv([saved]),/generated_proxy/);assert.match(photoCsv([saved]),/"bead_cv","browser-worker","8"/);assert.equal(JSON.parse(photoAudit(saved)).record.analyses[0].source,'device');
  const rerun=await reopened.appendAnalysis('image-1',{...cv,id:'cv-rerun'});assert.equal(currentReview(rerun),undefined);assert.equal(rerun.reviews.length,1);await reopened.close();
});
