export type View = 'overview' | 'review' | 'containers' | 'studies' | 'trends' | 'planning' | 'settings';
export type ReviewStatus = 'pending' | 'reviewed' | 'rejected';
export type ProcessingMode = 'cloud' | 'cloud-first' | 'hybrid' | 'local';

export interface DemoLocation {
  id: string;
  name: string;
  sector: string;
  population: number;
  cases: number[];
  coordinates: [number, number];
}
export interface Observation {
  id: string;
  locationId: string;
  container: string;
  capturedAt: string;
  estimate: number;
  beadCount: number;
  status: ReviewStatus;
  reviewedCount: number | null;
  flags: string[];
}
export interface ReviewEdit {
  status: 'reviewed' | 'rejected';
  count: number | null;
  note: string;
  reviewedAt: string;
}
export interface DashboardState {
  version: 1;
  mode: ProcessingMode;
  reviews: Record<string, ReviewEdit>;
  followUps: string[];
}
export const DASHBOARD_KEY = 'wolbachia-field-review:workspace:v1';
export const DATASET_ID = 'synthetic-workspace-v1';
export const VIEWS: View[] = ['overview', 'review', 'containers', 'studies', 'trends', 'planning', 'settings'];
export const MODE_LABELS: Record<ProcessingMode, string> = {
  cloud: 'Cloud only — default',
  'cloud-first': 'Prefer cloud, allow device fallback',
  hybrid: 'Prefer device, allow cloud fallback',
  local: 'Device only — no cloud fallback',
};
export const WEEKS = Array.from({ length: 12 }, (_, i) => new Date(Date.UTC(2026, 7, 31 + i * 7)).toISOString().slice(0, 10));
export const PERIOD_END = new Date(Date.parse(WEEKS.at(-1)! + 'T00:00:00Z') + 6 * 86400000).toISOString().slice(0, 10);
export const LOCATIONS: DemoLocation[] = [
  { id: 'MEL', name: 'Melati', sector: 'North', population: 1800, cases: [10,12,11,14,13,11,10,9,8,7,8,6], coordinates: [-7.800,110.360] },
  { id: 'KEN', name: 'Kenanga', sector: 'East', population: 2200, cases: [5,6,4,7,8,7,9,8,9,11,10,12], coordinates: [-7.805,110.375] },
  { id: 'CEM', name: 'Cempaka', sector: 'North', population: 1600, cases: [8,9,8,7,7,6,6,5,4,4,3,3], coordinates: [-7.792,110.365] },
  { id: 'MAW', name: 'Mawar', sector: 'West', population: 1900, cases: [6,5,7,6,6,5,4,5,3,3,4,3], coordinates: [-7.812,110.350] },
  { id: 'ANG', name: 'Anggrek', sector: 'East', population: 1400, cases: [4,5,4,5,5,4,4,3,4,3,3,2], coordinates: [-7.814,110.381] },
  { id: 'FLA', name: 'Flamboyan', sector: 'West', population: 2000, cases: [9,10,9,11,10,8,7,8,6,5,6,5], coordinates: [-7.795,110.348] },
];
export const OBSERVATIONS: Observation[] = LOCATIONS.flatMap((location, i) => [0,1,2,3].map(j => {
  const beadCount = 38 + (i * 7 + j * 5) % 31;
  const status: ReviewStatus = i === 4 && j === 1 ? 'rejected' : j === 3 || (i % 3 === 1 && j === 2) ? 'pending' : 'reviewed';
  return {
    id: `OBS-${String(i * 4 + j + 1).padStart(3, '0')}`,
    locationId: location.id,
    container: `RC-${location.id}-${String(j + 1).padStart(2, '0')}`,
    capturedAt: `2026-11-${[10,13,16,18][j]}T${String(8 + i).padStart(2, '0')}:30:00+07:00`,
    estimate: beadCount + (i + j) % 3 - 1,
    beadCount,
    status,
    reviewedCount: status === 'reviewed' ? beadCount : null,
    flags: status === 'rejected' ? ['Unusable sample'] : j === 3 ? ['Review requested'] : [],
  };
}));

