import { useState } from 'react';
import type { FormEvent } from 'react';
import { currentReference, PHOTO_EVIDENCE } from '../lib/photo-reference.ts';
import type { PhotoReferenceInput } from '../lib/photo-reference.ts';
import type { PhotoRecord } from '../lib/photo-store.ts';

export default function PhotoReferenceEditor({ record, busy, onSave }: {
  record: PhotoRecord; busy: boolean; onSave: (input: PhotoReferenceInput) => Promise<void>;
}) {
  const previous = currentReference(record);
  const [evidence, setEvidence] = useState(previous?.evidence || '');
  const [count, setCount] = useState(previous?.count == null ? '' : String(previous.count));
  const [unitRef, setUnitRef] = useState(previous?.unitRef || record.container);
  const [method, setMethod] = useState(previous?.method || ''), [reviewer, setReviewer] = useState(previous?.reviewer || '');
  const [independent, setIndependent] = useState(previous?.independent ?? false);
  const [blinding, setBlinding] = useState<PhotoReferenceInput['blinding']>(previous?.blinding || 'unknown');
  const [excluded, setExcluded] = useState(previous?.excluded ?? false), [reason, setReason] = useState(previous?.exclusionReason || '');
  const [amendment, setAmendment] = useState(''), [error, setError] = useState('');
  async function save(event: FormEvent) {
    event.preventDefault(); setError('');
    try {
      if (!Object.hasOwn(PHOTO_EVIDENCE, evidence)) throw new Error('Declare the image evidence type.');
      if (count && !/^\d+$/.test(count)) throw new Error('Reference count must be a whole number or blank for unknown.');
      await onSave({ evidence: evidence as PhotoReferenceInput['evidence'], count: count === '' ? null : Number(count), unitRef, method, reviewer, independent, blinding, excluded, exclusionReason: reason, amendmentReason: amendment });
    } catch (err) { setError(err instanceof Error ? err.message : 'The reference could not be saved.'); }
  }
  return <section className="panel photo-reference-panel" aria-label="Separate reference count">
    <div className="panel-title"><div><h2>Separate reference count</h2><p>Reference declarations and human corrections keep different histories.</p></div></div>
    {record.provenance === 'generated_proxy' ? <div className="settings-content"><p className="helper">This generated example keeps its construction reference. Prepared-photo validation needs an uploaded image and a separately obtained count.</p></div> : <details open={!previous} className="reference-details"><summary>{previous ? `Reference ${previous.count ?? 'unknown'} · ${previous.reviewer || 'counter not recorded'} · ${record.references?.length} declaration(s)` : 'Record a separate reference or an exclusion'}</summary>
      <form className="reference-form" onSubmit={save}><p className="helper">For a prospective comparison, obtain the reference without seeing a computed estimate and record it before running the counter. These are your declarations; the app cannot verify blinding or where the photo came from.</p>
        <fieldset disabled={busy}><legend>Image and reference</legend><div className="reference-grid">
          <div><label htmlFor="reference-evidence">Image evidence declaration</label><select id="reference-evidence" value={evidence} onChange={e => setEvidence(e.target.value)} required><option value="">Choose evidence type</option>{Object.entries(PHOTO_EVIDENCE).filter(([key]) => record.kind === 'larvae' ? key === 'biological_photo' : key !== 'biological_photo').map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
          <div><label htmlFor="reference-unit">Physical setup / container and batch reference</label><input id="reference-unit" value={unitRef} onChange={e => setUnitRef(e.target.value)} maxLength={200} required/></div>
          <div><label htmlFor="reference-count">Reference count</label><input id="reference-count" value={count} onChange={e => setCount(e.target.value)} inputMode="numeric" placeholder="Blank means unknown; 0 is observed zero"/></div>
          <div><label htmlFor="reference-reviewer">Reference counter / reviewer</label><input id="reference-reviewer" value={reviewer} onChange={e => setReviewer(e.target.value)} maxLength={200}/></div>
          <div className="reference-wide"><label htmlFor="reference-method">How the reference was obtained</label><input id="reference-method" value={method} onChange={e => setMethod(e.target.value)} maxLength={1000} placeholder="For example: manual visible-object count on the original photo"/></div>
          <div><label htmlFor="reference-blinding">Reference counter did not see the computed estimate</label><select id="reference-blinding" value={blinding} onChange={e => setBlinding(e.target.value as PhotoReferenceInput['blinding'])}><option value="unknown">Unknown / not established</option><option value="yes">Yes — operator declared</option><option value="no">No</option></select></div>
          <label className="reference-check"><input type="checkbox" checked={independent} onChange={e => setIndependent(e.target.checked)}/>Count obtained separately from the computed estimate</label>
        </div></fieldset>
        <fieldset disabled={busy}><legend>Inclusion and changes</legend><label className="reference-check"><input type="checkbox" checked={excluded} onChange={e => setExcluded(e.target.checked)}/>Exclude this photo from error metrics</label>
          <label htmlFor="reference-exclusion">Exclusion reason {excluded && '(required)'}</label><input id="reference-exclusion" value={reason} onChange={e => setReason(e.target.value)} maxLength={1000} required={excluded}/>
          {previous && <><label htmlFor="reference-amendment">Reason for reference amendment</label><input id="reference-amendment" value={amendment} onChange={e => setAmendment(e.target.value)} maxLength={1000} required/></>}
        </fieldset>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button secondary" type="submit" disabled={busy}>{previous ? 'Save reference amendment' : 'Save separate reference'}</button>
        {previous?.recordedAfterAnalysis && <p className="helper">This declaration was recorded after a computed result existed. Earlier reference declarations remain in the audit JSON.</p>}
      </form>
    </details>}
  </section>;
}
