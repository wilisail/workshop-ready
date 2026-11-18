import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { readdirSync, writeFileSync } from 'node:fs';

function offlineShell() {
  return {
    name: 'workshop-offline-shell',
    apply: 'build' as const,
    closeBundle() {
      const assets = ['/', '/index.html', '/favicon.svg', '/manifest.webmanifest', ...readdirSync('dist/assets').map(name => `/assets/${name}`)];
      const version = createHash('sha256').update(JSON.stringify(assets)).digest('hex').slice(0, 12);
      const worker = `const CACHE='workshop-ready-${version}';
const ASSETS=${JSON.stringify(assets)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('workshop-ready-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 if(event.request.mode==='navigate'){
  event.respondWith(fetch(event.request).catch(()=>caches.match('/index.html').then(response=>response||Response.error())));return;
 }
 if(ASSETS.includes(url.pathname))event.respondWith(caches.match(url.pathname).then(response=>response||fetch(event.request)));
});`;
      writeFileSync('dist/sw.js', worker);
    },
  };
}

export default defineConfig({
  plugins: [react(), offlineShell()],
  build: { target: 'es2022' },
});
