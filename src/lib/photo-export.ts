import { csvCell, locationName } from './dashboard.ts';
import { currentReview, photoStatus } from './photo-store.ts';
import type { PhotoRecord } from './photo-store.ts';
export function photoCsv(records: PhotoRecord[]): string {
  const rows: (string|number|null)[][]=[['provenance','observation_id','image_name','sha256','container','location','location_provenance','captured_on','image_kind','method','actual_execution_source','original_computed_estimate','reviewed_count','status','analysis_id','review_analysis_id','reviewer','reviewed_at','engine','runtime','reference_count']];
  for(const r of records) {
    const a=r.analyses.at(-1),review=currentReview(r);
    rows.push([r.provenance,r.id,r.name,r.sha256,r.container,locationName(r.locationId),r.locationProvenance,r.capturedOn,r.kind,a?.model??'',a?.source??'no_ai_request',a?.count??null,review?.count??null,photoStatus(r),a?.id??'',review?.analysisId??'',review?.reviewer??'',review?.createdAt??'',a?(a.engine??'firebase'):'',a?.execution??'',r.referenceCount??null]);
  }
  return rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
}
export function photoAudit(record: PhotoRecord): string {
  return JSON.stringify({schemaVersion:2,exportedAt:new Date().toISOString(),note:'Metadata, original computed analyses and human review history. Image bytes are not included. Generated proxies are labelled; assigned locations are fictional. These records do not establish dengue efficacy.',record},null,2);
}
