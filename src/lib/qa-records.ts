import { csvCell } from './dashboard.ts';

export const ORIGINS = { synthetic_demo: 'Synthetic demonstration', bead_proxy: 'Bead-proxy test', field_observation: 'User-entered field observation' } as const;
export const CONDITIONS = { unknown: 'Unknown / not checked', intact: 'Intact', dry: 'Dry', damaged: 'Damaged / overturned', missing: 'Missing' } as const;
export const TEMPERATURES = { not_measured: 'Not measured', water: 'Container water', air: 'Local air', weather: 'Weather-station / external record' } as const;
export const EMERGENCE = { not_assessed: 'Not assessed', measured: 'Measured adults', estimated: 'Estimated adults' } as const;
export const OUTCOMES = { not_assessed: 'Not assessed', satisfactory: 'Satisfactory under cited protocol', needs_review: 'Needs review', failed: 'Failed under cited protocol' } as const;
export type QAOrigin = keyof typeof ORIGINS;
export interface QAPayload {
  origin: QAOrigin; container: string; batch: string; location: string; locationKind: 'mock' | 'user_reference';
  setupOn: string | null; observedOn: string; observedTime: string | null; timeZone: string;
  initialEggs: number | null; sourceReference: string;
  larvae: number | null; pupae: number | null; pupalSkins: number | null; deadImmatures: number | null; deadAdults: number | null;
  condition: keyof typeof CONDITIONS; temperatureC: number | null; temperatureBasis: keyof typeof TEMPERATURES; temperatureSource: string;
  emergenceBasis: keyof typeof EMERGENCE; emergedAdults: number | null; emergenceOn: string | null; emergenceMethod: string;
  outcome: keyof typeof OUTCOMES; assessedOn: string | null; assessor: string; protocolReference: string; notes: string;
}
export interface QARevision { number: number; savedAt: string; reason: string; data: QAPayload; }
export interface QARecord { schemaVersion: 1; id: string; createdAt: string; revisions: QARevision[]; }
export function currentQA(record: QARecord): QARevision { return record.revisions[record.revisions.length - 1]; }
export function isQADate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('The QA record is not an object.');
  return value as Record<string, unknown>;
}
export function validateQA(value: unknown): QAPayload {
  const raw = object(value), result = {} as QAPayload, out = result as unknown as Record<string,unknown>;
  for (const [key, options] of Object.entries({ origin: ORIGINS, condition: CONDITIONS, temperatureBasis: TEMPERATURES, emergenceBasis: EMERGENCE, outcome: OUTCOMES, locationKind: { mock: '', user_reference: '' } })) {
    if (typeof raw[key] !== 'string' || !Object.hasOwn(options,raw[key] as string)) throw new Error('Choose a valid '+key+' option.');
    out[key] = raw[key];
  }
  for (const key of ['container','batch','location','timeZone','sourceReference','temperatureSource','emergenceMethod','assessor','protocolReference','notes'] as const) {
    if (typeof raw[key] !== 'string') throw new Error('Enter text for '+key+'.');
    result[key] = (raw[key] as string).trim();
    if (result[key].length > (['notes','emergenceMethod','protocolReference'].includes(key) ? 2000 : 200)) throw new Error(key+' is too long.');
  }
  if (!result.container || !result.batch || !result.location) throw new Error('Container, batch and location references are required.');
  if (result.origin !== 'field_observation' && result.locationKind !== 'mock') throw new Error('Synthetic and bead-proxy records must keep a mock location label.');
  try { if (!result.timeZone) throw new Error(); new Intl.DateTimeFormat('en',{timeZone:result.timeZone}); } catch { throw new Error('Enter a valid IANA time zone, such as Asia/Jakarta.'); }
  if (!isQADate(raw.observedOn)) throw new Error('Enter a valid observation date.');
  result.observedOn = raw.observedOn;
  for (const key of ['setupOn','emergenceOn','assessedOn'] as const) {
    if (raw[key] !== null && !isQADate(raw[key])) throw new Error('Enter a valid '+key+' date or leave it unknown.');
    result[key] = raw[key] as string | null;
  }
  if (raw.observedTime !== null && (typeof raw.observedTime !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(raw.observedTime))) throw new Error('Enter a valid observation time or leave it unknown.');
  result.observedTime = raw.observedTime as string | null;
  if (result.setupOn && result.setupOn > result.observedOn) throw new Error('Setup cannot be after the observation.');
  for (const key of ['initialEggs','larvae','pupae','pupalSkins','deadImmatures','deadAdults','emergedAdults'] as const) {
    const n = raw[key];
    if (n !== null && !(typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 && n <= 100000)) throw new Error(key+': enter a whole count from 0 to 100,000, or leave it unknown.');
    result[key] = n as number | null;
  }
  if (result.initialEggs !== null && !result.sourceReference) throw new Error('Add the source/reference for the starting egg quantity.');
  if (raw.temperatureC !== null && !(typeof raw.temperatureC === 'number' && Number.isFinite(raw.temperatureC) && raw.temperatureC >= -273.15)) throw new Error('Enter a finite temperature in °C, or leave it unknown.');
  result.temperatureC = raw.temperatureC as number | null;
  if (result.temperatureBasis === 'not_measured') {
    if (result.temperatureC !== null) throw new Error('A temperature labelled not measured cannot contain a reading.');
  } else if (result.temperatureC === null || !result.temperatureSource) throw new Error('A temperature reading needs its value and sensor/station/source reference.');
  if (result.emergenceBasis === 'not_assessed') {
    if (result.emergedAdults !== null || result.emergenceOn !== null || result.emergenceMethod) throw new Error('Unassessed emergence must keep its count, date and method empty.');
  } else {
    if (result.emergedAdults === null || !result.emergenceOn || !result.emergenceMethod) throw new Error('An emergence result needs its count, assessment date and measurement/estimation method.');
    if (result.emergenceOn < result.observedOn) throw new Error('The emergence assessment cannot precede this observation; create a separate earlier observation if needed.');
  }
  if (result.outcome === 'not_assessed') {
    if (result.assessedOn !== null || result.assessor || result.protocolReference) throw new Error('Unassessed QA must keep its assessment date, assessor and protocol empty.');
  } else {
    if (!result.assessedOn || !result.assessor || !result.protocolReference) throw new Error('A QA outcome needs an assessment date, assessor label and protocol/reference.');
    if (result.assessedOn < result.observedOn) throw new Error('The QA assessment cannot precede this observation.');
    if (result.emergenceOn && result.emergenceOn > result.assessedOn) throw new Error('QA cannot cite an emergence result assessed later than the QA date.');
  }
  return result;
}
export function validateQARecord(value: unknown): QARecord {
  const raw = object(value);
  if (raw.schemaVersion !== 1 || typeof raw.id !== 'string' || !raw.id || raw.id.length > 100 || typeof raw.createdAt !== 'string' || !Number.isFinite(Date.parse(raw.createdAt)) || !Array.isArray(raw.revisions) || !raw.revisions.length) throw new Error('The saved QA record has an unsupported format.');
  let origin: QAOrigin | undefined, priorTime = raw.createdAt;
  const revisions = raw.revisions.map((entry,i) => {
    const r = object(entry);
    if (r.number !== i+1 || typeof r.savedAt !== 'string' || !Number.isFinite(Date.parse(r.savedAt)) || Date.parse(r.savedAt) < Date.parse(priorTime) || typeof r.reason !== 'string' || !r.reason.trim() || r.reason.length > 500) throw new Error('The QA revision history is invalid.');
    const data = validateQA(r.data);
    if (origin && data.origin !== origin) throw new Error('The origin cannot change within a QA record.');
    origin = data.origin; priorTime = r.savedAt;
    return {number:i+1,savedAt:r.savedAt,reason:r.reason.trim(),data};
  });
  return {schemaVersion:1,id:raw.id,createdAt:raw.createdAt,revisions};
}
export function qaAge(data: QAPayload): number | null { return data.setupOn ? Math.round((Date.parse(data.observedOn)-Date.parse(data.setupOn))/86400000) : null; }
export function qaGaps(data: QAPayload): string[] {
  const gaps: string[] = [];
  if (!data.setupOn) gaps.push('Setup date unknown');
  if ([data.larvae,data.pupae,data.pupalSkins,data.deadImmatures,data.deadAdults].some(n=>n === null)) gaps.push('Some stage counts unobserved');
  if (data.temperatureBasis !== 'water') gaps.push('No container-water temperature');
  if (data.emergenceBasis === 'not_assessed') gaps.push('Emergence not assessed');
  if (data.outcome === 'not_assessed') gaps.push('QA outcome not assessed');
  return gaps;
}
export function qaCsv(records: QARecord[]): string {
  const keys: (keyof QAPayload)[] = ['origin','container','batch','location','locationKind','setupOn','observedOn','observedTime','timeZone','initialEggs','sourceReference','larvae','pupae','pupalSkins','deadImmatures','deadAdults','condition','temperatureC','temperatureBasis','temperatureSource','emergenceBasis','emergedAdults','emergenceOn','emergenceMethod','outcome','assessedOn','assessor','protocolReference','notes'];
  const rows: (string | number | null)[][] = [['schema','record_id','revision','saved_at',...keys,'wolbachia_infection_status','recording_method']];
  for (const record of records) { const r = currentQA(record); rows.push(['container-qa-v1',record.id,r.number,r.savedAt,...keys.map(k=>r.data[k]),'not_captured_in_this_record',r.data.origin==='synthetic_demo'?'synthetic_fixture':'manual_entry']); }
  return rows.map(row=>row.map(value=>typeof value==='number'?'"'+String(value)+'"':csvCell(value)).join(',')).join('\r\n');
}
export function qaAudit(records: QARecord[]): string {
  return JSON.stringify({schema:'container-qa-audit-v1',exportedAt:new Date().toISOString(),notes:'User-entered labels and references are not independent certification. No infection status is inferred. No image bytes included.',records},null,2);
}
export function sampleQARecords(now = new Date().toISOString()): QARecord[] {
  const base: QAPayload = {origin:'synthetic_demo',container:'DEMO-QA-01',batch:'DEMO-BATCH-A',location:'Melati (fictional)',locationKind:'mock',setupOn:'2026-11-10',observedOn:'2026-11-17',observedTime:'09:00',timeZone:'Asia/Jakarta',initialEggs:100,sourceReference:'Synthetic batch sheet; no real eggs',larvae:12,pupae:18,pupalSkins:55,deadImmatures:3,deadAdults:0,condition:'intact',temperatureC:29.5,temperatureBasis:'water',temperatureSource:'Synthetic sensor reading',emergenceBasis:'not_assessed',emergedAdults:null,emergenceOn:null,emergenceMethod:'',outcome:'not_assessed',assessedOn:null,assessor:'',protocolReference:'',notes:'Fictional demonstration only. Stage counts do not automatically establish adult emergence.'};
  const data: QAPayload[] = [base,{...base,container:'DEMO-QA-02',location:'Kenanga (fictional)',larvae:0,pupae:0,pupalSkins:0,deadImmatures:63,condition:'dry',temperatureC:null,temperatureBasis:'not_measured',temperatureSource:'',emergenceBasis:'measured',emergedAdults:0,emergenceOn:'2026-11-18',emergenceMethod:'Synthetic direct adult count; no biological observation.',outcome:'failed',assessedOn:'2026-11-18',assessor:'Demo assessor',protocolReference:'Illustrative QA decision only; not a field threshold.',notes:'Zero adults is explicitly entered, not inferred from zero larvae.'},{...base,container:'DEMO-QA-03',location:'Cempaka (fictional)',setupOn:null,initialEggs:null,sourceReference:'',larvae:null,pupae:null,pupalSkins:null,deadImmatures:null,deadAdults:null,temperatureC:31,temperatureBasis:'weather',temperatureSource:'Synthetic weather station; not water temperature',notes:'Unknown counts stay unknown. A weather reading is not a container-water reading.'}];
  return data.map((d,i)=>validateQARecord({schemaVersion:1,id:'qa-demo-'+(i+1),createdAt:now,revisions:[{number:1,savedAt:now,reason:'Load clearly labelled synthetic example',data:d}]}));
}