export function emptyDashboardState(): DashboardState {
  return { version: 1, mode: 'cloud', reviews: {}, followUps: [] };
}
export function parseDashboardState(raw: string | null): DashboardState {
  const clean = emptyDashboardState();
  try {
    const value: unknown = JSON.parse(raw || '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return clean;
    const data = value as Record<string, unknown>;
    if (data.version !== 1) return clean;
    if (typeof data.mode === 'string' && Object.hasOwn(MODE_LABELS, data.mode)) clean.mode = data.mode as ProcessingMode;
    if (Array.isArray(data.followUps)) clean.followUps = [...new Set(data.followUps.filter((id): id is string => typeof id === 'string' && LOCATIONS.some(l => l.id === id)))];
    if (data.reviews && typeof data.reviews === 'object' && !Array.isArray(data.reviews)) {
      for (const [id, rawEdit] of Object.entries(data.reviews)) {
        if (!OBSERVATIONS.some(o => o.id === id) || !rawEdit || typeof rawEdit !== 'object') continue;
        const edit = rawEdit as Partial<ReviewEdit>;
        if (edit.status !== 'reviewed' && edit.status !== 'rejected') continue;
        if (edit.status === 'reviewed' && !(typeof edit.count === 'number' && Number.isSafeInteger(edit.count) && edit.count >= 0 && edit.count <= 100000)) continue;
        if (typeof edit.reviewedAt !== 'string' || !Number.isFinite(Date.parse(edit.reviewedAt))) continue;
        clean.reviews[id] = { status: edit.status, count: edit.status === 'reviewed' ? edit.count! : null, note: typeof edit.note === 'string' ? edit.note.slice(0, 500) : '', reviewedAt: edit.reviewedAt };
      }
    }
  } catch { /* A corrupt or unavailable local draft must not block the dashboard. */ }
  return clean;
}
export function readDashboardState(): DashboardState {
  try { return parseDashboardState(localStorage.getItem(DASHBOARD_KEY)); } catch { return emptyDashboardState(); }
}
export function effectiveObservations(state: DashboardState): Observation[] {
  return OBSERVATIONS.map(observation => {
    const edit = state.reviews[observation.id];
    return edit ? { ...observation, status: edit.status, reviewedCount: edit.count } : observation;
  });
}
export function filteredObservations(state: DashboardState, locationId: string, weeks: number): Observation[] {
  const start = WEEKS[Math.max(0, WEEKS.length - weeks)];
  const end = new Date(Date.parse(WEEKS.at(-1)! + 'T00:00:00Z') + 7 * 86400000).toISOString().slice(0, 10);
  return effectiveObservations(state).filter(o => (locationId === 'all' || o.locationId === locationId) && o.capturedAt.slice(0, 10) >= start && o.capturedAt.slice(0, 10) < end);
}
export function caseSeries(locationId: string, weeks: number): { week: string; cases: number }[] {
  const locations = LOCATIONS.filter(l => locationId === 'all' || l.id === locationId);
  return WEEKS.map((week, i) => ({ week, cases: locations.reduce((sum, l) => sum + l.cases[i], 0) })).slice(-weeks);
}
export function percentChange(current: number, previous: number): number | null {
  return previous === 0 ? null : (current - previous) / previous * 100;
}
export function validateReviewCount(value: string): number {
  if (!/^\d+$/.test(value.trim())) throw new Error('Enter a whole-number count of zero or more.');
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count > 100000) throw new Error('Enter a count between 0 and 100,000.');
  return count;
}
export function shortDate(date: string, includeYear = false): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', ...(includeYear ? { year: 'numeric' } : {}), timeZone: 'Asia/Jakarta' }).format(new Date(date.length === 10 ? date + 'T00:00:00Z' : date));
}
export function locationName(id: string): string { return LOCATIONS.find(l => l.id === id)?.name || id; }
export function csvCell(value: string | number | null): string {
  const string = value === null ? '' : String(value);
  return '"' + (/^\s*[=+@-]|^[\t\r\n]/.test(string) ? "'" + string : string).replaceAll('"', '""') + '"';
}
export function observationCsv(observations: Observation[]): string {
  const rows: (string | number | null)[][] = [['dataset', 'provenance', 'observation_id', 'location', 'container', 'captured_at', 'fixture_estimate_no_ai', 'reviewed_count', 'status']];
  for (const o of observations) rows.push([DATASET_ID, 'synthetic_demo', o.id, locationName(o.locationId), o.container, o.capturedAt, o.estimate, o.reviewedCount, o.status]);
  return rows.map(row => row.map(csvCell).join(',')).join('\r\n');
}
