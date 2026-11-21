import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { readdirSync, writeFileSync } from 'node:fs';
import { countImageRequest } from './api/count-image.ts';
import type { Plugin } from 'vite';

// The hosted API is a Vercel function; this adapter is only for development.
function counterPreview(): Plugin {
  return { name: 'counter-development-api', configureServer(server) {
    server.middlewares.use('/api/count-image', (req, res) => {
      void (async () => {
        const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
        const origin = req.headers.origin;
        if (origin && new URL(origin).host !== host) { res.statusCode = 403; res.end('Cross-origin count is not permitted.'); return; }
        const chunks: Buffer[] = []; let length = 0;
        for await (const chunk of req) { length += chunk.length; if (length > 2400000) { res.statusCode = 413; res.end('Image request is too large.'); return; } chunks.push(Buffer.from(chunk)); }
        const headers = new Headers(); for (const [key, value] of Object.entries(req.headers)) if (value) headers.set(key, Array.isArray(value) ? value.join(',') : value);
        const response = await countImageRequest(new Request((origin || 'http://' + host) + '/api/count-image', { method: req.method, headers, ...(req.method === 'POST' ? { body: new Uint8Array(Buffer.concat(chunks)).buffer } : {}) }));
        res.statusCode = response.status; response.headers.forEach((v, k) => res.setHeader(k, v)); res.end(Buffer.from(await response.arrayBuffer()));
      })().catch(() => { res.statusCode = 500; res.end('The development counter is unavailable.'); });
    });
  } };
}

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
  plugins: [react(), counterPreview(), offlineShell()],
  build: { target: 'es2022' },
});
