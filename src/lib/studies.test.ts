import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { currentQA, sampleQARecords } from './qa-records.ts';
import { appendStudyReview, appendStudyRun, captureStudyDataset, countSummary, currentDataset, currentRun, currentStudyReview, defaultPlan, examplePairs, latestPlan, makeExampleStudy, makeStudy, planChecks, qaSummary, recordStudyPlan, reviseStudyPlan, runStudy, STUDY_SOFTWARE, studyAudit, studyDatasetStale, studyReport, validateDataset, validatePair, validateStudy } from './studies.ts';
import { createStudyStore } from './study-store.ts';
const now='2026-11-21T08:00:00Z',later='2026-11-21T09:00:00Z';
const example=()=>makeExampleStudy('study-one',now);
const review=(id='review-one')=>({id,createdAt:later,reviewer:'Operator label',decision:'changes_requested' as const,comments:'Fictional data only; collect independent field references.'});

test('descriptive errors retain repeated units, missing counts, exclusions and observed zeros',()=>{
  const result=countSummary(examplePairs());
  assert.deepEqual(result,{observations:6,excluded:1,missingPairs:1,validPairs:4,units:3,mae:1.25,bias:.75,maximumError:3,unitBalancedMae:4/3});
  const absent=countSummary(examplePairs().map(p=>({...p,estimate:null})));
  assert.equal(absent.validPairs,0);assert.equal(absent.missingPairs,5);assert.equal(absent.mae,null);assert.equal(absent.bias,null);assert.equal(absent.maximumError,null);assert.equal(absent.unitBalancedMae,null);
  assert.equal(countSummary([{...examplePairs()[0],estimate:0,reference:0}]).mae,0);
});
test('invalid counts and dates are rejected, and exclusions require reasons',()=>{
  const pair=examplePairs()[0];
  for(const estimate of [-1,.5,NaN,Infinity,'2',100001])assert.throws(()=>validatePair({...pair,estimate}));
  assert.throws(()=>validatePair({...pair,observedOn:'2026-02-31'}));
  assert.throws(()=>validatePair({...pair,excluded:true}),/reason/);
  assert.equal(validatePair({...pair,estimate:null}).estimate,null);
});
test('a recorded plan requires a question, outcome, comparator, sampling rationale and analysis, without imposing thirty units',()=>{
  const draft=makeStudy(defaultPlan(),'draft',now);
  assert.throws(()=>recordStudyPlan(draft,later),/sampling/);
  const small={...defaultPlan(),samplingRationale:'Technical pilot only, not a powered efficacy study.',plannedUnits:2};
  assert.equal(latestPlan(recordStudyPlan(makeStudy(small,'pilot',now),later)).status,'recorded');
  assert.ok(planChecks(defaultPlan()).some(c=>c.includes('no universal cutoff')));
  assert.throws(()=>recordStudyPlan(makeStudy({...small,primaryOutcome:''},'bad',now),later),/primary outcome/);
});
test('amendments require a reason, preserve earlier versions and cannot change template',()=>{
  const original=example(),prior=structuredClone(original);
  assert.throws(()=>reviseStudyPlan(original,latestPlan(original).data,'',later),/amendment/);
  assert.throws(()=>reviseStudyPlan(original,defaultPlan('prediction'),'Switch',later),/template/);
  const next=reviseStudyPlan(original,{...latestPlan(original).data,title:'Amended'},'Clarify question',later);
  assert.deepEqual(original,prior);assert.deepEqual(next.plans.slice(0,2),prior.plans);assert.equal(latestPlan(next).status,'draft');assert.equal(currentDataset(next),undefined);
});
test('snapshots require the matching recorded plan and homogeneous, declared provenance',()=>{
  const s=example(),p=latestPlan(s),d=currentDataset(s)!;
  assert.throws(()=>validateDataset({...d,planRevision:1},s.plans[0]),/Record/);
  assert.throws(()=>validateDataset({...d,pairs:[{...d.pairs[0],origin:'bead_proxy'}]},p),/origin/);
  assert.throws(()=>validateDataset({...d,pairs:[d.pairs[0],d.pairs[0]]},p),/Duplicate/);
  assert.throws(()=>validateDataset({...d,pairs:[],qaRecords:sampleQARecords(now)},p),/dataset type/);
  assert.throws(()=>validateDataset({...d,planRevision:99},p),/Record/);
});
test('calculations flag missing references, repeated units and images, and do not produce inferential claims',()=>{
  const s=example(),p=latestPlan(s),d=currentDataset(s)!;
  const pairs=d.pairs.map((pair,i)=>({...pair,observationRef:i===1?d.pairs[0].observationRef:pair.observationRef,referenceIndependent:false,blinding:'unknown' as const,referenceReviewer:''}));
  const run=runStudy(p,{...d,pairs},'run',later);
  for(const fragment of ['Repeated unit','Duplicate observation','independence','blinding','descriptions','unknown method','not external preregistration','cannot establish biological'])assert.ok(run.checks.some(c=>c.includes(fragment)),fragment);
  assert.equal(run.qa,null);assert.equal('pValue' in run,false);assert.equal('confidenceInterval' in run,false);assert.equal(run.softwareVersion,STUDY_SOFTWARE);
});
test('QA readiness keeps unresolved outcomes separate, groups repeated units, and does not train a model',()=>{
  const records=sampleQARecords(now),repeated=structuredClone(records[0]);repeated.id='repeated';
  const summary=qaSummary([...records,repeated],'container');
  assert.equal(summary.observations,4);assert.equal(summary.units,3);assert.equal(summary.labelled,1);assert.equal(summary.failed,1);assert.equal(summary.satisfactory,0);assert.equal(summary.unresolved,3);assert.equal(summary.missingSetup,1);assert.equal(summary.waterTemperature,2);
  let s=recordStudyPlan(makeStudy({...defaultPlan('prediction'),samplingRationale:'Synthetic pilot.'},'prediction',now),now);
  s=captureStudyDataset(s,{id:'qa-data',planRevision:latestPlan(s).number,capturedAt:now,notes:'Synthetic readiness only',pairs:[],qaRecords:[...records,repeated]});
  s=appendStudyRun(s,'qa-run',later);const run=currentRun(s)!;
  for(const fragment of ['Repeated observations','not treated as successful','Both failed','setup dates','Air/weather','No prediction model'])assert.ok(run.checks.some(c=>c.includes(fragment)),fragment);
  assert.equal(run.counts,null);
});
test('pinned QA snapshots remain unchanged after a source correction and are flagged stale',()=>{
  const records=sampleQARecords(now),plan=latestPlan(recordStudyPlan(makeStudy({...defaultPlan('prediction'),samplingRationale:'Pilot.'},'qa',now),now));
  const snapshot=validateDataset({id:'snap',planRevision:plan.number,capturedAt:now,notes:'',pairs:[],qaRecords:records},plan);
  assert.equal(studyDatasetStale(snapshot,records),false);
  records[0].revisions.push({number:2,savedAt:later,reason:'Corrected count',data:{...currentQA(records[0]).data,larvae:99}});
  assert.equal(currentQA(snapshot.qaRecords[0]).data.larvae,12);assert.equal(studyDatasetStale(snapshot,records),true);assert.equal(studyDatasetStale(snapshot,[]),true);
});
test('new runs, snapshots and plan amendments do not inherit an earlier review',()=>{
  let s=appendStudyRun(example(),'run-one',later);s=appendStudyReview(s,review());assert.equal(currentStudyReview(s)?.id,'review-one');
  const second=appendStudyRun(s,'run-two',later);assert.equal(currentStudyReview(second),undefined);assert.equal(second.reviews.length,1);
  const snapshot=captureStudyDataset(s,{...currentDataset(s)!,id:'data-two',capturedAt:later});assert.equal(currentRun(snapshot),undefined);assert.equal(currentStudyReview(snapshot),undefined);
  const amended=reviseStudyPlan(s,{...latestPlan(s).data,title:'New title'},'Clarification',later);assert.equal(currentStudyReview(amended),undefined);assert.equal(amended.runs.length,1);assert.equal(amended.reviews.length,1);
  assert.equal(validateStudy(s).reviews[0].datasetId,currentDataset(s)?.id);
});
test('saved provenance rejects altered results, duplicate IDs and broken review references',()=>{
  const s=appendStudyReview(appendStudyRun(example(),'run-one',later),review());
  assert.throws(()=>validateStudy({...s,runs:[{...s.runs[0],counts:{...s.runs[0].counts,mae:999}}]}),/pinned inputs/);
  assert.throws(()=>validateStudy({...s,reviews:[{...s.reviews[0],runId:'missing'}]}),/run is missing/);
  assert.throws(()=>validateStudy({...s,datasets:[...s.datasets,s.datasets[0]],sequence:s.sequence+1}),/unique/);
  assert.throws(()=>appendStudyReview(s,{...review('another'),comments:''}),/substantive/);
});
test('reports retain methods and limitations; audits contain all inputs, histories and versioned definitions',()=>{
  const s=appendStudyReview(appendStudyRun(example(),'run-one',later),review()),report=studyReport(s),audit=JSON.parse(studyAudit(s));
  for(const text of ['primaryOutcome','samplingRationale','1.25','Illustrative duplicate exclusion','unknown','Operator label','not external preregistration'])assert.ok(report.includes(text),text);
  assert.equal(audit.study.datasets[0].pairs[4].estimate,0);assert.equal(audit.study.datasets[0].pairs[3].estimate,null);assert.equal(audit.study.reviews[0].runId,'run-one');assert.equal(audit.study.plans.length,2);
  assert.equal(audit.methods.countError,'estimate - reference');assert.equal(audit.softwareVersion,STUDY_SOFTWARE);assert.equal('imageBytes' in audit,false);
});
test('study history persists through reopening and rejects stale concurrent edits atomically',async()=>{
  const factory=new IDBFactory(),one=createStudyStore(factory,'study-persist'),two=createStudyStore(factory,'study-persist');await one.add(example());
  const saved=await one.run('study-one',3);assert.equal(saved.sequence,4);
  await assert.rejects(two.review('study-one',3,{reviewer:'Stale operator',comments:'Old view',decision:'comments'}),/another tab/);
  const checked=await one.review('study-one',4,{reviewer:'Current operator',comments:'Demo review',decision:'comments'});assert.equal(checked.reviews.length,1);
  await one.close();await two.close();const reopened=createStudyStore(factory,'study-persist'),rows=await reopened.list();assert.deepEqual(rows[0],checked);
  const amended=await reopened.revise('study-one',5,{...latestPlan(rows[0]).data,title:'Amended'},'Clarify title');assert.equal(amended.sequence,6);assert.equal(amended.plans[1].status,'recorded');assert.equal(currentStudyReview(amended),undefined);await reopened.close();
});
