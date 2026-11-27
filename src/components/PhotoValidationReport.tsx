import { useState } from 'react';
import type { PhotoRecord } from '../lib/photo-store.ts';
import { photoValidation, photoValidationAudit, photoValidationCsv } from '../lib/photo-validation.ts';
import type { PhotoValidationScope } from '../lib/photo-validation.ts';
import { PHOTO_EVIDENCE } from '../lib/photo-reference.ts';

const number = (value: number | null) => value === null ? 'Not available' : Number(value.toFixed(3)).toString();
function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type })), link = document.createElement('a');
  link.href = url; link.download = name; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function PhotoValidationReport({ records, busy }: { records: PhotoRecord[]; busy: boolean }) {
  const [scope, setScope] = useState<PhotoValidationScope>('prepared_beads');
  const report = photoValidation(records, scope), summary = report.summary;
  return <section className="panel photo-validation-panel" aria-label="Photo validation report">
    <div className="panel-title"><div><h2>Photo validation report</h2><p>All saved images are inventoried. Image-list filters do not select the validation sample.</p></div></div>
    <div className="validation-content"><label htmlFor="validation-scope">Comparison scope</label><select id="validation-scope" value={scope} onChange={e => setScope(e.target.value as PhotoValidationScope)}>{(['prepared_beads', 'synthetic_test'] as const).map(key => <option key={key} value={key}>{PHOTO_EVIDENCE[key]}</option>)}</select>
      <p className="helper">{report.inventory.total} saved images · {report.inventory.generated} generated examples outside validation · {report.inventory.awaitingReference} awaiting reference declarations.</p>
      <dl className="validation-totals">{[['Selected photos', summary.observations], ['Complete pairs', summary.validPairs], ['Missing pairs', summary.missingPairs], ['Excluded photos', summary.excluded], ['Paired physical units', summary.units]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <p className="validation-state" role="status">{summary.validPairs ? 'Descriptive comparison available — review the checks below' : 'Photo-error measurements pending'}</p>
      <p className="helper">Errors use the original computed estimate and the separately entered reference. Human corrections are not substituted. Different methods or counting settings are shown separately.</p>
      {report.methods.length > 0 && <div className="validation-table-wrap"><table><caption>Descriptive errors in objects, by method and counting settings</caption><thead><tr><th>Method group</th><th>Pairs</th><th>MAE</th><th>Signed bias</th><th>Maximum error</th><th>Unit-balanced MAE</th></tr></thead><tbody>{report.methods.map(method => <tr key={method.id}><td>{method.id}: {method.label}</td><td>{method.summary.validPairs}</td><td>{number(method.summary.mae)}</td><td>{number(method.summary.bias)}</td><td>{number(method.summary.maximumError)}</td><td>{number(method.summary.unitBalancedMae)}</td></tr>)}</tbody></table></div>}
      <ul className="validation-checks">{report.checks.map(check => <li key={check}>{check}</li>)}</ul>
      <div className="button-row"><button className="button secondary" disabled={busy} onClick={() => download('photo-validation.csv', photoValidationCsv(records, scope), 'text/csv;charset=utf-8')}>Export validation CSV</button><button className="button secondary" disabled={busy} onClick={() => download('photo-validation-audit.json', photoValidationAudit(records, scope), 'application/json')}>Export validation audit</button></div>
      <details className="validation-inventory"><summary>Image inventory and inclusion reasons</summary><div className="validation-table-wrap"><table><thead><tr><th>Image</th><th>Evidence</th><th>Status</th><th>Computed</th><th>Reference</th><th>Reason</th></tr></thead><tbody>{report.rows.map(row => <tr key={row.recordId}><td>{row.name}</td><td>{row.evidence}</td><td>{row.status.replaceAll('_', ' ')}</td><td>{row.pair.estimate ?? 'Unknown'}</td><td>{row.pair.reference ?? 'Unknown'}</td><td>{row.pair.exclusionReason || '—'}</td></tr>)}</tbody></table></div></details>
      <p className="helper">Public-health trial: use Container QA to enter actual observations with their own origin, dates, stage context and separate outcomes. Photo errors do not become biological stage counts or inspection decisions automatically.</p>
    </div>
  </section>;
}
