import type { PhotoRecord } from './photo-store.ts';

export const PHOTO_EVIDENCE = {
  prepared_beads: 'Prepared bead photo — operator declared',
  synthetic_test: 'Uploaded synthetic / test image',
  biological_photo: 'Biological photo — manual observations only',
} as const;
export interface PhotoReferenceInput {
  evidence: keyof typeof PHOTO_EVIDENCE;
  unitRef: string;
  count: number | null;
  method: string;
  reviewer: string;
  independent: boolean;
  blinding: 'yes' | 'no' | 'unknown';
  excluded: boolean;
  exclusionReason: string;
  amendmentReason: string;
}
export interface PhotoReference extends PhotoReferenceInput {
  id: string;
  createdAt: string;
  imageSha256: string;
  recordedAfterAnalysis: boolean;
}
export const currentReference = (record: PhotoRecord) => record.references?.at(-1);

export function makePhotoReference(record: PhotoRecord, input: PhotoReferenceInput, id: string, now: string): PhotoReference {
  if (record.provenance !== 'user_upload') throw new Error('Generated examples retain their construction reference; they cannot become prepared-photo evidence.');
  if (!Object.hasOwn(PHOTO_EVIDENCE, input.evidence)) throw new Error('Declare the image evidence type.');
  if ((record.kind === 'larvae') !== (input.evidence === 'biological_photo')) throw new Error('The evidence type must match the saved image kind. Biological images are manual-only for this counter.');
  if (input.count !== null && (!Number.isSafeInteger(input.count) || input.count < 0 || input.count > 100000)) throw new Error('Reference count must be a whole number from 0 to 100,000 or blank for unknown.');
  if (typeof input.independent !== 'boolean' || typeof input.excluded !== 'boolean' || !['yes', 'no', 'unknown'].includes(input.blinding)) throw new Error('Declare independence, blinding and exclusion explicitly.');
  const clean = { ...input };
  for (const key of ['unitRef', 'method', 'reviewer', 'exclusionReason', 'amendmentReason'] as const) {
    if (typeof input[key] !== 'string' || input[key].length > (key === 'unitRef' || key === 'reviewer' ? 200 : 1000)) throw new Error('Keep reference labels and notes within the displayed limits.');
    clean[key] = input[key].trim();
  }
  if (!clean.unitRef) throw new Error('Add the physical setup / container and batch reference used to group repeated photos.');
  if (clean.count !== null && (!clean.method || !clean.reviewer)) throw new Error('A reference count needs its method and counter/reviewer label.');
  if (clean.independent && clean.count === null) throw new Error('An independent reference declaration needs a count.');
  if (clean.excluded && !clean.exclusionReason) throw new Error('An excluded photo needs a reason.');
  if (!clean.excluded) clean.exclusionReason = '';
  if (currentReference(record) && !clean.amendmentReason) throw new Error('Explain this reference amendment; earlier declarations are retained.');
  if (!id || !Number.isFinite(Date.parse(now))) throw new Error('A dated reference ID is required.');
  return { ...clean, amendmentReason: clean.amendmentReason || 'Initial reference declaration', id, createdAt: now, imageSha256: record.sha256, recordedAfterAnalysis: record.analyses.length > 0 };
}
