import test from 'node:test';
import assert from 'node:assert/strict';
import { caseSeries, emptyDashboardState, effectiveObservations, filteredObservations, observationCsv, OBSERVATIONS, parseDashboardState, percentChange, validateReviewCount } from './dashboard.ts';

test('a reviewed correction keeps its original sample estimate and affects only its own record', () => {
  const state = emptyDashboardState();
  state.reviews['OBS-004'] = { status: 'reviewed', count: 0, note: 'Empty sample', reviewedAt: '2026-11-21T04:00:00Z' };
  const result = effectiveObservations(state);
  assert.equal(result.find(o => o.id === 'OBS-004')!.reviewedCount, 0);
  assert.equal(result.find(o => o.id === 'OBS-004')!.estimate, OBSERVATIONS.find(o => o.id === 'OBS-004')!.estimate);
  assert.equal(result.find(o => o.id === 'OBS-008')!.status, 'pending');
});
test('review input accepts zero but rejects empty, fractional, negative and unsafe counts', () => {
  assert.equal(validateReviewCount('0'), 0);
  for (const value of ['', ' ', '-1', '1.5', 'NaN', '1e3', '100001']) assert.throws(() => validateReviewCount(value));
});
test('malformed saved state cannot introduce invalid counts, record IDs or follow-up locations', () => {
  const edit = { status: 'reviewed', count: -4, reviewedAt: '2026-11-21T04:00:00Z' };
  const state = parseDashboardState(JSON.stringify({ version: 1, mode: 'invalid', reviews: { 'OBS-004': edit, 'not-a-record': { ...edit, count: 4 } }, followUps: ['KEN','not-a-location','KEN'] }));
  assert.deepEqual(state.reviews, {});
  assert.deepEqual(state.followUps, ['KEN']);
  assert.equal(state.mode, 'cloud');
  assert.deepEqual(parseDashboardState('{broken'), emptyDashboardState());
  assert.deepEqual(parseDashboardState('{"note":"an old workshop draft"}'), emptyDashboardState());
});
test('rejected saved observations never retain a reviewed numeric count', () => {
  const state = parseDashboardState(JSON.stringify({ version: 1, reviews: { 'OBS-004': { status: 'rejected', count: 900, note: 'Unusable', reviewedAt: '2026-11-21T04:00:00Z' } } }));
  assert.equal(effectiveObservations(state).find(o => o.id === 'OBS-004')!.reviewedCount, null);
});
test('a location selection scopes both case series and exported observations', () => {
  const observations = filteredObservations(emptyDashboardState(), 'KEN', 4);
  assert.equal(observations.length, 4);
  assert.ok(observations.every(o => o.locationId === 'KEN'));
  assert.equal(caseSeries('KEN', 4).length, 4);
  assert.equal(caseSeries('KEN', 4).at(-1)!.cases, 12);
  const csv = observationCsv(observations);
  assert.match(csv, /synthetic_demo/);
  assert.match(csv, /fixture_estimate_no_ai/);
  assert.doesNotMatch(csv, /RC-MEL/);
});
test('observed change has an explicit unknown value when the comparison base is zero', () => {
  assert.equal(percentChange(2,0), null);
  assert.equal(percentChange(0,4), -100);
});
