# Wolbachia Field Review — updated implementation plan

Updated: 21 November 2026 (WIB).
Repository: https://github.com/wilisail/workshop-ready

This plan supersedes the prediction target and remaining implementation sequence in `wolbachia-step-1.md`. That document remains a record of the earlier scope. Work already implemented is retained.

## Objective and demonstration

Support release-container quality assurance, study review and inspection planning. Counting is one input to a timed, stage-aware assessment; a falling larva count alone does not establish adult emergence. Wolbachia infection status comes from an appropriate assay, not an ordinary photograph.

The submission demonstration remains cloud-first, using prepared bead photographs, explicitly synthetic container/outcome records, mock locations and separate synthetic dengue trends. Real cameras, firmware, biological image validation and field-effectiveness research remain later phases. The checked 8 GB laptop is still ineligible for Chrome's managed model; no upgrade or different device is assumed.

## Current state

- Baseline audit and dashboard shell are implemented.
- Saved image import, manual review, Firebase image adapter, routing guards and analysis/review history are implemented. Actual photo accuracy and live Firebase/App Check remain unverified and owner testing is deferred.
- This release applies a Lotus Notes-inspired presentation: muted blue/lavender and gray, a title strip, working view tabs, compact rectangular panels, table grids and a status bar. Existing image storage and inference behavior are retained.
- The planned workbench copy now describes container-performance analysis. It still shows no trained model, test result or prediction.
- Container-QA records are implemented in step 4A, including explicit unknowns, provenance, separately entered outcomes and revision/export support. Step 4B adds two study templates, dated plan revisions, pinned inputs, descriptive/readiness checks and review exports. Numeric ML and generated inspection suggestions remain pending. See `wolbachia-step-4a.md` and `wolbachia-step-4b.md`.

## Updated steps

Effort is an estimate of active project time, not elapsed calendar time or a completion percentage. Remaining figures include only unfinished work; completed steps are not charged again.

| Step | Work and purpose | Owner | State | Remaining hours |
| --- | --- | --- | --- | --- |
| 1 | Baseline and method check: retain the repo and anchor the use case to published release-container QA | Assistant | Complete | — |
| 2 | Dashboard and Lotus Notes-inspired visual refresh | Assistant | Implemented in this release | — |
| 3 | Prepared-photo test: known bead counts, AI estimates, corrections, persistence and exports | User operates; assistant compares/fixes | Code implemented; real test deferred | 0.5–1 |
| 4A | Container-QA records: batch/setup dates, stage counts, condition, measured temperature/source and independently checked outcomes | Assistant | Implemented and checked | — |
| 4B | Study setup/review: two focused templates, outcome/unit/comparator, sampling rationale, a dated plan, checks and review export | Assistant; user reviews wording | Implemented and checked | — |
| 4C | Numeric ML/evaluation: container-performance target, simple baseline, held-out containers/dates and appropriate error/uncertainty reporting | Assistant | Planned | 4–6 |
| 5 | Inspection planning/report: evidence-linked priorities, missing data, reasons and recorded human decisions | Assistant; user checks flow | Manual demo list exists; generated workflow planned | 2–3 |
| 6 | Firebase/App Check: connect the project, verify deployed image requests and actual inference-source/routing behavior | User supplies console setup; assistant integrates | Adapter exists; live verification pending | 2–3 |
| 7 | End-to-end QA and submission: rehearse, review current rules and judging access, prepare video and submission materials | Assistant prepares; user records/submits | Pending | 3–4 |
| Buffer | Correct observed image, data, integration, layout or deployment failures | Both | Reserved | 4–6 |

Remaining work after 4B: approximately 12–17 hours, or 16–23 hours including buffer. These ranges exclude physical assembly, field studies, publication work, a complete general-purpose statistical adviser and any newly discovered contest/platform changes.

Next work order: 4C → 5 → 6 → 7. Step 3 testing can take place alongside these stages once Firebase is connected. Its allowance covers owner-operated tests and interpretation; step 6 covers project/domain configuration and integration verification. No setup or photographs are required from the owner to implement 4A–4B.

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
