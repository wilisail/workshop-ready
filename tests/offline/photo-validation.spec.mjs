import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function fixture(page) {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 240;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 320, 240); ctx.fillStyle = '#223366';
    for (const [x, y] of [[40, 40], [100, 40], [160, 40], [220, 40], [40, 140], [100, 140], [160, 140], [220, 140]]) { ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill(); }
    return canvas.toDataURL('image/png').split(',')[1];
  });
  return { name: 'synthetic-validation-fixture.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') };
}
async function upload(page, file) {
  await page.getByRole('button', { name: 'Add an image', exact: true }).click();
  await page.getByRole('button', { name: 'Save image locally', exact: true }).waitFor();
  await page.getByLabel('Image file', { exact: true }).setInputFiles(file);
  await page.getByLabel('Container ID', { exact: true }).fill('SYNTHETIC-SETUP-A');
  await page.getByRole('button', { name: 'Save image locally', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Count this image', exact: true })).toBeEnabled();
}
async function reference(page, value) {
  await page.getByLabel('Image evidence declaration', { exact: true }).selectOption('synthetic_test');
  await page.getByLabel('Reference count', { exact: true }).fill(String(value));
  await page.getByLabel('Reference counter / reviewer', { exact: true }).fill('Synthetic fixture reference');
  await page.getByLabel('How the reference was obtained', { exact: true }).fill('Controlled reference fixture, not a human field observation');
  await page.getByRole('checkbox', { name: 'Count obtained separately from the computed estimate', exact: true }).check();
  await page.getByRole('button', { name: 'Save separate reference', exact: true }).click();
  await expect(page.getByText('Separate reference saved with its declaration history. Computed estimates and human corrections were retained.', { exact: true })).toBeVisible();
}
async function audit(page) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export validation audit', exact: true }).click();
  return JSON.parse(await readFile(await (await pending).path(), 'utf8'));
}

test('uploaded diagnostic photos retain separate references, unchanged computed errors, history and duplicate accounting offline', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#settings'); await expect(page.getByText('App assets prepared on this browser', { exact: true })).toBeVisible();
  const file = await fixture(page);
  await context.setOffline(true);
  await page.goto('/#review');
  await expect(page.getByText('Photo-error measurements pending', { exact: true })).toBeVisible();
  await upload(page, file); await reference(page, 10);
  await page.getByLabel('Comparison scope', { exact: true }).selectOption('synthetic_test');
  await page.getByRole('button', { name: 'Count this image', exact: true }).click();
  await expect(page.getByText('Computed result saved with its actual execution source. Human review is still required.', { exact: true })).toBeVisible();
  let report = await audit(page); expect(report.scope).toBe('synthetic_test'); expect(report.summary.mae).toBe(2);
  expect(report.records[0].references[0].recordedAfterAnalysis).toBe(false);
  await page.getByRole('textbox', { name: 'Reviewed count', exact: true }).fill('0');
  await page.getByRole('textbox', { name: /Review note/ }).fill('Controlled human correction for the workflow check');
  await page.getByRole('button', { name: 'Save human review', exact: true }).click();
  await expect(page.getByText('Human review saved. The computed estimate and earlier reviews were retained.', { exact: true })).toBeVisible();
  report = await audit(page); expect(report.summary.mae).toBe(2); expect(report.records[0].analyses[0].count).toBe(8); expect(report.records[0].reviews[0].count).toBe(0);
  await page.locator('.reference-details > summary').click();
  await page.getByLabel('Reference count', { exact: true }).fill('9');
  await page.getByLabel('Reason for reference amendment', { exact: true }).fill('Controlled reference amendment');
  await page.getByRole('button', { name: 'Save reference amendment', exact: true }).click();
  await expect(page.getByText('Separate reference saved with its declaration history. Computed estimates and human corrections were retained.', { exact: true })).toBeVisible();
  report = await audit(page); expect(report.summary.mae).toBe(1); expect(report.records[0].references).toHaveLength(2);
  await page.reload();
  await page.getByLabel('Comparison scope', { exact: true }).selectOption('synthetic_test');
  report = await audit(page); expect(report.summary.mae).toBe(1); expect(report.records[0].references).toHaveLength(2);
  await upload(page, file); await reference(page, 9);
  report = await audit(page); expect(report.summary.observations).toBe(2); expect(report.summary.validPairs).toBe(1); expect(report.summary.excluded).toBe(1); expect(report.summary.mae).toBe(1);
  await page.getByLabel('Comparison scope', { exact: true }).selectOption('prepared_beads');
  await expect(page.getByText('Photo-error measurements pending', { exact: true })).toBeVisible();
  const sizes = await page.evaluate(() => ({ view: document.documentElement.clientWidth, page: document.documentElement.scrollWidth }));
  expect(sizes.page).toBeLessThanOrEqual(sizes.view);
});

test('public-health data-entry rehearsal keeps synthetic origin, unknown stages and unassessed outcomes in its export', async ({ page, context }) => {
  await page.goto('/#settings'); await expect(page.getByText('App assets prepared on this browser', { exact: true })).toBeVisible();
  await context.setOffline(true); await page.goto('/#containers');
  await page.getByRole('button', { name: 'New QA observation', exact: true }).click();
  await page.getByLabel('Record origin', { exact: true }).selectOption('synthetic_demo');
  await page.getByLabel('Container reference', { exact: true }).fill('REHEARSAL-ONLY-01');
  await page.getByLabel('Batch / release cycle reference', { exact: true }).fill('REHEARSAL');
  await page.getByLabel('Location reference', { exact: true }).fill('Mock training location');
  await page.getByLabel('Live larvae', { exact: true }).fill('0');
  await page.getByLabel('Observation notes', { exact: true }).fill('Software workflow rehearsal only; no field data or release decision.');
  await page.getByRole('button', { name: 'Save QA observation', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Revise record', exact: true })).toBeVisible();
  const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export all QA history', exact: true }).click();
  const report = JSON.parse(await readFile(await (await pending).path(), 'utf8'));
  const record = report.records[0].revisions[0].data;
  expect(record.origin).toBe('synthetic_demo'); expect(record.locationKind).toBe('mock'); expect(record.larvae).toBe(0); expect(record.pupae).toBe(null); expect(record.outcome).toBe('not_assessed'); expect(record.emergenceBasis).toBe('not_assessed');
});
