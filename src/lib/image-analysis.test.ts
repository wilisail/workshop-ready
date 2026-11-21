import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCountOutput, planImageRoute, runImageCount } from './image-analysis.ts';
import type { ImageCountInput, ImageCountRuntime } from './image-analysis.ts';
import { firebaseImageRuntime } from './image-ai.ts';
const response = JSON.stringify({count:12,countable:true,qualityWarnings:[],explanation:'Twelve separately visible objects.'});
const input = (mode:ImageCountInput['mode']='cloud'):ImageCountInput=>({blob:new Blob(['fixture'],{type:'image/png'}),sha256:'a'.repeat(64),kind:'bead_proxy',mode,online:true,modelName:'test-transport-only',signal:new AbortController().signal});

test('cloud-only skips the availability probe and records only the provider-reported source', async()=>{
  const original=input();let calls=0;
  const result=await runImageCount(original,{availability:async()=>{throw new Error('Must not probe a local model');},generate:async(actual,route)=>{calls++;assert.equal(actual.blob,original.blob);assert.equal(route.prepareDevice,false);return{text:response,source:'in_cloud'};}});
  assert.equal(calls,1);assert.equal(result.count,12);assert.equal(result.source,'cloud');assert.equal(result.imageSha256,original.sha256);
});
test('unavailable image capability blocks local-only before any provider call',async()=>{
  let calls=0;const runtime:ImageCountRuntime={availability:async()=>'unavailable',generate:async()=>{calls++;return{text:response,source:'in_cloud'};}};
  await assert.rejects(runImageCount(input('local'),runtime),/No cloud request/);assert.equal(calls,0);
});
test('preference modes use cloud when only an undownloaded image model is reported',()=>{
  for(const mode of ['cloud-first','hybrid'] as const){const route=planImageRoute(mode,'downloadable',true);assert.equal(route.mode,'cloud');assert.equal(route.prepareDevice,false);}
  assert.throws(()=>planImageRoute('local','downloadable',true),/no model download/i);
  assert.throws(()=>planImageRoute('hybrid','unknown',false),/No image inference route/);
});
test('local-only and unknown execution sources are never labelled as successful local inference',async()=>{
  for(const source of ['in_cloud',undefined])await assert.rejects(runImageCount(input('local'),{availability:async()=>'available',generate:async()=>({text:response,source})}));
});
test('a result received after cancellation is rejected rather than becoming an analysis record',async()=>{
  const controller=new AbortController();
  await assert.rejects(runImageCount({...input(),signal:controller.signal},{availability:async()=>'unknown',generate:async()=>{controller.abort();return{text:response,source:'in_cloud'};}}),{name:'AbortError'});
});
test('zero is a valid count; an inability to count remains null rather than a fabricated zero',()=>{
  assert.equal(parseCountOutput('{"count":0,"countable":true,"qualityWarnings":[],"explanation":"Empty visible area."}').count,0);
  assert.equal(parseCountOutput('{"count":null,"countable":false,"qualityWarnings":["Blurred"],"explanation":"Objects overlap."}').count,null);
  for(const count of [-1,1.5,'12',null])assert.throws(()=>parseCountOutput(JSON.stringify({count,countable:true,qualityWarnings:[],explanation:'Untrusted result.'})));
  assert.throws(()=>parseCountOutput('{"count":12,"countable":false,"qualityWarnings":[],"explanation":"Inconsistent."}'));
});
test('missing Firebase settings stop the real transport before SDK initialization or image encoding',async()=>{
  await assert.rejects(firebaseImageRuntime(null,()=>{}).generate(input(),planImageRoute('cloud','unknown',true),'Count the fixture'),/Save your Firebase/);
});
