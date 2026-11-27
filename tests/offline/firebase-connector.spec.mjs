import { test, expect } from '@playwright/test';

// Observe all page/worker HTTP traffic, rather than letting a service worker hide
// provider requests. The existing offline suite separately covers the real cache.
test.use({ serviceWorkers: 'block' });

test('optional Firebase settings and selection stay idle until an explicit count; the small counter remains independent', async ({ page, context, baseURL }) => {
  const origin = new URL(baseURL).origin;
  const providerRequests = [];
  const countRequests = [];
  context.on('request', request => {
    const url = new URL(request.url());
    if (/^https?:$/.test(url.protocol) && url.origin !== origin) providerRequests.push(request.url());
    if (url.pathname === '/api/count-image' && request.method() === 'POST') countRequests.push(request.url());
  });
  // Any accidental provider request is recorded and blocked; dummy configuration
  // must never be transmitted to a live Firebase project during this test.
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    return /^https?:$/.test(url.protocol) && url.origin !== origin ? route.abort('blockedbyclient') : route.continue();
  });
  const openView = name => page.getByRole('link', { name, exact: true }).first().click();
  const connector = page.locator('#firebase-settings');

  await page.goto('/#settings');
  await expect(page.getByRole('combobox', { name: 'Image counting method', exact: true })).toHaveValue('bead_cv');
  await expect(connector).toContainText('Inactive · not configured');
  await openView('Image review');
  await page.getByRole('button', { name: 'Load eight-bead example', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Count this image', exact: true })).toBeEnabled();
  await page.getByRole('combobox', { name: 'Image counting method', exact: true }).selectOption('firebase');
  await expect(page.getByRole('button', { name: 'Count this image', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Save human review', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Optional Firebase settings', exact: true }).click();
  await expect(connector).toContainText('Inactive · not configured');
  await page.getByRole('combobox', { name: 'Image counting method', exact: true }).selectOption('bead_cv');

  await page.getByLabel('Firebase web app configuration', { exact: false }).fill(JSON.stringify({
    apiKey: 'dummy-public-key-connector-test-only', projectId: 'connector-test-only', appId: 'dummy-web-app-test-only',
  }));
  await page.getByLabel('App Check site key', { exact: true }).fill('dummy-public-site-key-test-only');
  await page.getByLabel('Cloud model ID', { exact: true }).fill('connector-test-no-live-model');
  await page.getByRole('button', { name: 'Save Firebase settings', exact: true }).click();
  await expect(connector).toContainText('Inactive · configuration saved');
  await expect(page.getByRole('combobox', { name: 'Image counting method', exact: true })).toHaveValue('bead_cv');
  await expect(page.getByText('Firebase configuration saved. A live connection has not been tested.', { exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Image counting method', exact: true }).selectOption('firebase');
  await expect(connector).toContainText('Selected · unverified');
  await page.reload();
  await expect(connector).toContainText('Selected · unverified');
  await openView('Image review');
  await expect(page.getByRole('button', { name: 'Count this image', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Save human review', exact: true })).toBeEnabled();
  expect(countRequests).toEqual([]);
  expect(providerRequests).toEqual([]);

  await openView('Data & settings');
  await page.getByRole('combobox', { name: 'Image counting method', exact: true }).selectOption('bead_cv');
  await expect(connector).toContainText('Inactive · configuration saved');
  await page.reload();
  await expect(connector).toContainText('Inactive · configuration saved');
  await expect(page.getByLabel('Cloud model ID', { exact: true })).toHaveValue('connector-test-no-live-model');
  await openView('Image review');
  await page.getByRole('button', { name: 'Count this image', exact: true }).click();
  await expect(page.getByText('Computed result saved with its actual execution source. Human review is still required.', { exact: true })).toBeVisible();
  const runtime = baseURL.startsWith('http://127.0.0.1:') ? 'Development Node service' : 'Vercel function';
  await expect(page.getByRole('region', { name: 'Network and processing', exact: true })).toContainText('Actual last count: ' + runtime);
  expect(countRequests).toHaveLength(1);
  expect(providerRequests).toEqual([]);
});
