# Wolbachia Field Review — updated implementation plan

Updated: 22 November 2026 (WIB).

**Route update (0.8):** the product now uses a small Vercel/browser bead counter without Firebase setup. Firebase integration is optional and deferred; the legacy steps below retain the earlier contest-route estimates. See `vercel-counter.md`. Public demo: https://workshop-ready-theta.vercel.app/.
Repository: https://github.com/wilisail/workshop-ready

This plan supersedes the prediction target and remaining implementation sequence in `wolbachia-step-1.md`. That document remains a record of the earlier scope. Work already implemented is retained.

## Objective and demonstration

Support release-container quality assurance, study review and inspection planning. Counting is one input to a timed, stage-aware assessment; a falling larva count alone does not establish adult emergence. Wolbachia infection status comes from an appropriate assay, not an ordinary photograph.

The submission demonstration remains cloud-first, using prepared bead photographs, explicitly synthetic container/outcome records, mock locations and separate synthetic dengue trends. Real cameras, firmware, biological image validation and field-effectiveness research remain later phases. The checked 8 GB laptop is still ineligible for Chrome's managed model; no upgrade or different device is assumed.

## Current state

- Baseline audit and dashboard shell are implemented.
- Saved image import, manual review, Firebase image adapter, routing guards and analysis/review history are implemented. Actual photo accuracy and live Firebase/App Check remain unverified and owner testing is deferred.
- This release applies a Lotus Notes-inspired presentation: muted blue/lavender and gray, a title strip, working view tabs, compact rectangular panels, table grids and a status bar. Existing image storage and inference behavior are retained.
- The modelling workbench now fits and evaluates a small numeric model on a retained QA snapshot. It keeps predictions separate from the case charts and supplies explicit insufficient-data results. The synthetic exercise does not establish useful field performance.
- Container-QA records are implemented in step 4A, including explicit unknowns, provenance, separately entered outcomes and revision/export support. Step 4B adds two study templates, dated plan revisions, pinned inputs, descriptive/readiness checks and review exports. Step 4C adds real numeric training/evaluation on grouped chronological partitions, two baselines, uncertainty notes and model-aware review/export. Step 5 adds rule-based inspection suggestions, capacity, human decisions, source-change guards and exports. See `wolbachia-step-4a.md`, `wolbachia-step-4b.md`, `wolbachia-step-4c.md` and `wolbachia-step-5.md`.

## Updated steps

Effort is an estimate of active project time, not elapsed calendar time or a completion percentage. Remaining figures include only unfinished work; completed steps are not charged again.

| Step | Work and purpose | Owner | State | Remaining hours |
| --- | --- | --- | --- | --- |
| 1 | Baseline and method check: retain the repo and anchor the use case to published release-container QA | Assistant | Complete | — |
| 2 | Dashboard and Lotus Notes-inspired visual refresh | Assistant | Implemented in this release | — |
| 3 | Prepared-photo test: known bead counts, AI estimates, corrections, persistence and exports | User operates; assistant compares/fixes | Code implemented; real test deferred | 0.5–1 |
| 4A | Container-QA records: batch/setup dates, stage counts, condition, measured temperature/source and independently checked outcomes | Assistant | Implemented and checked | — |
| 4B | Study setup/review: two focused templates, outcome/unit/comparator, sampling rationale, a dated plan, checks and review export | Assistant; user reviews wording | Implemented and checked | — |
| 4C | Numeric ML/evaluation: container-performance target, simple baseline, held-out containers/dates and appropriate error/uncertainty reporting | Assistant | Implemented and checked on synthetic data | — |
| 5 | Inspection planning/report: evidence-linked priorities, missing data, reasons and recorded human decisions | Assistant; user checks flow | Implemented and checked on synthetic evidence | — |
| 6 | Firebase/App Check: connect the project, verify deployed image requests and actual inference-source/routing behavior | Owner authorizes connection; assistant uses supported plugin/MCP operations and integrates | Adapter exists; live verification pending | 2–3 |
| 7 | End-to-end QA and submission: rehearse, review current rules and judging access, prepare video and submission materials | Assistant prepares; user records/submits | Pending | 3–4 |
| Buffer | Correct observed image, data, integration, layout or deployment failures | Both | Reserved | 4–6 |

Remaining work after step 5: approximately 6–8 hours, or 10–14 hours including buffer. These ranges exclude physical assembly, field studies, publication work, a complete general-purpose statistical adviser and any newly discovered contest/platform changes.

Current work order: test prepared bead photos → rehearse the independent product demo → decide separately whether to finish Firebase judging requirements. Step 3 bead-photo testing can now use the small counter without Firebase. The optional Firebase adapter requires its own later verification. Its allowance covers owner-operated tests and interpretation; step 6 covers project/domain configuration and integration verification. No setup or photographs are required from the owner to implement 4A–4B.

## Analysis order and model improvement

The analytical order is data collection/QA → descriptive exploration and readiness/design checks → training and held-out evaluation → operational inspection planning. Step 5 is the last of these, not EDA. Step 4B already supplies basic descriptive/readiness checks before 4C; it is not a complete EDA workbench.

The current logistic regression fits coefficients when explicitly run. It does not continuously learn from new records. Importing a standard estimator supplies a working algorithm, not pretrained Wolbachia knowledge or a guaranteed improvement over the constant baseline. A later comparison can include regularized logistic regression, random forests or gradient boosting, with train-only preprocessing and tuning, a new untouched evaluation set and failure recall reported alongside accuracy. Reusing the known 4C test set to choose a winner would make it a development set rather than a fresh test. New field records require outcome quality checks and explicit versioned retraining/evaluation. The existing synthetic 60% versus 70% result remains unchanged.

