import { CONDITIONS, currentQA, isQADate, ORIGINS, qaGaps, validateQARecord } from './qa-records.ts';
import type { QAOrigin, QARecord, QAPayload } from './qa-records.ts';
import { currentDataset, currentPredictionRun, latestPlan, validateDataset, validatePlan } from './studies.ts';
import type { PlanRevision, Study, StudyDataset } from './studies.ts';
import { validatePredictionRun } from './prediction.ts';
import type { PredictionRun } from './prediction.ts';
import { csvCell } from './dashboard.ts';

export const INSPECTION_VERSION = 'inspection-review-v1';
export const INSPECTION_SOFTWARE = '0.7.0';
export const PRIORITIES = { review_first: 'Review first', complete_record: 'Complete evidence', routine: 'Routine review' } as const;
export const INSPECTION_DECISIONS = { accept: 'Accept inspection task', defer: 'Defer for review', dismiss: 'Dismiss suggestion' } as const;
export const INSPECTION_METHOD = [
  'Use observations dated on/before the planning date; ignore later QA/emergence assessments when deriving priorities.',
  'Group by container, batch/release cycle and location reference. Retain all records; use the latest calendar date for current reasons. Same-day ties require reconciliation.',
  'Review first: adverse container condition, an available failed/needs-review QA label, or ambiguous latest-day records.',
  'Complete evidence: unknown condition/setup/outcome, an observation older than the chosen threshold, or missing fields explicitly required by the selected project checks.',
  'Otherwise show routine review. This is absence of a rule flag, not certification of a successful release.',
  'Sort by priority, then oldest latest-observation date, then stable container/batch/location key. Suggest only the chosen capacity; retain every candidate.',
  'Model scores, dengue changes, coordinates and egg/release quantities do not rank this queue. A model evaluation is historical supporting context only.',
  'Suggested inspections require a recorded human decision. No assignment is sent, field action executed or mosquito release authorized.',
];
export interface InspectionConfig {
  asOf: string; maxAgeDays: number | null; capacity: number;
  requireStageCounts: boolean; requireWaterTemperature: boolean; requireEmergence: boolean;
}
export type InspectionSource =
  { kind: 'qa_store'; origin: QAOrigin; records: QARecord[] } |
  { kind: 'study'; origin: QAOrigin; studyId: string; title: string; plan: PlanRevision; dataset: StudyDataset; model: PredictionRun | null };
