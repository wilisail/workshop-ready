import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectRaster, MAX_IMAGE_BYTES, prepareImage } from './image-files.ts';
function pngHeader(width:number,height:number){const data=new Uint8Array(33);data.set([137,80,78,71,13,10,26,10]);data.set([73,72,68,82],12);const view=new DataView(data.buffer);view.setUint32(8,13);view.setUint32(16,width);view.setUint32(20,height);return data;}
test('raster headers are checked before decoding and oversized dimensions are rejected',()=>{
  assert.deepEqual(inspectRaster(pngHeader(1920,1080)),{mimeType:'image/png',width:1920,height:1080});
  assert.throws(()=>inspectRaster(pngHeader(10000,10000)),/16 megapixels/);
  assert.throws(()=>inspectRaster(new TextEncoder().encode('<svg></svg>')),/valid still/);
});
test('file size and MIME mismatches are rejected without requiring a browser decoder',async()=>{
  await assert.rejects(prepareImage(new File([new Uint8Array(MAX_IMAGE_BYTES+1)],'large.png',{type:'image/png'})),/8 MB/);
  await assert.rejects(prepareImage(new File([pngHeader(2,2)],'false.jpg',{type:'image/jpeg'})),/do not match/);
});