## 4A acceptance boundary

- Record container and batch identity, observation/setup times and stage/condition observations with explicit unknown values.
- Keep actual observations, bead proxies, synthetic records and laboratory results distinguishable in storage and exports.
- Record final QA outcome and whether emergence was measured, estimated or not assessed; retain the reference/protocol.
- Do not automatically convert fewer visible larvae into successful release or infer infection status.
- Keep dengue charts as contextual data, separate from the initial model target.

## 4B acceptance boundary

Start with counting validation and container-performance prediction templates. Each specifies a research question, primary outcome, independent unit, comparator, sampling rationale, exclusions and planned analysis.

- Preserve dated plan versions and explain later changes.
- Flag repeated observations, missing reference counts and unsupported calculations. No universal sample-size cutoff of 30 and no automatic scientific-validity certificate.
- Support a small documented set of deterministic statistics/checks. Display assumptions and distinguish exploratory analysis from pre-specified evaluation.
- Produce a reviewable export containing methods, source references, provenance, dataset/model/code versions, limitations and reviewer comments.
- Do not block basic image saving/manual review behind full study setup.

## 4C and planning acceptance boundary

First demonstrate the computation on explicitly synthetic container/outcome records. Use only inputs available before the outcome being predicted and prevent records from the same held-out unit leaking into training. Report a simple baseline alongside the model and identify the selected evaluation scope.

Synthetic performance verifies an analytical pipeline, not field accuracy. If real labels are insufficient, show an insufficient-data/exploratory state. Subsequent field evaluation would test whether the model-guided workflow improves inspection performance under comparable resources. Recommendations do not automatically prescribe mosquito release quantities or promise a dengue reduction.

## Method references

- O'Neill and colleagues, scaled Townsville deployment: larvae, pupae and pupal skins contributed to emergence estimates used to adjust egg quantities. https://doi.org/10.12688/gatesopenres.12844.3
- Tantowijoyo and colleagues, Yogyakarta establishment: release-container QA used pupal skins and dead immature/adult counts. https://doi.org/10.1371/journal.pntd.0008157
- NC3Rs Experimental Design Assistant: study-design communication, randomisation, blinding and sample-size support. This application is not affiliated with or endorsed by NC3Rs. https://eda.nc3rs.org.uk/about
- NC3Rs experimental units and sample-size guidance: https://eda.nc3rs.org.uk/experimental-design-group

## Visual refresh verification

All 36 existing automated checks and the TypeScript/Vite production build passed. Browser QA checked the Notes-inspired dashboard, view-tab navigation, updated not-run modelling scope and the retained saved engineering image/manual review. A 390 px frame (375 px usable width) showed the image-review document/body both at 375 px without page overflow. Mobile drawer navigation reached Data & settings, closed correctly and retained a 375 px document width. A temporary responsive harness was removed before publication. This release does not verify a live Firebase request, real larvae detection, an eligible-device local model or offline reopening.

## 4B verification

All 60 automated checks and the TypeScript/Vite production build passed. Browser QA checked the synthetic count example (MAE 1.25, signed bias 0.75, unit-balanced MAE 1.333), unknown/excluded counts, zero-value entry, review comments, plan amendments and a separately captured QA-readiness snapshot. New plans did not inherit an older result or review. Reload retained studies; downloaded Markdown and JSON contained the expected results, reviewer comments, methods, raw inputs and versions. A 390 px frame had 375 px usable/document/body width in the study view and methods form, without page overflow. The temporary responsive harness was removed. These checks establish prototype behavior; live Firebase/image accuracy and field validity remain unverified.

## 4C verification

All 76 automated checks and the production build passed. The optional Python reference script independently checked training-only preprocessing, reconstructed scores, confusion counts, Brier loss and Wilson arithmetic. The fixed-step TypeScript optimizer differed from converged scikit-learn scores by at most 0.00663 on the synthetic fixture; this is a numerical check, not field validation. Browser QA checked insufficient-data behavior, real training, saved model review, review invalidation on rerun, persistence after reload, audit/report/CSV exports and case-filter independence. The 390 px frame retained 375 px usable/document/body width with model evidence tables and parameters expanded. The temporary harness was removed. No live Firebase or biological image/field validation is included.

## Step 5 acceptance and verification

Inspection planning pins one data origin and current QA records or a recorded study's QA snapshot. Latest dated condition/outcome evidence, same-day ambiguity and chosen completeness/age checks supply explicit inspection/data-review reasons. Future observations are excluded from the queue; later QA/emergence assessments are masked when deriving reasons. These are illustrative workflow rules, not a release protocol. Optional field requirements, observation age and task capacity are editable choices.

All candidates remain visible. Accept/defer/dismiss decisions require attribution and reasons; accepted tasks need an assignee/date, and deferrals need a next-review date. Full history and source revisions are exported. Source changes block new decisions, and regeneration creates a separate plan without copying decisions. Model scores, dengue charts, infection inference and release quantities do not rank the queue.

All 89 automated checks and the production build passed. Browser QA checked a capacity-one queue, all three decision actions, reload persistence, report/CSV/JSON contents, a QA correction, blocked decisions on the stale plan, regeneration with no inherited decisions, a study/model-context plan and the capacity filter. The 390 px frame retained 375 px usable/document/body width with evidence/history expanded and the decision form visible. The responsive harness was removed before release. These checks establish prototype behavior, not field usefulness, biological accuracy, live Firebase or offline-generation capability.
