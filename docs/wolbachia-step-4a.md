# Step 4A — container quality-assurance records

Date: 21 November 2026 (WIB).
Version: 0.4.0.

## Implemented

The new **Container QA** view records dated, stage-aware observations separately from the existing photo store and synthetic dengue charts. It works without Firebase or a local model.

- Container, batch/cycle and location references; setup date, observation date/time and time zone.
- Explicit origins: synthetic demonstration, bead-proxy test and user-entered field observation. Proxy/demo locations retain mock labels; a field-observation label is not verification.
- Starting eggs, if known, with a source reference; live larvae/pupae, empty pupal cases and dead immature/adult counts. Unknown is null, distinct from checked zero.
- Container condition and optional temperature, with water/air/weather provenance and the measurement source. Snapshot readings do not establish heat-exposure duration.
- Separately entered emergence counts: measured, estimated or not assessed, with assessment date and method/reference.
- Separately entered QA outcome, with assessment date, assessor label and applied protocol/reference. These are operator-supplied statements, not automatic certification or authenticated assessor identities.
- Basic completeness notes without an automatic pass/fail algorithm, release recommendation or biological inference.
- A separate IndexedDB database, append-only revision snapshots, mandatory change reasons and a revision-number check that rejects stale edits from another tab.
- Search, origin filtering, latest-record CSV and full-history JSON export. Three synthetic examples can be loaded explicitly; loading again preserves edits and does not duplicate records.

Record creation is explicit. Save before navigating away; an unsaved editor draft is not persisted. The prototype supports up to 500 QA records in this browser. These records are not synced across devices, and clearing browser data removes them.

The source-reference field is text at this stage. Photo estimates are not automatically copied into biological stage counts. Assay results are not captured in these records; the export identifies infection status as not captured rather than inventing an image-derived result.

## Meaning and boundaries

Larval decline does not establish adult emergence. Empty pupal cases are useful observations but are not automatically converted into an emergence estimate here. A separately entered estimate must identify its method. An outcome can remain unassessed even when all visible objects have been counted.

Future stage 4B adds study setup and review. Stage 4C adds numeric modelling and evaluated comparisons. This milestone does not train ML, test hypotheses, claim field accuracy or connect Firebase. The existing cloud-default choices and image-routing guards remain in place.

## Verification

- 48 automated tests and the TypeScript/Vite production build pass. Domain and transaction checks cover zero/unknown preservation, date order, temperature provenance, outcome/method requirements, immutable origin, durable storage, stale edits, retained history and repeat-safe example loading.
- CSV checks cover text formula-prefix escaping and preservation of numeric negative temperatures. Audit JSON retains original and revised snapshots.
- Browser QA created a controlled bead-proxy record named ENGINEERING-QA-01, saved a zero count and an air-temperature fixture, then revised the count to 2 and separately entered a needs-review outcome with a reference. Refresh retained both revisions, unknown pupae and unassessed emergence.
- The actual browser-generated filtered CSV and all-history JSON were downloaded and read back. The CSV contained one bead-proxy row; the audit contained three synthetic examples plus the controlled test record. The test record retained count 0 in revision 1 and count 2 in revision 2.
- A 390 px frame (375 px usable width) showed both the QA register and editor at 375 px document width; the form itself fit within 349 px. Cancel worked on the narrow layout. The temporary harness was removed before publication.
- After QA entry, the existing overview retained its 24 synthetic image observations and unchanged case chart. Test data were created only in the preview browser's database, not embedded as user records in production source.

Live image accuracy, Firebase/App Check, offline reopening, eligible-device inference and biological/field outcomes remain unverified.
