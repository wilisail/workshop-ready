import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function audit(page, button) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: button, exact: true }).click();
  return JSON.parse(await readFile(await (await pending).path(), 'utf8'));
}

test('synthetic QA, study review, fitted model and inspection decision remain traceable through exports and reload', async ({ page, context, baseURL }) => {
  // This is a disposable software rehearsal, never owner or field evidence.
  const external = [];
  const appOrigin = new URL(baseURL).origin;
  context.on('request', request => {
    const url = new URL(request.url());
    if (/^https?:$/.test(url.protocol) && url.origin !== appOrigin) external.push(request.url());
  });
  await page.goto('/#containers');
  await page.getByRole('button', { name: 'Load synthetic examples', exact: true }).click();
  await expect(page.getByText('Loaded synthetic QA examples. Your records and existing history were retained.', { exact: true })).toBeVisible();
  const qa = await audit(page, 'Export all QA history');
  expect(JSON.stringify(qa)).toContain('synthetic_demo');

  await page.goto('/#studies');
  await page.getByRole('button', { name: 'Create synthetic study example', exact: true }).click();
  await page.getByRole('button', { name: 'Run descriptive / readiness check', exact: true }).click();
  await expect(page.getByText('Saved the descriptive/readiness output against its plan and dataset versions.', { exact: true })).toBeVisible();
  await page.getByLabel('Reviewer label', { exact: true }).fill('Step 7 software rehearsal');
  await page.getByLabel('Review decision', { exact: true }).selectOption('reviewed');
  await page.getByLabel('Review comments and limitations', { exact: true }).fill('Synthetic fixture review only; no field validation or independent review occurred.');
  await page.getByRole('button', { name: 'Record review comment', exact: true }).click();
  await expect(page.getByText('Saved the review against the displayed versions.', { exact: true })).toBeVisible();
  const counting = (await audit(page, 'Export full study audit')).study;
  expect(counting.plans.at(-1).data.expectedOrigin).toBe('synthetic_demo');
  expect(counting.runs.at(-1).counts).toMatchObject({ validPairs: 4, missingPairs: 1, excluded: 1, mae: 1.25 });
  expect(counting.reviews.at(-1).runId).toBe(counting.runs.at(-1).id);

  await page.goto('/#trends');
  await page.getByRole('button', { name: 'Create synthetic prediction example', exact: true }).click();
  await page.getByRole('button', { name: 'Train and evaluate', exact: true }).click();
  await expect(page.getByText('Saved the fitted model, untouched test predictions and baseline comparison.', { exact: true })).toBeVisible();
  const trained = (await audit(page, 'Export model audit')).study;
  const model = trained.predictionRuns.at(-1);
  expect(model.status).toBe('evaluated');
  expect(model.origin).toBe('synthetic_demo');
  expect(model.metrics.model.accuracy).toBeCloseTo(0.6);
  expect(model.metrics.prevalence.accuracy).toBeCloseTo(0.7);
  expect(model.metrics.model).toMatchObject({ tp: 0, fn: 3 });
  await page.getByRole('button', { name: 'Open this study and review', exact: true }).click();
  await page.getByLabel('Reviewer label', { exact: true }).fill('Step 7 software rehearsal');
  await page.getByLabel('Review comments and limitations', { exact: true }).fill('The model underperformed the constant baseline and missed three failures. Not suitable for automatic field decisions.');
  await page.getByRole('button', { name: 'Record review comment', exact: true }).click();
  await expect(page.getByText('Saved the review against the displayed versions.', { exact: true })).toBeVisible();
  const reviewed = (await audit(page, 'Export full study audit')).study;
  expect(reviewed.reviews.at(-1).predictionRunId).toBe(model.id);

  await page.goto('/#planning');
  await page.getByLabel('Planning date', { exact: true }).fill('2026-11-27');
  await page.getByRole('button', { name: 'Generate inspection queue', exact: true }).click();
  await expect(page.getByText('Saved an evidence-linked inspection queue. Suggestions await human decisions.', { exact: true })).toBeVisible();
  await page.getByLabel('Reviewer label', { exact: true }).fill('Step 7 software rehearsal');
  await page.getByLabel('Assignee label', { exact: true }).fill('Demo operator');
  await page.getByLabel('Task due date', { exact: true }).fill('2026-11-28');
  await page.getByLabel('Decision reason', { exact: true }).fill('Synthetic workflow rehearsal; inspect the pinned example evidence. No real assignment.');
  await page.getByRole('button', { name: 'Save inspection decision', exact: true }).click();
  await expect(page.getByText('Saved a versioned human decision. No external assignment was sent.', { exact: true })).toBeVisible();
  const plan = (await audit(page, 'Export inspection audit')).plan;
  expect(plan.source.origin).toBe('synthetic_demo');
  expect(plan.source.records).toHaveLength(3);
  expect(plan.items.length).toBeGreaterThan(0);
  expect(plan.decisions.at(-1)).toMatchObject({ action: 'accept', reviewer: 'Step 7 software rehearsal', assignee: 'Demo operator', dueOn: '2026-11-28' });
  await page.reload();
  const reopened = (await audit(page, 'Export inspection audit')).plan;
  expect(reopened.id).toBe(plan.id);
  expect(reopened.decisions).toEqual(plan.decisions);
  expect(external).toEqual([]);
});
