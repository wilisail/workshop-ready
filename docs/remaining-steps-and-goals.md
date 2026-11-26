# Wolbachia Field Review: goals and remaining steps

Updated: 26 November 2026 (WIB).

This is the current delivery plan. It supersedes the remaining-work estimates and mandatory Firebase route in the historical [implementation plan](wolbachia-updated-plan.md). Completed steps 1–5 are retained.

## Three main goals

1. **Network:** make the real network and execution paths understandable and observable: staff browser, hosted counting service, device processing, and local records. Separate implemented paths from reference designs for field gateways, remote links and an intranet service.
2. **Public health:** demonstrate a practical Wolbachia-related collection, quality-assurance, review and inspection workflow with provenance, uncertainty and human decisions. Measure prepared-photo errors against independent reference counts; retain real observations separately from synthetic examples. Biological detection, Wolbachia infection and dengue impact require their own appropriate evidence.
3. **Local AI as fallback:** prefer the cloud when available and keep useful processing and records available without internet after initial preparation. The current image fallback is deterministic classical CV in a browser worker, with no learned weights or LLM. Numeric model fitting also runs locally. A general-purpose local language model is not part of this delivery. Full offline reopening, counting, persistence and export must be tested in step 6B before being claimed.

Firebase remains an optional connector point. Its adapter stays available but inactive/unverified unless separately configured; this plan allocates no Firebase console, App Check setup or live Firebase demonstration work. Describe the actual implementation accurately in any submission.

## Working arrangement

The implementer proceeds with implementation, automated checks, documentation and deployment checks first. **Wili's laptop checks, photos, review and recording are deferred until that work is ready.** An owner check remains pending until performed; an automated or cloud-browser test does not establish a result on Wili's laptop. Deferred owner checks do not block independent implementation work.

Times below estimate active work, not a promise of elapsed time. They are the revised estimates agreed for this reduced scope, not the original Firebase integration estimates.

| Step | Remaining work / acceptance | Implementer | Wili, deferred | State |
| --- | --- | --- | --- | --- |
| 6A | Verify browser → hosted counter and browser-worker paths; show connection hint separately from a checked API response; record source and update the network explanation | 0.5–1 h estimate; implementation finished | 10–15 min, laptop check | Implemented; automated, CI and hosted/browser checks passed; owner check deferred |
| 6B | Prepare assets locally; verify reopening, counting, record saving, human review and export while disconnected; cloud-first fallback must be observable | 2–3 h | 20–30 min, disconnected-device check | Pending |
| 6C | Prepared real bead photos with independent counts; error/missingness report; practical public-health data-entry/review trial with available observations | 1–1.5 h | 30–60 min, photos/reference counts and workflow trial | Pending; depends on owner evidence |
| 6D | Preserve and document the optional Firebase connector as inactive/unverified; no live Firebase demonstration | 15–30 min | None | Pending connector review |
| 6E | Finish an accessible connected/offline walkthrough; align README, UI and evidence limitations with verified behaviour | 0.5–1 h | 10–15 min, clarity check | Pending |
| 7 | End-to-end QA, evaluator access, demo sequence, narration and submission text | 1–1.5 h | 30–45 min, record/upload/submit | Pending |

Total: approximately **7–11 combined working hours**, including around **2–3 hours of Wili's hands-on time**. New defects and upload/collection delays may add time. Completed work is not charged again.

## Existing evidence and limits

- Steps 1–5, study readiness checks, numeric evaluation and inspection planning were implemented on demonstration evidence. Fuller EDA and real-data usefulness remain separate improvements.
- The prior release reported 97 passing automated tests. Step 6A now passes 104 tests, the compiled-server check, production build and GitHub CI. Its live metadata probe and distinct hosted/browser counts were also checked; see [6A evidence](wolbachia-step-6a.md).
- Both hosted and browser routes previously counted the generated eight-object proxy. This is a controlled synthetic check, not an accuracy measurement on field images.
- The small counter accepts `bead_proxy` only. Real biological images can be saved and manually reviewed; they must not be relabelled as beads to obtain an automated count.
- A service worker for built assets exists. Cold offline reopening and the complete disconnected workflow remain pending step 6B verification.
- Photos/results use browser IndexedDB; other workspace records use browser storage. Supabase, shared multi-device records, automatic synchronisation, remote sensors and intranet deployment are not connected by this plan.
- The synthetic prediction result (60% versus a 70% constant baseline) demonstrates computation and evaluation, not useful field prediction.

## Next execution order

1. Completed: push this plan and implement/check 6A; owner-operated laptop confirmation remains deferred.
2. Implement and check 6B without waiting for owner-operated checks.
3. Prepare 6C inputs/report structure, review the optional connector in 6D, and write 6E instructions.
4. Run owner-operated checks as one later block; keep any missing evidence visibly pending.
5. Finish step 7 using only results actually demonstrated.

## Project links

- Repository: https://github.com/wilisail/workshop-ready
- Live app: https://workshop-ready-theta.vercel.app/
- Network implementation and step 6A evidence: [step 6A notes](wolbachia-step-6a.md).
