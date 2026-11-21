# Step 5 — evidence-linked inspection planning

Implemented: 21 November 2026 (WIB). Application release 0.7.0; rules `inspection-review-v1`.

This workbench turns recorded evidence into a human-reviewed inspection queue. It follows data exploration and model evaluation; it is not exploratory data analysis. It works without Firebase or a downloaded language model.

## Source and ordering

Select current Container QA records or a recorded study with a pinned QA dataset. Use one data origin at a time. The saved inspection plan includes the exact source revisions, study plan/dataset and optional historical model run. It retains full source history, including excluded observations, in the audit.

Group records by container, batch/release cycle and location reference. Use the latest calendar date on or before the planning date. Same-day records are flagged for reconciliation rather than silently selecting one. Later outcome/emergence assessments are not used to derive planning reasons. These historical snapshots are not independently authenticated field evidence.

| Priority | Recorded trigger | Review purpose |
| --- | --- | --- |
| Review first | Dry/damaged/missing condition, an available failed/needs-review outcome, or ambiguous latest-day records | Check the condition or reconcile the evidence. |
| Complete evidence | Unknown condition/setup/outcome, age above the chosen threshold, or a missing field explicitly selected as required | Decide what information or follow-up the project needs. |
| Routine review | No flag under the selected rules | Remain reviewable; this is not a biological pass certificate. |

Within priority, older latest observations come first, followed by a stable group key. Capacity marks the first chosen number as suggested; it neither discards other candidates nor automatically approves tasks. If recorded acceptances exceed capacity, a warning is shown. Capacity and observation-age thresholds are workflow choices, not measured resource constraints or published biological cutoffs.

Stage counts, measured container-water temperature and a separate emergence assessment are optional protocol checks, off by default. Their absence remains visible but raises priority only when selected. Ordinary air temperature is not relabelled as measured water temperature.

## Human decisions and revisions

Every action requires a reviewer label and reason. Accept requires an assignee and due date; defer requires a next-review date; dismiss has no assignment/date. Dates cannot precede the planning date. Changes append a new decision version and retain earlier entries.

Source revisions are checked before saving a decision. Changed inputs block new decisions on the old plan. Regeneration pins current inputs in a new plan, links the earlier plan and starts with no inherited decisions. For a study whose underlying QA has changed, capture a new study dataset before using it for a current inspection plan. Self-contained generated study examples retain their own explicit provenance.

The separate IndexedDB database `wolbachia-field-review:inspection-plans:v1` stores up to 50 plans, with at most 500 source records and 1,000 decision entries per plan. Transactional sequence checks reject concurrent stale decision updates. Source databases are reread before saving, but this is not a cross-database transaction or a tamperproof audit service. Clearing browser data removes saved plans; export to retain a copy.

No assignment, message or release instruction is sent to anyone. Reviewer/assignee names are self-entered, not authenticated institutional approval.

## Model and scientific limits

The optional saved model is historical context only. Its ID, algorithm/version, date, failure detections and model/constant-baseline accuracy remain visible. It does not supply priorities or infer current field risk. The unchanged synthetic 4C result detects 0/3 failed test groups and has 60% accuracy versus the constant baseline's 70%.

The rules do not identify Wolbachia infection from photographs, infer adult emergence from falling larva counts, allocate mosquito release quantities or predict dengue reduction. Synthetic case charts and mock locations stay separate. Field utility would require practitioner review and a prospective comparison under comparable inspection resources.

## Exports and checks

- Markdown: source/configuration, rules, evidence-linked queue, current decisions and limitations.
- CSV: all candidates with source revision references, reasons, gaps and current decision/assignment. Text cells are protected against spreadsheet formula execution.
- JSON: full pinned source history, study/model context, rule versions, exclusions and all decision versions. No image bytes are included.

Thirteen new automated checks cover ordering/capacity, date masking, optional gaps, grouping, validation, attribution/history, source changes, model exclusion, exports and persistence/concurrent edits. All 89 project checks and the production build passed. Browser checks covered all decision actions, persistence, source correction/regeneration, study/model context, filtering and downloaded export contents. A 390 px responsive frame had 375 px usable/document/body width with expanded evidence/history and a visible decision editor, without page overflow. The temporary QA page was removed.

Live Firebase, actual photo counting, eligible-device local inference, offline reopening and field prediction remain unverified.
