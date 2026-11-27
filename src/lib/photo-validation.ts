import { csvCell } from './dashboard.ts';
import { countSummary, STUDY_VERSION } from './studies.ts';
import type { CountPair } from './studies.ts';
import type { PhotoRecord } from './photo-store.ts';
import { currentReference, PHOTO_EVIDENCE } from './photo-reference.ts';

export const PHOTO_VALIDATION_VERSION = 'photo-validation-v1';
export type PhotoValidationScope = 'prepared_beads' | 'synthetic_test';
const norm = (text: string) => text.trim().toLowerCase();

export function photoValidation(records: PhotoRecord[], scope: PhotoValidationScope = 'prepared_beads') {
  const ordered = records.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  const generatedHashes = new Set(records.filter(record => record.provenance === 'generated_proxy').map(record => record.sha256));
  const retained = new Map<string, string>();
  const rows = ordered.map(record => {
    const ref = currentReference(record), analysis = record.analyses.at(-1);
    const knownGeneratedCopy = record.provenance === 'user_upload' && generatedHashes.has(record.sha256);
    const selected = record.provenance === 'user_upload' && record.kind === 'bead_proxy' && ref?.evidence === scope && ref.imageSha256 === record.sha256 && !(scope === 'prepared_beads' && knownGeneratedCopy);
    const duplicateOf = selected && !ref.excluded ? retained.get(record.sha256) : undefined;
    if (selected && !ref.excluded && !duplicateOf) retained.set(record.sha256, record.id);
    const excluded = !!ref?.excluded || !!duplicateOf;
    const exclusionReason = duplicateOf ? 'Duplicate image bytes; retained earlier active record ' + duplicateOf : ref?.exclusionReason || '';
    const estimate = analysis?.imageSha256 === record.sha256 && analysis.countable && Number.isSafeInteger(analysis.count) && analysis.count! >= 0 && analysis.count! <= 100000 ? analysis.count : null;
    const reference = ref?.imageSha256 === record.sha256 ? ref.count : null;
    const pair: CountPair = {
      id: record.id, observationRef: record.id + ':' + record.sha256, unitRef: ref?.unitRef || record.container,
      observedOn: record.capturedOn, origin: 'bead_proxy', estimate, reference,
      method: analysis?.model || '', referenceMethod: ref?.method || '', referenceReviewer: ref?.reviewer || '',
      referenceIndependent: ref?.independent ?? false, blinding: ref?.blinding || 'unknown', excluded, exclusionReason,
    };
    const methodKey = analysis ? JSON.stringify([analysis.engine || 'firebase', analysis.model, analysis.promptVersion, analysis.counterEvidence?.options || null]) : null;
    const status = record.provenance === 'generated_proxy' ? 'generated_proxy_not_validation'
      : scope === 'prepared_beads' && knownGeneratedCopy ? 'known_generated_bytes_not_prepared_photo'
      : !ref ? 'awaiting_reference_declaration' : !selected ? 'outside_selected_scope'
      : excluded ? 'excluded' : estimate === null || reference === null ? 'missing_pair' : 'paired';
    return { recordId: record.id, imageSha256: record.sha256, name: record.name, provenance: record.provenance, selected, status,
      pair, referenceId: ref?.id || null, analysisId: analysis?.id || null, actualRuntime: analysis?.execution || analysis?.source || 'not_run',
      evidence: ref?.evidence || (record.provenance === 'generated_proxy' ? 'generated_proxy' : 'unclassified'),
      duplicateOf: duplicateOf || null, knownGeneratedCopy, recordedAfterAnalysis: ref?.recordedAfterAnalysis ?? false, analysisRuns: record.analyses.length, methodKey };
  });
  const selected = rows.filter(row => row.selected), summary = countSummary(selected.map(row => row.pair));
  const groups = new Map<string, typeof selected>();
  for (const row of selected) if (row.methodKey) groups.set(row.methodKey, [...(groups.get(row.methodKey) || []), row]);
  const methods = [...groups].map(([key, values], index) => ({ id: 'method-' + (index + 1), key, label: values[0].pair.method, summary: countSummary(values.map(row => row.pair)) }));
  // Different methods or ROI/threshold settings are not pooled into one error claim.
  if (methods.length > 1) { summary.mae = null; summary.bias = null; summary.maximumError = null; summary.unitBalancedMae = null; }
  const active = selected.filter(row => !row.pair.excluded), checks: string[] = [];
  if (!summary.validPairs) checks.push('No complete paired counts in this scope. Photo-error measurements remain pending.');
  if (summary.missingPairs) checks.push(summary.missingPairs + ' included photos have an unknown computed or reference count; unknown is not zero.');
  const unclassified = rows.filter(row => row.status === 'awaiting_reference_declaration').length;
  if (unclassified) checks.push(unclassified + ' uploaded images still need an evidence/reference declaration and are outside these metrics.');
  if (active.some(row => !row.pair.referenceIndependent)) checks.push('Reference independence is not confirmed for every included photo. Human corrections are not automatically independent references.');
  if (active.some(row => row.pair.blinding !== 'yes')) checks.push('Reference-counter blinding is not confirmed for every included photo.');
  if (active.some(row => row.recordedAfterAnalysis)) checks.push('Some reference declarations were recorded after a computed estimate existed. This does not establish prospective or blinded collection.');
  if (active.some(row => row.analysisRuns > 1)) checks.push('Some photos have repeated computed runs. The latest run is used, not the best result; tuning needs a separate untouched evaluation set.');
  if (new Set(active.map(row => norm(row.pair.unitRef))).size < active.length) checks.push('Repeated setup/container references exist. Unit-balanced MAE is also reported; repeated photos are not independent physical units.');
  if (rows.some(row => row.duplicateOf)) checks.push('Duplicate image bytes are excluded after the earliest active record in this scope; all records remain in the inventory and audit.');
  if (scope === 'prepared_beads' && rows.some(row => row.knownGeneratedCopy)) checks.push('Uploaded bytes matching a saved generated example cannot count as prepared-photo validation. This check cannot identify every synthetic upload.');
  if (methods.length > 1) checks.push('Multiple methods or counting settings exist. Pooled errors are hidden; inspect each method/settings group separately.');
  checks.push(scope === 'synthetic_test' ? 'Uploaded test images are diagnostic fixtures, not real-photo validation.' : 'Prepared-photo provenance, reference independence and blinding are operator declarations, not independent verification.');
  checks.push('Descriptive count comparison only; no field-accuracy certificate, biological detection, infection result or dengue outcome is established.');
  return { schema: PHOTO_VALIDATION_VERSION, algorithmVersion: STUDY_VERSION, exportedAt: new Date().toISOString(), scope, scopeLabel: PHOTO_EVIDENCE[scope],
    selection: 'All saved records are inventoried. Metrics use the chosen declared scope and latest original computed result per image; human corrections never replace that estimate.',
    summary, methods, checks, rows, inventory: { total: rows.length, generated: rows.filter(row => row.provenance === 'generated_proxy').length, awaitingReference: unclassified },
    metrics: { error: 'computed estimate - separately entered reference', mae: 'mean absolute error over complete non-excluded pairs', unitBalancedMae: 'mean of within-unit mean absolute errors', missing: 'unknown stays null', intervals: 'No confidence interval or p-value is computed' } };
}

