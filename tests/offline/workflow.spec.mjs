import { test, expect, chromium } from '@playwright/test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { launchOptions } from '../../playwright.config.mjs';

const ready = page => expect(page.getByText('App assets prepared on this browser', { exact: true })).toBeVisible();
const network = page => page.getByRole('region', { name: 'Network and processing', exact: true });
const cloudLabel = baseURL => baseURL.startsWith('http://127.0.0.1:') ? 'Development Node service' : 'Vercel function';
async function example(page) {
  await page.getByRole('button', { name: 'Load eight-bead example', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Count this image', exact: true })).toBeEnabled();
}
async function count(page) {
  await page.getByRole('button', { name: /^(Count this image|Run a new count)$/ }).click();
  await expect(page.getByText('Computed result saved with its actual execution source. Human review is still required.', { exact: true })).toBeVisible();
}
async function contents(download) { return readFile(await download.path(), 'utf8'); }

test('prepared profile cold-reopens offline, counts, saves review, exports, restarts and reconnects', async ({ baseURL }, testInfo) => {
  const profile = await mkdtemp(join(tmpdir(), 'wolbachia-offline-'));
  let context;
  let page;
  try {
    const open = async offline => {
      context = await chromium.launchPersistentContext(profile, { ...launchOptions, offline, serviceWorkers: 'allow', viewport: { width: 390, height: 844 } });
      // Apply emulation after the persistent context's initial target exists too.
      await context.setOffline(offline);
      return context.pages()[0] || context.newPage();
    };
    page = await open(false);
    await page.goto(baseURL + '/#settings'); await ready(page);
    await page.goto(baseURL + '/#review'); await example(page); await count(page);
    await expect(network(page)).toContainText('Actual last count: ' + cloudLabel(baseURL));
    await context.close();

    page = await open(true);
    let offlineCloudResponses = 0;
    context.on('response', response => { if (new URL(response.url()).pathname === '/api/count-image' && response.request().method() === 'POST') offlineCloudResponses++; });
    const response = await page.goto(baseURL + '/#review');
    expect(response.fromServiceWorker()).toBe(true);
    expect(await page.evaluate(async () => {
      try { await fetch('/api/count-image', { cache: 'no-store' }); return false; } catch { return true; }
    })).toBe(true);
    // Some Chromium versions retain an online hint on a persistent cold start.
    // The failed uncached GET above proves network isolation; the app must still work.
    await expect(page.getByRole('heading', { name: 'Image review', exact: true })).toBeVisible();
    await example(page); await count(page);
    await expect(network(page)).toContainText('Actual last count: This browser’s worker');
    await expect(page.getByText(/Counted in this device’s browser worker; no image upload\. Used the fallback permitted/).first()).toBeVisible();
    expect(offlineCloudResponses).toBe(0);
    await page.getByRole('textbox', { name: 'Reviewed count', exact: true }).fill('0');
    await page.getByRole('textbox', { name: 'Reviewer label', exact: true }).fill('Offline 6B test');
    await page.getByRole('textbox', { name: /Review note/ }).fill('Controlled zero correction for the offline persistence check.');
    await page.getByRole('button', { name: 'Save human review', exact: true }).click();
    await expect(page.getByText('Human review saved. The computed estimate and earlier reviews were retained.', { exact: true })).toBeVisible();

    let pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export audit JSON', exact: true }).click();
    const audit = JSON.parse(await contents(await pending));
    expect(audit.record.analyses.at(-1).count).toBe(8);
    expect(audit.record.analyses.at(-1).execution).toBe('browser-worker');
    expect(audit.record.reviews.at(-1).count).toBe(0);
    expect(audit.record.provenance).toBe('generated_proxy');
    pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export image records', exact: true }).click();
    const csv = await contents(await pending);
    expect(csv).toContain('Offline 6B test'); expect(csv).toContain('browser-worker'); expect(csv).toContain('reviewed');
    const sizes = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
    expect(sizes.document).toBeLessThanOrEqual(sizes.viewport); expect(sizes.body).toBeLessThanOrEqual(sizes.viewport);
    await context.close();

    page = await open(true);
    await page.goto(baseURL + '/#review');
    await expect(page.getByRole('textbox', { name: 'Reviewed count', exact: true })).toHaveValue('0');
    await expect(page.getByRole('textbox', { name: 'Reviewer label', exact: true })).toHaveValue('Offline 6B test');
    await expect(network(page)).toContainText('This browser’s worker');
    await page.goto(baseURL + '/#settings'); await ready(page);
    const cachedApi = await page.evaluate(async () => {
      for (const name of await caches.keys()) if (name.startsWith('workshop-ready-')) {
        if ((await (await caches.open(name)).keys()).some(request => new URL(request.url).pathname.startsWith('/api/'))) return true;
      }
      return false;
    });
    expect(cachedApi).toBe(false);
    await context.setOffline(false);
    await page.goto(baseURL + '/#review');
    await count(page); await expect(network(page)).toContainText('Actual last count: ' + cloudLabel(baseURL));
    await expect(page.getByRole('heading', { name: 'Analysis & review history', exact: true })).toBeVisible();
    await testInfo.attach('offline-audit', { body: JSON.stringify(audit, null, 2), contentType: 'application/json' });
  } catch (error) {
    console.log('Cold-start diagnostic:', await page?.evaluate(() => ({ online: navigator.onLine, controller: !!navigator.serviceWorker.controller, body: document.body.innerText.slice(0, 2200) })).catch(() => 'Page unavailable'));
    throw error;
  } finally { await context?.close(); await rm(profile, { recursive: true, force: true }); }
});

test('missing cached worker is detected offline and repaired after reconnect', async ({ page, context }) => {
  await page.goto('/#settings'); await ready(page);
  await page.evaluate(async () => {
    for (const name of await caches.keys()) if (name.startsWith('workshop-ready-')) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) if (new URL(request.url).pathname.includes('counter.worker-')) await cache.delete(request);
    }
  });
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Check saved assets', exact: true }).click();
  await expect(page.getByText('Some required app assets are missing. Connect and prepare this browser again.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Prepare offline use', exact: true })).toBeDisabled();
  await context.setOffline(false);
  await page.getByRole('button', { name: 'Prepare offline use', exact: true }).click(); await ready(page);
});

