# Step 4B — study setup and review

Implemented: 21 November 2026 (WIB). Software 0.5.0; calculation `study-descriptives-v1`.

## What works

The **Study & review** view provides two templates:

| Template | Inputs | Current output |
| --- | --- | --- |
| Counting accuracy | Manually entered method/reference pairs, observation and unit references, dates, method descriptions, independence/blinding declarations and exclusion reasons | Complete/missing/excluded counts, unique unit references, MAE, signed bias, maximum absolute error and unit-balanced MAE |
| Container-performance prediction planning | Selected, matching-origin Container QA records with their pinned source revisions and history | Label/class counts, grouping, missing setup/temperature and unresolved-outcome checks; no model training |

Both record the question, primary outcome, declared independent unit, planned unit count, comparator, sampling rationale, allocation/sampling procedure, blinding, inclusion/exclusion criteria, missing/repeated-observation handling and analysis plan. A plan may remain exploratory without a declared formal hypothesis. Recording requires the question, outcome, comparator, sampling rationale and analysis; other omissions stay visible.

A saved draft is followed by a dated recorded version. Amendments require a reason and create another draft. Dataset snapshots attach to recorded plans. Runs append their inputs' identifiers, algorithm version, software version and computed outputs. Reviews attach to the exact displayed plan, snapshot and run. Changing any of those does not carry an earlier review forward. Prior versions remain in the audit.

## Computation and evidence boundary

For complete, non-excluded count pairs, error = method count − reference count. MAE is the mean absolute error; signed bias is mean error. Unit-balanced MAE first averages absolute errors within each normalized unit reference, then averages the unit means. It is descriptive and does not establish statistical independence. Unknown counts stay null, measured zeros stay zero, excluded rows remain in the snapshot with reasons. Repeated unit/image references and missing/unconfirmed method/reference details produce checks.

The synthetic fixture has six rows, four complete included pairs, three unique unit references, one missing pair and one excluded duplicate. MAE = 1.25 objects, bias = 0.75, maximum error = 3 and unit-balanced MAE = 4/3. No model or human experiment produced these illustrative values.

Prediction readiness keeps `failed` and `satisfactory` QA labels separate from `not_assessed`/`needs_review`. It flags incomplete classes, repeated units, unknown setup dates and absent container-water temperature. It does not equate air/weather readings with water temperature or treat unresolved outcomes as successful releases. Source QA revisions changing later do not alter old snapshots or results; the view flags those snapshots after refreshing sources.

Synthetic, bead-proxy and field origins cannot be pooled in one snapshot or silently inherited from another plan origin. Counts entered in this view are not automatically linked to saved image analysis records: the operator supplies the observation reference and methods. A declared field origin or reviewer label is not independent verification.

## Review and exports

- **Export methods report** downloads a readable Markdown report of current methods, source references, inputs, outputs, limitations and current reviewer comments.
- **Export full study audit** downloads JSON containing all plan versions, input snapshots, raw pairs, pinned QA histories, calculations, reviews and calculation definitions. It contains no image bytes.
- Studies persist locally in IndexedDB (`wolbachia-field-review:studies:v1`), separate from photo/QA stores. Browser clearing removes them; export a copy. There is no study import or device sync in this stage.
- Transactions reject stale changes from another tab. Limits: 50 studies, 20 dataset snapshots per study and 500 observations per snapshot.

Plan timestamps use the local browser clock. The application preserves versions through its normal controls; it is not a tamper-proof registry, authenticated peer-review service or external preregistration platform. It does not calculate power, p-values or confidence intervals, enforce a universal minimum of 30, infer Wolbachia infection, or establish emergence/field effectiveness/dengue causation. Step 4C will add evaluated numeric ML separately.

## Basis for the review workflow

The existing QA scope follows published release-container observation methods, including separate emergence assessment (references in `wolbachia-updated-plan.md`). The study layer adapts general design and reporting principles: explicit units, appropriate comparators, justified sampling, blinding where relevant and disclosed exclusions. These principles are described by the [NC3Rs Experimental Design Assistant](https://eda.nc3rs.org.uk/about) and its [group/sample-size guidance](https://eda.nc3rs.org.uk/experimental-design-group). NC3Rs guidance concerns experimental design; it is not a Wolbachia deployment protocol or an endorsement of this application. A practitioner must still judge the design for the intended field setting.

## Verification

All 60 automated tests passed, including 12 new study tests covering independent arithmetic expectations, invalid/missing/zero inputs, provenance separation, amendments, retained snapshots, changed-source warnings, review-version binding, result/input consistency, persistence, concurrent stale edits and exports. The TypeScript/Vite production build passed.

Browser checks exercised the synthetic count result, a saved review, amendments without inherited results/reviews, zero-value entry and a QA-readiness run using three synthetic records. Downloaded report/audit contents matched the example. Reload preserved studies. The Notes-style layout and form were checked in a 390 px frame (375 px usable/document/body width, no page overflow). The temporary harness was removed before packaging. No live Firebase request, real larva image accuracy, eligible-device local model or field hypothesis was tested.
