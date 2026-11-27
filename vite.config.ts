import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { offlineWorker } from './scripts/offline-worker.ts';
import { countImageRequest } from './api/count-image.ts';
import type { Plugin, ViteDevServer } from 'vite';

// The hosted API is a Vercel function; this adapter is only for development/preview.
function counterPreview(): Plugin {
  const configure = (server: { middlewares: ViteDevServer['middlewares'] }) => {
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
  };
  return { name: 'counter-local-api', configureServer: configure, configurePreviewServer: configure };
}

function offlineShell() {
  return {
    name: 'workshop-offline-shell',
    apply: 'build' as const,
    closeBundle() {
      const assets = ['/index.html', '/favicon.svg', '/manifest.webmanifest', ...readdirSync('dist/assets').sort().map(name => `/assets/${name}`)];
      const hash = createHash('sha256').update(offlineWorker([], ''));
      for (const asset of assets) hash.update(asset).update(readFileSync('dist' + asset));
      const version = hash.digest('hex').slice(0, 12);
      const html = readFileSync('dist/index.html', 'utf8').replace('</head>', `<meta name="offline-build" content="${version}">\n</head>`);
      writeFileSync('dist/index.html', html);
      writeFileSync('dist/sw.js', offlineWorker(assets, version));
    },
  };
}

export default defineConfig({
  plugins: [react(), counterPreview(), offlineShell()],
  build: { target: 'es2022' },
});
