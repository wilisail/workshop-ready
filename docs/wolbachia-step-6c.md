# Step 6C: photo validation and public-health trial preparation

Updated: 27 November 2026 (WIB).

**Implementation and preparation are ready. Actual prepared-photo measurements and the public-health field trial remain deferred to the owner block.** No field accuracy, biological detection, infection or dengue-impact result is claimed.

The [three main goals](remaining-steps-and-goals.md) remain network visibility, a practical public-health workflow, and cloud-first processing with a local fallback. This step connects available software to the evidence that will be collected later. Firebase remains an optional connector.

## Available now

### Separate image-reference declarations

Saved uploaded images now support a separate reference count, method, counter label, physical setup/container-and-batch reference, evidence declaration, independence/blinding declarations and an explicit exclusion reason. Blank reference counts stay unknown; zero is a valid observed count. A correction entered in human review does not become an independent reference automatically.

Declarations are tied to the image SHA-256. Amendments require reasons and append history. Concurrent stale edits are rejected. The store records whether a computed analysis already existed when the declaration was saved. A later new count retains the reference and earlier results; it does not rewrite the declaration timing. Existing image records remain readable without migration.

Generated examples keep their construction reference. They cannot receive a prepared-photo declaration. Uploaded images matching a saved generated example's bytes are also excluded from prepared-photo metrics. Other provenance and blinding claims remain operator declarations: the app cannot authenticate a photograph or certify independent counting.

### Descriptive photo-error report

**Image review → Photo validation report** inventories all saved images. The list's search/status filters do not cherry-pick the validation sample. Prepared-photo declarations and uploaded test-image diagnostics have separate scopes; biological manual records are outside the small counter's comparison.

The report reuses the existing study-descriptives calculation for complete pairs, unknown pairs, exclusions, physical units, mean absolute error, signed bias, maximum absolute error and unit-balanced MAE. It uses the latest original computed result per image. Human corrections are never substituted, and no best result is selected automatically.

Duplicate image bytes retain the earliest active record in a selected scope, with excluded copies and reasons retained in the inventory. Repeated unit references, reruns, post-estimate declarations and unconfirmed independence/blinding remain visible. Different engines/versions/settings have separate result groups; pooled error metrics are suppressed when those groups differ. No p-value, confidence interval or automatic field-validity certificate is calculated.

**Export validation CSV** retains row-level inputs and inclusion reasons. **Export validation audit** freezes the selected scope, algorithms, settings, hashes and complete analysis/reference/review histories. Images are not embedded in these exports. Existing image-record exports also retain the new reference fields.

### Deferred practical trial pack

- [Owner checklist](field-trial-checklist.md): collection, separate references, running the comparison, QA entry and export.
- [Photo-reference worksheet](templates/photo-reference-sheet.csv): header-only, ready to fill later.
- [Public-health observation worksheet](templates/public-health-trial-sheet.csv): header-only, with source/date/stage/assessment fields.

The worksheets are recording aids, not an automatic CSV import. Container QA, Study & review and Inspection planning retain their existing provenance and human-decision boundaries. No image count is copied into biological stage counts automatically. Actual field observations require their own source/context; synthetic rehearsals stay synthetic.

## Controlled verification

**121 automated tests, the compiled Node API smoke check, the production build and nine browser scenarios passed locally.** Ten new automated tests cover known errors and repeated-unit arithmetic; unknown versus zero; exclusions and duplicate images; generated/test/biological scope separation; independent-reference qualifications; method grouping; latest-run/wrong-image guards; history, reopening and stale edits; and frozen/formula-safe exports.

The browser suite retains all seven step 6B cases and adds:

1. An offline uploaded **synthetic** fixture with eight computed objects and a separately entered test reference of ten: MAE 2 remains unchanged after a human correction to zero. A reasoned reference amendment to nine changes MAE to 1 while retaining both declarations. Reload and duplicate upload preserve history and explicit exclusion accounting. Switching back to prepared-photo scope leaves measurements pending. The 390 px layout has no page overflow.
2. A public-health **software rehearsal** using synthetic-origin QA entry: observed zero stays zero, unobserved stages stay null, and emergence/outcome remain unassessed in the downloaded audit. This is not an actual field observation or intervention.

The fixtures exercise the software, not field accuracy. No owner photos or field records have been supplied for this step. Actual photo measurements, a practical trial and owner usability feedback remain pending.

## Release evidence

CI and public deployment checks are recorded here after release. Wili's 30–60 minute collection/trial block remains deferred, along with the earlier laptop checks.
