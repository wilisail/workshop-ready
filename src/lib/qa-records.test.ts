import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { currentQA, qaAge, qaAudit, qaCsv, qaGaps, sampleQARecords, validateQA, validateQARecord } from './qa-records.ts';
import { createQAStore } from './qa-store.ts';

const sample=()=>sampleQARecords('2026-11-21T00:00:00Z')[0];
const data=()=>currentQA(sample()).data;
test('zero stage counts and missing values remain distinct without generating an emergence or QA outcome',()=>{
  const d=validateQA({...data(),larvae:0,pupae:null,pupalSkins:99});
  assert.equal(d.larvae,0);assert.equal(d.pupae,null);assert.equal(d.emergenceBasis,'not_assessed');assert.equal(d.emergedAdults,null);assert.equal(d.outcome,'not_assessed');
  assert.ok(qaGaps(d).includes('Emergence not assessed'));
});
test('impossible dates, observation times and unknown time zones are rejected; calendar age is explicit',()=>{
  assert.equal(qaAge(data()),7);assert.equal(qaAge({...data(),setupOn:null}),null);
  for(const patch of [{observedOn:'2026-02-31'},{setupOn:'2026-11-20'},{observedTime:'29:15'},{timeZone:'not-a-zone'}])assert.throws(()=>validateQA({...data(),...patch}));
});
test('counts reject fractions, strings, negative numbers and non-finite values while unknown starting quantity needs no invented denominator',()=>{
  for(const n of [-1,.5,Infinity,NaN,'12',100001])assert.throws(()=>validateQA({...data(),larvae:n}));
  assert.equal(validateQA({...data(),initialEggs:null,sourceReference:''}).initialEggs,null);
  assert.throws(()=>validateQA({...data(),sourceReference:''}),/reference/);
});
test('temperature readings retain water, air or weather provenance and require a source',()=>{
  const weather=validateQA({...data(),temperatureBasis:'weather',temperatureC:0,temperatureSource:'Station example'});
  assert.equal(weather.temperatureC,0);assert.equal(weather.temperatureBasis,'weather');assert.ok(qaGaps(weather).includes('No container-water temperature'));
  assert.throws(()=>validateQA({...data(),temperatureBasis:'not_measured'}),/not measured/);
  assert.throws(()=>validateQA({...data(),temperatureSource:''}),/source reference/);
});
test('measured or estimated emergence needs a separate result, assessment date and method',()=>{
  assert.throws(()=>validateQA({...data(),emergenceBasis:'estimated',emergedAdults:55}),/assessment date/);
  const d=validateQA({...data(),emergenceBasis:'estimated',emergedAdults:55,emergenceOn:'2026-11-18',emergenceMethod:'Independent estimate from checked reference counts'});
  assert.equal(d.emergedAdults,55);assert.equal(d.emergenceBasis,'estimated');assert.equal(d.outcome,'not_assessed');
  assert.throws(()=>validateQA({...d,emergenceOn:'2026-11-16'}),/precede/);
  assert.throws(()=>validateQA({...d,emergenceBasis:'not_assessed'}),/empty/);
});
test('a QA outcome needs dated human attribution and protocol, without claiming it follows from a count',()=>{
  assert.throws(()=>validateQA({...data(),outcome:'failed'}),/assessment date/);
  const d=validateQA({...data(),outcome:'needs_review',assessedOn:'2026-11-18',assessor:'Reviewer label',protocolReference:'Study protocol example'});
  assert.equal(d.outcome,'needs_review');assert.equal(d.emergenceBasis,'not_assessed');
  assert.throws(()=>validateQA({...d,assessedOn:'2026-11-16'}),/precede/);
});
test('synthetic and bead-proxy records cannot lose their mock-location provenance',()=>{
  for(const origin of ['synthetic_demo','bead_proxy'])assert.throws(()=>validateQA({...data(),origin,locationKind:'user_reference'}),/mock location/);
  assert.equal(validateQA({...data(),origin:'field_observation',locationKind:'user_reference'}).locationKind,'user_reference');
  assert.throws(()=>validateQARecord({...sample(),revisions:[...sample().revisions,{number:2,savedAt:'2026-11-21T00:01:00Z',reason:'Relabel',data:{...data(),origin:'field_observation'}}]}),/origin cannot change/);
});
test('QA records persist through a new database connection with unknowns and history intact',async()=>{
  const factory=new IDBFactory(),one=createQAStore(factory,'qa-persist');await one.add(sample());await one.close();
  const two=createQAStore(factory,'qa-persist');const rows=await two.list();assert.equal(rows.length,1);assert.equal(currentQA(rows[0]).data.emergedAdults,null);assert.equal(rows[0].revisions.length,1);await two.close();
});
test('concurrent stale edits are rejected and the first revision is preserved',async()=>{
  const factory=new IDBFactory(),one=createQAStore(factory,'qa-concurrent'),two=createQAStore(factory,'qa-concurrent');await one.add(sample());
  const saved=await one.revise(sample().id,1,{...data(),larvae:11},'Corrected reference count');
  assert.equal(saved.revisions.length,2);assert.equal(saved.revisions[0].data.larvae,12);assert.equal(currentQA(saved).data.larvae,11);
  await assert.rejects(two.revise(sample().id,1,{...data(),larvae:10},'Stale tab'),/another tab/);
  await assert.rejects(one.revise(sample().id,2,{...data(),origin:'field_observation'},'Relabel'),/origin is fixed/);
  await assert.rejects(one.revise(sample().id,2,data(),''),/reason/);
  assert.equal((await one.list())[0].revisions.length,2);await one.close();await two.close();
});
test('loading synthetic examples twice does not overwrite a revision or duplicate records',async()=>{
  const store=createQAStore(new IDBFactory(),'qa-examples');await store.addExamples(sampleQARecords('2026-11-21T00:00:00Z'));
  await store.revise(sample().id,1,{...data(),notes:'Preserved operator edit'},'Review example');await store.addExamples(sampleQARecords());
  const rows=await store.list();assert.equal(rows.length,3);assert.equal(currentQA(rows.find(r=>r.id===sample().id)!).data.notes,'Preserved operator edit');
  await assert.rejects(store.addExamples([{...sample(),id:'field',revisions:[{...sample().revisions[0],data:{...data(),origin:'field_observation'}}]}]),/synthetic examples/);await store.close();
});
test('CSV and audit exports preserve origins, explicit zero, unknowns and full revision history without invented assay results',async()=>{
  const store=createQAStore(new IDBFactory(),'qa-export');await store.add(sample());const revised=await store.revise(sample().id,1,{...data(),container:'=SUM(A1)',larvae:0,pupae:null},'Export check');
  const csv=qaCsv([revised]);assert.match(csv,/synthetic_demo/);assert.match(csv,/synthetic_fixture/);assert.match(csv,/not_captured_in_this_record/);assert.match(csv,/"0",""/);assert.match(csv,/"'=SUM\(A1\)"/);
  const audit=JSON.parse(qaAudit([revised]));assert.equal(audit.records[0].revisions.length,2);assert.equal(audit.records[0].revisions[0].data.larvae,12);assert.equal(audit.records[0].revisions[1].data.larvae,0);await store.close();
});
test('numeric negative temperatures remain numbers in CSV while text formula prefixes stay escaped',()=>{
  const record=sample();record.revisions[0].data={...data(),temperatureC:-1,temperatureSource:'=untrusted text'};
  const csv=qaCsv([record]);assert.match(csv,/,"-1","water",/);assert.match(csv,/"'=untrusted text"/);assert.doesNotMatch(csv,/"'-1"/);
});
