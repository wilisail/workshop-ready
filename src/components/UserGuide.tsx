import type { View } from '../lib/dashboard.ts';

export default function UserGuide({ onOpen }: { onOpen: (view: View) => void }) {
  const open = (view: View, label: string) => <a className="button secondary" href={'#' + view} onClick={() => onOpen(view)}>{label}</a>;
  return <div className="user-guide">
    <section className="panel guide-intro" aria-labelledby="guide-start">
      <h2 id="guide-start">Start with a small demonstration</h2>
      <p>You need this app link and a supported browser. The first visit needs internet. No account, Firebase setup, API key or model download is needed for the small bead counter.</p>
      <dl className="guide-goals">
        <div><dt>Network</dt><dd>See whether a count ran on the hosted service or on this device.</dd></div>
        <div><dt>Public health</dt><dd>Keep observations, evidence and human decisions traceable.</dd></div>
        <div><dt>Local fallback</dt><dd>Keep counting and reviewing without internet after preparation.</dd></div>
      </dl>
      <p><strong>What you are trying:</strong> a small computer-vision counter for bead proxies. It is not a local language model or a validated larvae detector. Charts and built-in examples use fictional data. Your laptop and real-photo/field checks remain separate.</p>
    </section>

    <ol className="guide-steps" aria-label="Connected and offline walkthrough">
      <li><section className="panel guide-step" aria-labelledby="guide-connected">
        <span className="guide-step-label">1 · WHILE CONNECTED</span>
        <h2 id="guide-connected">Choose how counting should run</h2>
        <p>In <strong>Data &amp; settings</strong>, choose <strong>Small bead counter · no Firebase</strong> and <strong>Prefer Vercel, allow browser fallback</strong>. These are the defaults in a new browser; check them if you have used the app before.</p>
        <p>Click <strong>Check bead service</strong>. Its result checks the hosted counter at that moment and sends no photo. <strong>Browser online</strong> is only a connection hint; it does not prove that the service works.</p>
        {open('settings', 'Open processing settings')}
      </section></li>
      <li><section className="panel guide-step" aria-labelledby="guide-count">
        <span className="guide-step-label">2 · TRY, CHECK, SAVE</span>
        <h2 id="guide-count">Count an example and record your review</h2>
        <p>Open <strong>Your image tests</strong>, click <strong>Load eight-bead example</strong>, then <strong>Count this image</strong>. Loading the example alone does not compute a count. <strong>Demo examples</strong> is a different tab with predefined estimates.</p>
        <p>Read the computed estimate, marked regions and actual source. <strong>Counted on Vercel</strong> means hosted processing. <strong>Counted in this browser</strong> means the small worker on this device. A failed hosted request can use that worker when your preference permits it.</p>
        <p>Check the image yourself. Enter <strong>Reviewed count</strong> and <strong>Reviewer label</strong>, then <strong>Save human review</strong>. Add a reason for a correction or rejection. The original computed estimate stays in history. Export the image records or audit to keep a copy.</p>
        {open('review', 'Open image tests')}
      </section></li>
      <li><section className="panel guide-step" aria-labelledby="guide-offline">
        <span className="guide-step-label">3 · PREPARE BEFORE DISCONNECTING</span>
        <h2 id="guide-offline">Reopen and work without internet</h2>
        <ol>
          <li>While connected, open Data &amp; settings and click <strong>Prepare offline use</strong>. Wait for <strong>App assets prepared on this browser</strong>. If a different version is prepared, refresh while connected and check again.</li>
          <li>Keep the same browser and profile. Disconnect, then reopen this app link. A browser that has never prepared the app cannot make its first visit offline.</li>
          <li>Open Your image tests and click <strong>Run a new count</strong> on the saved example, or load an example and count it. Check that the new result says <strong>Counted in this browser</strong>. An older saved result alone does not show that an offline count ran.</li>
          <li>Save a human review and export locally. When connected again, run a new count with the cloud-first preference and inspect its actual source. Records stay on this browser; reconnecting does not sync them to a shared database.</li>
        </ol>
        <p><strong>Vercel only</strong> cannot count while disconnected. <strong>This device only — no image upload</strong> uses the local worker. The offline counter needs no downloaded language model. Exported audits do not include original image bytes; keep original photos separately. Export files are not an automatic restore/import system.</p>
        {open('settings', 'Open offline preparation')}
      </section></li>
      <li><section className="panel guide-step" aria-labelledby="guide-photos">
        <span className="guide-step-label">4 · WHEN YOUR PHOTOS ARE AVAILABLE</span>
        <h2 id="guide-photos">Compare prepared bead photos with separate counts</h2>
        <p>Use <strong>Add an image</strong> to save a prepared photo. Under <strong>Separate reference count</strong>, declare the evidence type, physical setup/unit, separately obtained count, counting method and counter label. Record independence and whether the counter had seen an estimate honestly. Save the reference before computing when possible; later declarations are flagged.</p>
        <p><strong>Photo validation report</strong> compares original computed counts with references. Human corrections do not replace either. Read missing pairs, exclusions, duplicate images, repeated units and method/settings groups before the error numbers. Generated examples remain outside prepared-photo measurements; uploaded synthetic images have their own scope.</p>
        <p>Until qualifying photos and references exist, expect <strong>Photo-error measurements pending</strong>. Biological images can be saved for manual review; the small counter does not automatically count real larvae. Assigned image locations are fictional demo locations, not field provenance.</p>
        {open('review', 'Open photo references and report')}
      </section></li>
      <li><section className="panel guide-step" aria-labelledby="guide-health">
        <span className="guide-step-label">5 · OBSERVATIONS AND HUMAN DECISIONS</span>
        <h2 id="guide-health">Follow the public-health review workflow</h2>
        <p>In <strong>Container QA</strong>, click <strong>Load synthetic examples</strong> for a rehearsal, or create a <strong>New QA observation</strong> when actual observations are available. Choose the matching origin and record source, date/time, container, batch and observation context. Blank means unknown; <strong>0</strong> means checked and none observed. Keep emergence and outcome unassessed unless there is a separate supported assessment.</p>
        <p>Bead counts do not become biological stage counts. Image records and QA records are not linked automatically; retain the appropriate source reference. A rehearsal stays synthetic, and user-entered field data are not independently verified by the app.</p>
        <p>In <strong>Study &amp; review</strong>, try <strong>Create synthetic study example</strong> and <strong>Run descriptive / readiness check</strong>. Inspect the plan, fixed inputs and missing-data notes before recording a review and exporting the report/audit.</p>
        <p>In <strong>Inspection planning</strong>, load synthetic QA examples and <strong>Generate inspection queue</strong>. Review the evidence, then accept, defer or dismiss with the requested reviewer, reason and dates. These are local planning records; no notification, physical action or release instruction is sent.</p>
        <div className="guide-links">{open('containers', 'Open Container QA')}{open('studies', 'Open Study & review')}{open('planning', 'Open Inspection planning')}</div>
      </section></li>
      <li><section className="panel guide-step" aria-labelledby="guide-model">
        <span className="guide-step-label">6 · OPTIONAL LEARNING EXERCISE</span>
        <h2 id="guide-model">Inspect a measured model comparison</h2>
        <p>In <strong>Trends &amp; modelling</strong>, click <strong>Create synthetic prediction example</strong>, then <strong>Train and evaluate</strong>. Read the comparison with simple baselines and the missed failures, not only accuracy. The fixed synthetic example gives 60% accuracy versus a 70% constant baseline; all three methods miss the three failed test containers.</p>
        <p>This is a software evaluation exercise, not useful field prediction or evidence of dengue reduction. The case charts remain separate synthetic context. Firebase stays optional, inactive by default and unverified.</p>
        {open('trends', 'Open Trends & modelling')}
      </section></li>
    </ol>

    <section className="panel guide-help" aria-labelledby="guide-help-title">
      <h2 id="guide-help-title">If something does not work</h2>
      <details><summary>The hosted service fails</summary><p>Read the checked service result and the count error. With cloud-first selected, the browser worker may provide the permitted fallback. Inspect the new result’s actual source. A model or service is not verified just because the browser says online.</p></details>
      <details><summary>The app does not reopen offline</summary><p>Reconnect using the same browser/profile. Open Data &amp; settings, refresh if the app version changed, and prepare again. Wait for the confirmation before disconnecting. Private browsing, clearing browser data or using a different browser can remove or bypass the prepared copy and records.</p></details>
      <details><summary>A count is missing or looks wrong</summary><p>Unknown is different from zero. Inspect the image, marks and warnings. Record a human count or rejection with a reason. Keep failed or unsuitable photos visible in the validation inventory. A manual correction is not an independent reference count.</p></details>
      <details><summary>I need my records on another device</summary><p>Use the export controls in each workspace and retain original photos separately. Records are local to this browser; there is no shared storage, automatic synchronisation or general audit-file restore. Do not clear browser storage before keeping the copies you need.</p></details>
      <p className="guide-boundary">No photo or count establishes mosquito species, Wolbachia infection, successful emergence or dengue impact. The current demonstration supports record keeping and review. Actual field usefulness and owner-operated checks remain pending.</p>
    </section>
  </div>;
}