test('cloud-first falls back when the service fails despite the browser connected hint', async ({ page, context }) => {
  await page.goto('/#settings'); await ready(page);
  await context.route('**/api/count-image', route => route.abort('connectionfailed'));
  await page.goto('/#review'); await example(page); await count(page);
  await expect(network(page)).toContainText('Reports connected');
  await expect(network(page)).toContainText('Actual last count: This browser’s worker');
  await expect(page.getByText(/Used the fallback permitted by your selected processing preference/).first()).toBeVisible();
});

test('HTML from a different release is not certified as the prepared app version', async ({ page }) => {
  await page.goto('/#settings'); await ready(page);
  await page.evaluate(async () => {
    for (const name of await caches.keys()) if (name.startsWith('workshop-ready-')) {
      const cache = await caches.open(name);
      const response = await cache.match('/index.html');
      if (response) await cache.put('/index.html', new Response((await response.text()).replace(/name="offline-build" content="[a-f0-9]+"/, 'name="offline-build" content="000000000000"'), { headers: { 'Content-Type': 'text/html' } }));
    }
  });
  await page.getByRole('button', { name: 'Check saved assets', exact: true }).click();
  await expect(page.getByText('Some required app assets are missing. Connect and prepare this browser again.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Prepare offline use', exact: true }).click(); await ready(page);
});

test('cloud-only stays blocked offline; changing to device-only permits local computation', async ({ page, context }) => {
  await page.goto('/#settings'); await ready(page);
  await page.goto('/#review'); await example(page);
  await page.getByRole('combobox', { name: 'Execution preference', exact: true }).selectOption('cloud');
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Count this image', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Vercel-only needs an internet connection');
  await expect(network(page)).toContainText('No computed result selected');
  let deviceUploads = 0;
  context.on('request', request => { if (new URL(request.url()).pathname === '/api/count-image' && request.method() === 'POST') deviceUploads++; });
  await page.getByRole('combobox', { name: 'Execution preference', exact: true }).selectOption('local');
  await count(page); await expect(network(page)).toContainText('This browser’s worker');
  expect(deviceUploads).toBe(0);
});

test('failed initial asset installation never claims preparation and can be retried', async ({ page, context }) => {
  await context.route('**/assets/counter.worker-*.js', route => route.fulfill({ status: 503, body: 'Controlled asset failure' }));
  const failed = context.waitForEvent('response', { predicate: response => response.url().includes('/assets/counter.worker-') && response.status() === 503 });
  await page.goto('/#settings'); await failed;
  await expect.poll(() => page.evaluate(async () => !(await navigator.serviceWorker.getRegistration())?.installing)).toBe(true);
  await expect(page.getByText('App assets prepared on this browser', { exact: true })).not.toBeVisible();
  await context.unroute('**/assets/counter.worker-*.js');
  await page.getByRole('button', { name: 'Prepare offline use', exact: true }).click(); await ready(page);
});

test('a fresh browser without initial preparation cannot cold-open while offline', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ offline: true, serviceWorkers: 'allow' });
  try {
    const page = await context.newPage();
    await expect(page.goto(baseURL + '/#review', { timeout: 10000 })).rejects.toThrow();
    await expect(page.getByRole('heading', { name: 'Image review', exact: true })).not.toBeVisible();
  } finally { await context.close(); }
});
