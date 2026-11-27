// Build a self-contained worker. Only this app's static assets are cached.
export function offlineWorker(assets: string[], build: string): string {
  return `const BUILD=${JSON.stringify(build)};
const ASSETS=${JSON.stringify(assets)};
const PREFIX='workshop-ready-';
const CACHE=PREFIX+BUILD;
function valid(path,response){
 if(!response||!response.ok)return false;
 const type=response.headers.get('content-type')||'';
 if(path.endsWith('.js'))return /javascript|ecmascript/.test(type);
 if(path.endsWith('.css'))return type.includes('text/css');
 if(path.endsWith('.html'))return type.includes('text/html');
 if(path.endsWith('.svg'))return type.includes('image/svg+xml');
 return true;
}
async function missingAssets(cache){
 const responses=await Promise.all(ASSETS.map(path=>cache.match(path)));
 const missing=ASSETS.filter((path,index)=>!valid(path,responses[index]));
 const index=responses[ASSETS.indexOf('/index.html')];
 // A deployment changing during installation must not cache a mixed app shell.
 if(index&&index.ok&&!(await index.clone().text()).includes('name="offline-build" content="'+BUILD+'"')&&!missing.includes('/index.html'))missing.push('/index.html');
 return missing;
}
async function prepare(){
 const cache=await caches.open(CACHE),missing=await missingAssets(cache);
 if(missing.length)await cache.addAll(missing.map(path=>new Request(path,{cache:'reload',credentials:'omit'})));
 if((await missingAssets(cache)).length)throw new Error('Incomplete offline assets');
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
 try{await prepare();await self.skipWaiting();}catch(error){await caches.delete(CACHE);throw error;}
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const previous=(await caches.keys()).filter(key=>key.startsWith(PREFIX)&&key!==CACHE);
 // Retain one preceding build so an already-open tab can finish using its worker.
 await Promise.all(previous.slice(0,-1).map(key=>caches.delete(key)));
 await self.clients.claim();
})()));
self.addEventListener('message',event=>{
 if(!event.ports[0]||event.data?.schema!=='offline-assets-request-v1')return;
 event.waitUntil((async()=>{
  try{
   if(event.data.prepare&&event.data.expectedBuild===BUILD)await prepare();
   const cache=await caches.open(CACHE),missing=await missingAssets(cache);
   const workers=ASSETS.filter(path=>/counter\\.worker-.*\\.js$/.test(path));
   event.ports[0].postMessage({schema:'offline-assets-v1',build:BUILD,assetCount:ASSETS.length,missingCount:missing.length,workerReady:workers.length===1&&!missing.includes(workers[0])});
  }catch{event.ports[0].postMessage({schema:'offline-assets-error-v1',build:BUILD});}
 })());
});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 if(event.request.mode==='navigate'&&(url.pathname==='/'||url.pathname==='/index.html')){
  event.respondWith((async()=>{
   try{const response=await fetch(event.request);if(response.ok)return response;}catch{}
   return (await (await caches.open(CACHE)).match('/index.html'))||Response.error();
  })());return;
 }
 if(ASSETS.includes(url.pathname)||url.pathname.startsWith('/assets/')){
  event.respondWith((async()=>{
   const current=await caches.open(CACHE),saved=await current.match(url.pathname);
   if(saved)return saved;
   // Immutable old-build assets may still be needed by an open preceding tab.
   if(url.pathname.startsWith('/assets/'))for(const key of (await caches.keys()).filter(key=>key.startsWith(PREFIX)&&key!==CACHE)){
    const previous=await (await caches.open(key)).match(url.pathname);if(previous)return previous;
   }
   return fetch(event.request);
  })());
 }
});
`;
}
