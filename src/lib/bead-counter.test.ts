import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { countBeadPixels, defaultCounterOptions, MAX_COUNTER_SIDE } from './bead-counter.ts';
import { EXAMPLE_CIRCLES } from './counter-example.ts';
import { countImageRequest } from '../../api/count-image.ts';
import { CounterIntegrityError, executeCounterRoute } from './counter-routing.ts';
const W=320,H=240;
function pixels(background=250,foreground=[52,68,105]) {
  const rgb=new Uint8Array(W*H*3).fill(background);
  for(const [cx,cy,r] of EXAMPLE_CIRCLES) for(let y=cy-r;y<=cy+r;y++) for(let x=cx-r;x<=cx+r;x++) if((x-cx)**2+(y-cy)**2<=r*r) rgb.set(foreground,(y*W+x)*3);
  return rgb;
}
const hash=(rgb:Uint8Array)=>createHash('sha256').update(rgb).digest('hex');
const run=(rgb=pixels(),options=defaultCounterOptions(),kind='bead_proxy')=>countBeadPixels(rgb,W,H,options,hash(rgb),kind);
test('constructed image is counted from pixels with eight visible regions, including light/colour settings',()=>{
  const result=run();assert.equal(result.count,8);assert.equal(result.evidence.marks.length,8);assert.equal(result.evidence.pixelSha256,hash(pixels()));
  assert.equal(run(pixels(0,[240,240,240]),{...defaultCounterOptions(),foreground:'light'}).count,8);
  assert.equal(run(pixels(245,[255,20,20]),{...defaultCounterOptions(),foreground:'colour'}).count,8);
  assert.equal(run(pixels(),{...defaultCounterOptions(),roi:{x:0,y:0,width:50,height:40}}).count,2);
});
test('empty-looking images retain a zero estimate with uncertainty; clipped or overlarge regions refuse a count',()=>{
  const empty=run(new Uint8Array(W*H*3).fill(255));assert.equal(empty.count,0);assert.ok(empty.qualityWarnings.some(x=>x.includes('does not prove')));
  const clipped=pixels();for(let y=0;y<15;y++)for(let x=0;x<15;x++)clipped.fill(0,(y*W+x)*3,(y*W+x)*3+3);
  assert.equal(run(clipped).count,null);assert.ok(run(clipped).evidence.marks.some(x=>!x.accepted));
  assert.equal(run(pixels(),{...defaultCounterOptions(),maxArea:100}).countable,false);
});
test('a merging/crowding limitation is stated; real larvae and unbounded/invalid input are rejected',()=>{
  assert.ok(run().qualityWarnings.some(x=>x.includes('Touching beads can merge')));
  assert.throws(()=>run(pixels(),defaultCounterOptions(),'larvae'),/bead-proxy tests only/);
  assert.throws(()=>countBeadPixels(new Uint8Array(1),MAX_COUNTER_SIDE+1,20,defaultCounterOptions(),'a'.repeat(64)),/oversized/);
  assert.throws(()=>run(pixels(),{...defaultCounterOptions(),threshold:NaN}),/valid threshold/);
  assert.throws(()=>run(pixels(),{...defaultCounterOptions(),roi:{x:90,y:0,width:20,height:100}}),/inside/);
});
test('only modes never switch routes; fallback modes obey offline/readiness/abort/integrity restrictions',async()=>{
  const calls:string[]=[];const server=async()=>{calls.push('cloud');return 'server';},device=async()=>{calls.push('device');return 'worker';},fail=async()=>{calls.push('failed');throw new Error('Unavailable');};
  const signal=new AbortController().signal;
  assert.equal((await executeCounterRoute('local',true,true,server,device,signal)).used,'device');assert.deepEqual(calls,['device']);calls.length=0;
  await assert.rejects(executeCounterRoute('cloud',true,true,fail,device,signal));assert.deepEqual(calls,['failed']);calls.length=0;
  await assert.rejects(executeCounterRoute('local',true,true,server,fail,signal));assert.deepEqual(calls,['failed']);calls.length=0;
  assert.equal((await executeCounterRoute('cloud-first',true,true,fail,device,signal)).fallback,true);assert.deepEqual(calls,['failed','device']);calls.length=0;
  assert.equal((await executeCounterRoute('hybrid',true,true,server,fail,signal)).used,'cloud');assert.deepEqual(calls,['failed','cloud']);calls.length=0;
  assert.equal((await executeCounterRoute('cloud-first',false,true,server,device,signal)).used,'device');assert.deepEqual(calls,['device']);calls.length=0;
  await assert.rejects(executeCounterRoute('local',true,false,server,device,signal));assert.deepEqual(calls,[]);
  await assert.rejects(executeCounterRoute('cloud',false,true,server,device,signal));assert.deepEqual(calls,[]);
  await assert.rejects(executeCounterRoute('cloud-first',true,true,async()=>{throw new CounterIntegrityError('Wrong image');},device,signal));assert.deepEqual(calls,[]);
  const stop=new AbortController();await assert.rejects(executeCounterRoute('hybrid',true,true,server,async()=>{stop.abort();throw new Error('stop');},stop.signal));assert.deepEqual(calls,[]);
});
function payload() {const rgb=pixels();return {schema:'bead-counter-request-v1',imageSha256:'a'.repeat(64),pixelSha256:hash(rgb),width:W,height:H,kind:'bead_proxy',options:defaultCounterOptions(),rgbBase64:Buffer.from(rgb).toString('base64')};}
let ip=0;
const request=(body:unknown,headers:Record<string,string>={})=>new Request('https://demo.example/api/count-image',{method:'POST',headers:{'Content-Type':'application/json','x-forwarded-for':'test-'+ ++ip,...headers},body:JSON.stringify(body)});
test('real HTTP handler computes pixels, records exact image/settings hashes and rejects unsupported or corrupt uploads',async()=>{
  const response=await countImageRequest(request(payload()));assert.equal(response.status,200);const result=await response.json();assert.equal(result.count,8);assert.equal(result.engine,'bead_cv');assert.equal(result.evidence.pixelSha256,payload().pixelSha256);
  assert.equal((await countImageRequest(request({...payload(),pixelSha256:'b'.repeat(64)}))).status,400);
  assert.equal((await countImageRequest(request({...payload(),kind:'larvae'}))).status,400);
  assert.equal((await countImageRequest(request({...payload(),width:99999}))).status,400);
  assert.equal((await countImageRequest(request(payload(),{origin:'https://other.example'}))).status,403);
  assert.equal((await countImageRequest(request(payload(),{'Content-Length':'2400001'}))).status,413);
  assert.equal((await countImageRequest(new Request('https://demo.example/api/count-image',{method:'POST',headers:{'content-type':'application/json','x-forwarded-for':'stream'},body:'x'.repeat(2400001)}))).status,413);
  assert.equal((await countImageRequest(new Request('https://demo.example/api/count-image',{method:'DELETE'}))).status,405);
});
test('HTTP service applies its bounded demo rate limit without limiting the browser worker',async()=>{
  const req=()=>request(payload(),{'x-forwarded-for':'limit-test'});
  for(let n=0;n<12;n++)assert.equal((await countImageRequest(req())).status,200);
  assert.equal((await countImageRequest(req())).status,429);
  assert.equal(run().count,8);
});

test('client refuses wrong-image evidence and mismatched count/marks without hiding it with fallback',async()=>{
  const {validateCounterResult}=await import('./counter-runtime.ts');
  const result=run(),options=defaultCounterOptions(),rgb=pixels();
  assert.equal(validateCounterResult(result,W,H,options,hash(rgb)).count,8);
  assert.throws(()=>validateCounterResult(result,W,H,options,'b'.repeat(64)),CounterIntegrityError);
  assert.throws(()=>validateCounterResult({...result,count:9},W,H,options,hash(rgb)),CounterIntegrityError);
  assert.throws(()=>validateCounterResult({...result,evidence:{...result.evidence,options:{}}},W,H,options,hash(rgb)),CounterIntegrityError);
});