export interface InspectionItem {
  id: string; key: string; container: string; batch: string; location: string; locationKind: QAPayload['locationKind'];
  latestOn: string; ageDays: number; priority: keyof typeof PRIORITIES; suggested: boolean;
  reasons: string[]; gaps: string[];
  evidence: { recordId: string; revision: number; observedOn: string }[];
  relatedRecordIds: string[];
}
export interface InspectionDecision {
  id: string; number: number; savedAt: string; itemId: string;
  action: keyof typeof INSPECTION_DECISIONS; reviewer: string; reason: string; assignee: string; dueOn: string | null;
}
export interface InspectionPlan {
  schemaVersion: 1; id: string; title: string; createdAt: string; sequence: number;
  algorithmVersion: typeof INSPECTION_VERSION; softwareVersion: string;
  replacesPlanId: string | null; config: InspectionConfig; source: InspectionSource;
  items: InspectionItem[]; excluded: { recordId: string; reason: string }[];
  decisions: InspectionDecision[];
}
function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid inspection record.'); return value as Record<string, unknown>; }
function text(value: unknown, name: string, limit = 200): string { if (typeof value !== 'string' || value.length > limit) throw new Error('Enter valid text for ' + name + '.'); return value.trim(); }
function timestamp(value: unknown): string { if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) throw new Error('Invalid inspection timestamp.'); return value; }
const normalize = (value: string) => value.trim().toLowerCase();
export const inspectionKey = (data: QAPayload) => JSON.stringify([normalize(data.container), normalize(data.batch), data.locationKind, normalize(data.location)]);
export const inspectionRecords = (source: InspectionSource) => source.kind === 'qa_store' ? source.records : source.dataset.qaRecords;
export const currentInspectionDecision = (plan: InspectionPlan, itemId: string) => plan.decisions.filter(d => d.itemId === itemId).at(-1);
export function sourceFromStudy(study: Study): InspectionSource {
  const plan = latestPlan(study), dataset = currentDataset(study);
  if (plan.status !== 'recorded' || !dataset?.qaRecords.length) throw new Error('Use a recorded study with a current QA snapshot.');
  return { kind: 'study', origin: plan.data.expectedOrigin, studyId: study.id, title: plan.data.title, plan, dataset, model: currentPredictionRun(study) || null };
}
export function validateInspectionConfig(value: unknown): InspectionConfig {
  const r = object(value);
  if (!isQADate(r.asOf)) throw new Error('Choose a valid planning date.');
  if (!(r.maxAgeDays === null || typeof r.maxAgeDays === 'number' && Number.isInteger(r.maxAgeDays) && r.maxAgeDays > 0 && r.maxAgeDays <= 3650)) throw new Error('Use a positive observation-age threshold up to 3,650 days, or leave it disabled.');
  if (typeof r.capacity !== 'number' || !Number.isInteger(r.capacity) || r.capacity < 0 || r.capacity > 500) throw new Error('Capacity must be a whole number from zero to 500.');
  for (const key of ['requireStageCounts', 'requireWaterTemperature', 'requireEmergence']) if (typeof r[key] !== 'boolean') throw new Error('Choose explicit project-check settings.');
  return { asOf: r.asOf, maxAgeDays: r.maxAgeDays, capacity: r.capacity, requireStageCounts: r.requireStageCounts as boolean, requireWaterTemperature: r.requireWaterTemperature as boolean, requireEmergence: r.requireEmergence as boolean };
}
export function validateInspectionSource(value: unknown): InspectionSource {
  const r = object(value);
  if (typeof r.origin !== 'string' || !Object.hasOwn(ORIGINS, r.origin)) throw new Error('Choose the source origin.');
  const origin = r.origin as QAOrigin; let source: InspectionSource;
  if (r.kind === 'qa_store') {
    if (!Array.isArray(r.records)) throw new Error('QA source records are missing.');
    source = { kind: 'qa_store', origin, records: r.records.map(validateQARecord) };
  } else if (r.kind === 'study') {
    const p = object(r.plan);
    if (p.status !== 'recorded' || !Number.isInteger(p.number) || (p.number as number) < 1) throw new Error('A recorded study plan is required.');
    const plan: PlanRevision = { number: p.number as number, status: 'recorded', savedAt: timestamp(p.savedAt), reason: text(p.reason, 'plan reason', 4000), data: validatePlan(p.data) };
    const dataset = validateDataset(r.dataset, plan);
    if (plan.data.expectedOrigin !== origin) throw new Error('Study origin differs from the selected origin.');
    const model = r.model === null ? null : validatePredictionRun(r.model, plan, dataset);
    source = { kind: 'study', origin, studyId: text(r.studyId, 'study ID', 100), title: text(r.title, 'study title'), plan, dataset, model };
    if (!source.studyId) throw new Error('Study ID is missing.');
  } else throw new Error('Choose a QA store or recorded-study source.');
  const records = inspectionRecords(source);
  if (!records.length || records.length > 500 || new Set(records.map(r => r.id)).size !== records.length) throw new Error('Capture one to 500 unique QA records.');
  if (records.some(r => currentQA(r).data.origin !== origin)) throw new Error('Synthetic, bead-proxy and field observations cannot be pooled into one inspection plan.');
  return source;
}
export function visibleInspectionData(data: QAPayload, asOf: string): QAPayload {
  return { ...data,
    ...(data.assessedOn && data.assessedOn > asOf ? { outcome: 'not_assessed' as const, assessedOn: null, assessor: '', protocolReference: '' } : {}),
    ...(data.emergenceOn && data.emergenceOn > asOf ? { emergenceBasis: 'not_assessed' as const, emergenceOn: null, emergedAdults: null, emergenceMethod: '' } : {}),
  };
}
export function buildInspectionItems(source: InspectionSource, config: InspectionConfig) {
  const groups = new Map<string, QARecord[]>(), excluded: InspectionPlan['excluded'] = [];
  for (const record of inspectionRecords(source)) {
    const data = currentQA(record).data;
    if (data.observedOn > config.asOf) { excluded.push({ recordId: record.id, reason: 'Observation is later than the planning date.' }); continue; }
    const key = inspectionKey(data); groups.set(key, [...(groups.get(key) || []), record]);
  }
  const items: InspectionItem[] = [];
  for (const [key, records] of groups) {
    const latestOn = records.map(r => currentQA(r).data.observedOn).sort().at(-1)!;
    const latest = records.filter(r => currentQA(r).data.observedOn === latestOn).sort((a, b) => a.id.localeCompare(b.id));
    const data = latest.map(r => visibleInspectionData(currentQA(r).data, config.asOf)), first = data[0];
    const ageDays = Math.round((Date.parse(config.asOf) - Date.parse(latestOn)) / 86400000);
    const reasons: string[] = [], gaps = [...new Set(data.flatMap(d => [...qaGaps(d), ...(d.condition === 'unknown' ? ['Container condition unknown'] : [])]))];
    let priority: InspectionItem['priority'] = 'routine';
    const flag = (reason: string, firstReview = false) => { reasons.push(reason); if (firstReview) priority = 'review_first'; else if (priority === 'routine') priority = 'complete_record'; };
    const adverse = [...new Set(data.filter(d => d.condition !== 'unknown' && d.condition !== 'intact').map(d => CONDITIONS[d.condition]))];
    if (adverse.length) flag('Recorded container condition: ' + adverse.join(', ') + '. Inspect the condition and reconcile the record.', true);
    if (data.some(d => d.outcome === 'failed')) flag('An available QA assessment is labelled failed under its cited protocol. Review that assessment and follow-up needs.', true);
    if (data.some(d => d.outcome === 'needs_review')) flag('A QA assessor marked the observation as needing review.', true);
    if (latest.length > 1) flag('Multiple records share the latest calendar date. Reconcile their measurements before relying on a single current reading.', true);
    if (data.some(d => d.condition === 'unknown')) flag('Container condition is unknown. Confirm the required condition check.');
    if (data.some(d => d.setupOn === null)) flag('Setup date is unknown. Confirm the batch timing reference.');
    if (data.some(d => d.outcome === 'not_assessed')) flag('QA outcome is unavailable as of the planning date. Confirm when assessment is required under the local protocol.');
    if (config.maxAgeDays !== null && ageDays > config.maxAgeDays) flag('Latest observation is ' + ageDays + ' calendar days old, exceeding the chosen ' + config.maxAgeDays + '-day review threshold.');
    if (config.requireStageCounts && data.some(d => [d.larvae, d.pupae, d.pupalSkins, d.deadImmatures, d.deadAdults].some(v => v === null))) flag('The selected project checks require stage counts that are currently unknown.');
    if (config.requireWaterTemperature && data.some(d => d.temperatureBasis !== 'water')) flag('The selected project checks require container-water temperature; air/weather readings are not substitutes.');
    if (config.requireEmergence && data.some(d => d.emergenceBasis === 'not_assessed')) flag('The selected project checks require a separate emergence assessment, which is unavailable.');
    if (!reasons.length) reasons.push('No priority flag under these chosen rules. Review timing and completeness under the responsible programme protocol.');
    items.push({ id: key, key, container: first.container, batch: first.batch, location: first.location, locationKind: first.locationKind, latestOn, ageDays, priority, suggested: false,
      reasons, gaps, evidence: latest.map(record => { const r = currentQA(record); return { recordId: record.id, revision: r.number, observedOn: r.data.observedOn }; }), relatedRecordIds: records.map(r => r.id).sort() });
  }
  const rank = { review_first: 0, complete_record: 1, routine: 2 };
  items.sort((a, b) => rank[a.priority] - rank[b.priority] || a.latestOn.localeCompare(b.latestOn) || a.key.localeCompare(b.key));
  items.forEach((item, i) => { item.suggested = i < config.capacity; });
  return { items, excluded };
}
export function makeInspectionPlan(input: { id: string; title: string; createdAt: string; source: InspectionSource; config: InspectionConfig; replacesPlanId?: string | null }): InspectionPlan {
  const source = validateInspectionSource(input.source), config = validateInspectionConfig(input.config), title = text(input.title, 'plan title');
  if (!title) throw new Error('Give the inspection plan a title.');
  const id = text(input.id, 'plan ID', 100); if (!id) throw new Error('Plan ID is required.');
  return { schemaVersion: 1, id, title, createdAt: timestamp(input.createdAt), sequence: 1, algorithmVersion: INSPECTION_VERSION, softwareVersion: INSPECTION_SOFTWARE,
    replacesPlanId: input.replacesPlanId || null, config, source, ...buildInspectionItems(source, config), decisions: [] };
}
export function validateInspectionDecision(value: unknown, plan: InspectionPlan): InspectionDecision {
  const r = object(value);
  if (typeof r.action !== 'string' || !Object.hasOwn(INSPECTION_DECISIONS, r.action)) throw new Error('Choose accept, defer or dismiss.');
  const itemId = text(r.itemId, 'item reference', 1000); if (!plan.items.some(item => item.id === itemId)) throw new Error('This item does not belong to the saved plan.');
  const reviewer = text(r.reviewer, 'reviewer label'), reason = text(r.reason, 'decision reason', 2000), assignee = text(r.assignee, 'assignee');
  if (!reviewer || !reason) throw new Error('Add a reviewer label and a reason for every decision.');
  if (r.dueOn !== null && (!isQADate(r.dueOn) || r.dueOn < plan.config.asOf)) throw new Error('Use a valid task/review date on or after the planning date.');
  if (r.action === 'accept' && (!assignee || !r.dueOn)) throw new Error('An accepted inspection task needs an assignee and due date.');
  if (r.action === 'defer' && !r.dueOn) throw new Error('A deferral needs a next-review date.');
  if (r.action === 'dismiss' && (assignee || r.dueOn !== null)) throw new Error('A dismissed suggestion must not retain an assignment or due date.');
  if (!Number.isInteger(r.number) || (r.number as number) < 1) throw new Error('Invalid decision sequence.');
  const id = text(r.id, 'decision ID', 100); if (!id) throw new Error('Decision ID is required.');
  return { id, number: r.number as number, savedAt: timestamp(r.savedAt), itemId, action: r.action as InspectionDecision['action'], reviewer, reason, assignee, dueOn: r.dueOn as string | null };
}
export function appendInspectionDecision(plan: InspectionPlan, input: Omit<InspectionDecision, 'number'>): InspectionPlan {
  if (plan.decisions.length >= 1000) throw new Error('This prototype retains up to 1,000 decision entries per plan.');
  if (plan.decisions.some(d => d.id === input.id)) throw new Error('This decision already exists.');
  const decision = validateInspectionDecision({ ...input, number: plan.decisions.length + 1 }, plan);
  return { ...plan, sequence: plan.sequence + 1, decisions: [...plan.decisions, decision] };
}
export function validateInspectionPlan(value: unknown): InspectionPlan {
  const r = object(value);
  if (r.schemaVersion !== 1 || r.algorithmVersion !== INSPECTION_VERSION || !Array.isArray(r.decisions) || r.sequence !== r.decisions.length + 1) throw new Error('Unsupported saved inspection plan.');
  const plan = makeInspectionPlan({ id: text(r.id, 'plan ID', 100), title: text(r.title, 'plan title'), createdAt: timestamp(r.createdAt), source: r.source as InspectionSource, config: r.config as InspectionConfig, replacesPlanId: r.replacesPlanId === null ? null : text(r.replacesPlanId, 'earlier plan ID', 100) });
  if (JSON.stringify(plan.items) !== JSON.stringify(r.items) || JSON.stringify(plan.excluded) !== JSON.stringify(r.excluded)) throw new Error('Saved planning reasons differ from the pinned evidence/rules.');
  plan.softwareVersion = text(r.softwareVersion, 'software version', 100);
  const ids = new Set<string>();
  plan.decisions = r.decisions.map((raw, i) => { const d = validateInspectionDecision(raw, plan); if (d.number !== i + 1 || ids.has(d.id)) throw new Error('Invalid decision history.'); ids.add(d.id); return d; });
  plan.sequence = r.sequence as number; return plan;
}
export function inspectionSourceChanges(source: InspectionSource, qaRecords: QARecord[], studies: Study[]): string[] {
  if (source.kind === 'study') {
    const study = studies.find(s => s.id === source.studyId);
    if (!study) return ['The source study is unavailable.'];
    const dataset = currentDataset(study), changes: string[] = [];
    if (latestPlan(study).number !== source.plan.number) changes.push('The study plan version changed.');
    if (dataset?.id !== source.dataset.id) changes.push('The study dataset changed or is no longer current.');
    if ((currentPredictionRun(study)?.id ?? null) !== (source.model?.id ?? null)) changes.push('The supporting model run changed.');
    if (!source.dataset.generatorVersion && source.dataset.qaRecords.some(pinned => { const current = qaRecords.find(r => r.id === pinned.id); return !current || currentQA(current).number !== currentQA(pinned).number; })) changes.push('QA sources behind the study snapshot changed or are unavailable. Recapture that study dataset before regenerating this plan.');
    return changes;
  }
  const current = qaRecords.filter(r => currentQA(r).data.origin === source.origin), changes: string[] = [];
  if (current.length !== source.records.length || current.some(r => !source.records.some(p => p.id === r.id))) changes.push('Matching-origin source records were added or removed.');
  if (source.records.some(p => { const r = current.find(r => r.id === p.id); return !r || currentQA(r).number !== currentQA(p).number; })) changes.push('A captured QA record was revised or is unavailable.');
  return changes;
}
export function inspectionCsv(plan: InspectionPlan): string {
  const rows: (string | number | null)[][] = [['plan_id', 'algorithm', 'origin', 'planning_date', 'container', 'batch', 'location', 'priority', 'suggested', 'latest_observed', 'source_revisions', 'reasons', 'gaps', 'decision', 'reviewer', 'assignee', 'task_or_review_date', 'decision_reason']];
  for (const item of plan.items) { const d = currentInspectionDecision(plan, item.id); rows.push([plan.id, plan.algorithmVersion, plan.source.origin, plan.config.asOf, item.container, item.batch, item.location, item.priority, item.suggested ? 'yes' : 'no', item.latestOn, item.evidence.map(e => e.recordId + '@' + e.revision).join('; '), item.reasons.join(' '), item.gaps.join('; '), d?.action || 'pending', d?.reviewer || '', d?.assignee || '', d?.dueOn || null, d?.reason || '']); }
  return rows.map(row => row.map(csvCell).join(',')).join('\r\n');
}
export function inspectionReport(plan: InspectionPlan): string {
  const clean = (value: string) => value.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const lines = ['# ' + clean(plan.title), '', 'Plan ' + plan.id + '; created ' + plan.createdAt + '; planning date ' + plan.config.asOf + '.', 'Rules ' + plan.algorithmVersion + '; software ' + plan.softwareVersion + '; origin ' + ORIGINS[plan.source.origin] + '.', '', '## Source and rules', '', plan.source.kind === 'study' ? 'Study ' + plan.source.studyId + '; plan ' + plan.source.plan.number + '; dataset ' + plan.source.dataset.id + '; model ' + (plan.source.model?.id ?? 'none') + '.' : 'Pinned QA-store snapshot: ' + plan.source.records.length + ' records.', '', JSON.stringify(plan.config, null, 2), '', ...INSPECTION_METHOD.map(s => '- ' + s), '', 'These are illustrative inspection/data-review rules, not a release protocol, field-effectiveness result or prescribed health intervention.', '', '## Queue and human decisions', ''];
  for (const item of plan.items) { const d = currentInspectionDecision(plan, item.id); lines.push('### ' + clean(item.container + ' / ' + item.batch + ' / ' + item.location), '', PRIORITIES[item.priority] + '; suggested within capacity: ' + item.suggested + '; observed ' + item.latestOn + '.', 'Evidence: ' + item.evidence.map(e => clean(e.recordId) + ' revision ' + e.revision).join('; ') + '.', ...item.reasons.map(r => '- ' + clean(r)), 'Supporting gaps (not all necessarily protocol-required): ' + clean(item.gaps.join('; ') || 'None recorded') + '.', d ? 'Decision: ' + INSPECTION_DECISIONS[d.action] + '; reviewer ' + clean(d.reviewer) + '; assignee ' + clean(d.assignee || 'none') + '; date ' + (d.dueOn || 'none') + '; reason ' + clean(d.reason) + '.' : 'Decision: pending human review.', ''); }
  if (plan.source.kind === 'study' && plan.source.model) { const m = plan.source.model; lines.push('## Historical model context', '', 'Run ' + m.id + '; ' + m.status + '; algorithm ' + m.algorithmVersion + '. Not used to rank this queue.', m.metrics ? 'Held-out model found ' + m.metrics.model.tp + '/' + (m.metrics.model.tp + m.metrics.model.fn) + ' failed groups; model accuracy ' + m.metrics.model.accuracy + '; constant-baseline accuracy ' + m.metrics.prevalence.accuracy + '.' : 'Insufficient data; no fitted performance.', ''); }
  lines.push('## Audit and limits', '', 'Excluded future-observation rows: ' + plan.excluded.length + '. Decision-history entries: ' + plan.decisions.length + '.', 'Export JSON with this report for full input revisions, source/model context, rules, queue and all decision versions. Reviewer/assignee labels are self-entered; no notification or physical action is sent. Browser dates and records are not authenticated field evidence. Regenerate after source changes; older decisions remain attached to the earlier snapshot.', '');
  return lines.join('\n');
}
export function inspectionAudit(plan: InspectionPlan): string { return JSON.stringify({ schema: 'inspection-plan-audit-v1', exportedAt: new Date().toISOString(), method: INSPECTION_METHOD, note: 'No image bytes, inferred infection result, release authorization or causal dengue claim.', plan }, null, 2); }
