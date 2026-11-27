# Step 7: final QA and demonstration/submission preparation

Updated: 27 November 2026 (WIB).

**The implementer's QA and preparation are complete, pushed to main and verified in CI. Owner checks, recording/upload and final submission remain deferred.** Nothing has been submitted to Devpost or YouTube. The [submission pack](submission/README.md) contains the evaluator guide, timed narration, project draft and recording checklist.

## Final software verification

**121 automated tests, the compiled Node API smoke check, the production build and twelve Chromium browser scenarios passed locally.** The added scenario exercises the previously separate public-health paths together:

1. Load the three explicitly synthetic Container QA examples and export their audit.
2. Create a synthetic counting study, compute four complete pairs / one missing pair / one exclusion with MAE 1.25, record a review and verify its run reference in the export.
3. Fit the synthetic prediction example, retain 60% model versus 70% constant-baseline accuracy and three missed failures, open that exact study, and export a review pinned to its model-run ID.
4. Generate an inspection queue from the three synthetic QA records, accept a suggestion with reviewer/assignee/reason/date, export its pinned evidence and decision, reload, and verify that the saved decision history remains unchanged.

The scenario observes zero external-provider requests. It is a disposable software rehearsal, not an owner check, independent review, real field observation or biological validation. The other eleven scenarios retain disconnected cold starts, cache repair, source labels, reference/reporting behaviour, manual review/export, the inactive Firebase boundary and guide navigation.

## Public evaluator check

The public app opened without an app sign-in prompt on 27 November 2026 (WIB). **Data & settings → Check bead service** reported a Vercel response (560 ms on this check). Complete offline preparation showed **10/10 assets saved**. Firebase remained **Inactive · not configured**.

A newly generated eight-bead example was counted from its pixels. The saved result was **8**, **Counted on Vercel**, with **Actual last count: Vercel function**, a new timestamp and a reduced-RGB routing explanation. This verifies the public hosted counter for this generated example, not prepared-photo or larvae accuracy. The public guide was left open for review. No Firebase call or actual field record was created.

The deployed app source is [`8ca9f9940aab5e52242c8435fd2af8f61eb301dc`](https://github.com/wilisail/workshop-ready/commit/8ca9f9940aab5e52242c8435fd2af8f61eb301dc), offline build `4ec87068b33c`, deployment `dpl_5hAw2bdAQFnMZGap9Zydn1QHs8xv` (**READY**). Step 7 adds tests/documents only; its local production build retains that same offline identifier. No new application deployment or access/visibility change is needed for the pack.

The source repository is public and GitHub reports **MIT**. Browser-local records do not provide multi-user sync, institutional storage, authentication or a shared database. The evaluator instructions describe the actual paths and recovery limits.

## Contest requirements check

Checked against the [official #BuildHybridAI rules](https://firebasehybridaihackathon.devpost.com/rules) and [event page](https://firebasehybridaihackathon.devpost.com/) on 27 November 2026. Deadline: **30 November 2026, 14:00 PST = 1 December 2026, 05:00 WIB** (converted with the America/Los_Angeles and Asia/Jakarta time zones).

| Requirement checked | Current status |
| --- | --- |
| Firebase AI Logic with a supported on-device platform route and App Check | **Unmet:** adapter retained, no configured/demonstrated provider execution. Vercel/offline CV is not that integration. |
| Public licensed source | Public GitHub repository; MIT detected. |
| Working project and testing instructions | Public app and evaluator guide checked. |
| English materials; functioning-app video up to three minutes, publicly visible on YouTube | English draft/script prepared; video and URL pending owner. |
| Existing-work/contribution disclosure | Earlier scaffold disclosed in draft; owner details remain to confirm. |

This is a technical gap assessment, not organizer approval. The current project must not be described as meeting the required Firebase integration. The user's decision to retain an inactive connector is preserved; this step does not add Firebase setup or a provider demonstration. Recording/upload and a final submission remain with the owner.

## Release evidence

- Preparation/test source: [`878af850c49ac46f5e543eb509f0f9680e53ba12`](https://github.com/wilisail/workshop-ready/commit/878af850c49ac46f5e543eb509f0f9680e53ba12).
- [GitHub CI run 45961150842](https://github.com/wilisail/workshop-ready/actions/runs/45961150842) passed all 121 automated tests, the compiled Node API smoke check, production build and twelve Chromium browser scenarios.
- The pack contains a 320-word primary English narration with a timed three-minute scene plan, an alternative for unavailable disconnected footage, evaluator controls/expected results and an honest provider disclosure. The final video itself remains unrecorded/unpublished.
- Repository comparison confirmed no application, API, build configuration or dependency changes in step 7. The checked live app therefore remains the 6E source/deployment/build above; no documentation-only redeployment was needed.
- Changed Markdown file links resolve, the source worktree is synced, and the rules deadline conversion was checked with America/Los_Angeles and Asia/Jakarta time zones.

Independent preparation is finished. These checks do not complete the owner's pending evidence or establish Firebase contest compliance.

## Remaining owner work

| Check/action | Estimate | State |
| --- | --- | --- |
| Network/device check | 10–15 min | Deferred |
| Disconnected laptop confirmation | 20–30 min | Deferred |
| Photos, references and available public-health workflow trial | 30–60 min | Deferred |
| Walkthrough clarity | 10–15 min | Deferred |
| Record, review, upload and complete final form | 30–45 min | Deferred; no video/submission URL yet |

Roughly 2–3 active owner hours, rounded. Real-photo errors, practical usefulness and owner-device compatibility stay pending until that evidence exists. The recording's optional alternative wording keeps these boundaries intact if disconnected footage is unavailable.
