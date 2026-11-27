import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('walkthrough opens by keyboard, keeps image tests separate, reopens offline and links the review workspaces on mobile', async ({ page, context, baseURL }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const guideNav = () => page.getByRole('navigation', { name: 'Workspace views', exact: true }).getByRole('link', { name: 'How to use', exact: true }).click();
  await page.goto('/#overview');
  const entry = page.getByRole('link', { name: 'Read the walkthrough', exact: true });
  await entry.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'How to use', exact: true, level: 1 })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Connected and offline walkthrough', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'How to use', exact: true, level: 1 })).toBeVisible();
  await page.getByRole('link', { name: 'Open processing settings', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Image counting method', exact: true })).toHaveValue('bead_cv');
  await expect(page.getByRole('combobox', { name: 'Where should image counting run?', exact: true })).toHaveValue('cloud-first');
  await expect(page.getByText('App assets prepared on this browser', { exact: true })).toBeVisible();
  await guideNav();
  await page.getByRole('link', { name: 'Open image tests', exact: true }).click();
  await page.getByRole('button', { name: 'Load eight-bead example', exact: true }).click();
  await page.getByRole('button', { name: 'Count this image', exact: true }).click();
  await expect(page.getByText('Computed result saved with its actual execution source. Human review is still required.', { exact: true })).toBeVisible();
  const runtime = baseURL.startsWith('http://127.0.0.1:') ? 'Development Node service' : 'Vercel function';
  await expect(page.getByRole('region', { name: 'Network and processing', exact: true })).toContainText('Actual last count: ' + runtime);

  await page.getByRole('button', { name: 'Demo examples Fixtures · no AI', exact: true }).click();
  await guideNav();
  await page.getByRole('link', { name: 'Open image tests', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Your image tests', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: /Your saved image tests/ })).toBeVisible();

  await context.setOffline(true);
  await page.goto('/#guide');
  // A hash change stays in the current document. Reload to prove a cached load.
  const response = await page.reload();
  expect(response.fromServiceWorker()).toBe(true);
  expect(await page.evaluate(async () => { try { await fetch('/api/count-image', { cache: 'no-store' }); return false; } catch { return true; } })).toBe(true);
  await expect(page.getByRole('heading', { name: 'How to use', exact: true, level: 1 })).toBeVisible();
  const help = page.locator('summary').filter({ hasText: 'The app does not reopen offline' });
  await help.focus(); await page.keyboard.press('Enter');
  await expect(page.getByText(/Reconnect using the same browser\/profile/)).toBeVisible();
  const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport); expect(widths.body).toBeLessThanOrEqual(widths.viewport);
  await page.getByRole('link', { name: 'Open image tests', exact: true }).click();
  await page.getByRole('button', { name: 'Run a new count', exact: true }).click();
  await expect(page.getByText('Computed result saved with its actual execution source. Human review is still required.', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Network and processing', exact: true })).toContainText('Actual last count: This browser’s worker');
  await page.getByRole('textbox', { name: 'Reviewed count', exact: true }).fill('8');
  await page.getByRole('textbox', { name: 'Reviewer label', exact: true }).fill('6E synthetic walkthrough rehearsal');
  await page.getByRole('button', { name: 'Save human review', exact: true }).click();
  await expect(page.getByText('Human review saved. The computed estimate and earlier reviews were retained.', { exact: true })).toBeVisible();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export audit JSON', exact: true }).click();
  const audit = JSON.parse(await readFile(await (await pending).path(), 'utf8'));
  expect(audit.record.provenance).toBe('generated_proxy');
  expect(audit.record.analyses.at(-1).execution).toBe('browser-worker');
  expect(audit.record.reviews.at(-1).reviewer).toBe('6E synthetic walkthrough rehearsal');
  for (const [link, title] of [['Open Container QA', 'Container QA'], ['Open Study & review', 'Study & review'], ['Open Inspection planning', 'Inspection planning'], ['Open Trends & modelling', 'Trends & modelling']]) {
    await guideNav();
    await page.getByRole('link', { name: link, exact: true }).click();
    await expect(page.getByRole('heading', { name: title, exact: true, level: 1 })).toBeVisible();
  }
});