export function photoValidationCsv(records: PhotoRecord[], scope: PhotoValidationScope): string {
  const report = photoValidation(records, scope);
  const header = ['record_id', 'image_sha256', 'image_name', 'provenance', 'declared_evidence', 'selected_scope', 'status', 'unit_ref', 'observed_on', 'analysis_id', 'reference_id', 'original_estimate', 'separate_reference_count', 'signed_error', 'excluded', 'exclusion_reason', 'duplicate_of', 'reference_method', 'reference_reviewer', 'independence_declared', 'blinding_declared', 'reference_recorded_after_analysis', 'runtime', 'method_settings_key'];
  return [header, ...report.rows.map(row => [row.recordId, row.imageSha256, row.name, row.provenance, row.evidence, row.selected, row.status, row.pair.unitRef, row.pair.observedOn, row.analysisId, row.referenceId, row.pair.estimate, row.pair.reference, row.selected && !row.pair.excluded && row.pair.estimate !== null && row.pair.reference !== null ? row.pair.estimate - row.pair.reference : null, row.pair.excluded, row.pair.exclusionReason, row.duplicateOf, row.pair.referenceMethod, row.pair.referenceReviewer, row.pair.referenceIndependent, row.pair.blinding, row.recordedAfterAnalysis, row.actualRuntime, row.methodKey])].map(row => row.map(value => csvCell(value === null ? null : typeof value === 'boolean' ? String(value) : value)).join(',')).join('\r\n');
}
export function photoValidationAudit(records: PhotoRecord[], scope: PhotoValidationScope): string {
  return JSON.stringify({ ...photoValidation(records, scope), note: 'Frozen metadata and complete analysis/reference/review histories. No original image bytes are included.', records }, null, 2);
}
