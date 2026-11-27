# Wolbachia Field Review: three-minute demo and narration

Prepared 27 November 2026 (WIB). This replaces the old workshop-notes outline. **Recording and publication remain pending.** Start from the [submission pack](submission/README.md) and [recording checklist](submission/recording-checklist.md).

Use a demonstration profile and keep synthetic/generated labels visible. Prepare the QA examples, study/model runs and inspection queue before recording if needed, and describe prepared screens accurately. Show a fresh count and the actual processing source. The offline scene below is conditional on recording that actual disconnected run; the owner's laptop check is still deferred.

## Recording sequence

| Time | Show | Evidence to retain |
| --- | --- | --- |
| 0:00–0:20 | Overview and How to use | Three goals; prototype/synthetic labels |
| 0:20–0:50 | Data & settings service result, then Your image tests → Count this image | Fresh computed estimate and actual Vercel/browser source; original estimate separate from human review |
| 0:50–1:25 | Complete offline assets, disconnect/reopen, Run a new count, review/export | Actual disconnected execution and new time/source; local persistence, not an old saved answer |
| 1:25–1:55 | Container QA synthetic examples and a selected observation | Origin, dates, unknown/zero, separately assessed outcome and source reference |
| 1:55–2:20 | Prepared study result and synthetic ML comparison | Descriptive/check results; 60% model versus 70% constant baseline, three missed failures |
| 2:20–2:45 | Inspection queue, evidence and Save inspection decision | Reviewer/reason/assignee/date; local record, no external assignment |
| 2:45–3:00 | Guide, provider status and next validation work | Firebase inactive/unverified; real-photo/field evidence pending |

## English narration

### 0:00–0:20

Wolbachia Field Review explores three things: visible network and processing routes, traceable public-health observations, and useful local fallback when internet is unavailable. This is a research prototype. The examples and case charts you see are synthetic, rather than findings from a field deployment.

### 0:20–0:50

The browser's connection hint and a checked service response are separate. Here I request a new count of a generated bead image. The result identifies where processing happened, with marked regions and the original estimate. Human corrections preserve that result. This is computer vision for bead proxies.

### 0:50–1:25 — only with matching disconnected footage

After preparing this browser while connected, I disconnect and reopen the same application. A new count runs in the browser worker, without uploading the image. I can save a human review and export the record locally. This needs the previously prepared browser and profile. Reconnecting permits a hosted count again, but does not automatically synchronise these records to a shared database.

### 1:25–1:55

The public-health workspace keeps each observation's origin, time, source and stage context. Blank means unknown; zero means checked and none observed. Emergence and QA outcomes are separate assessments. These are synthetic rehearsal records. Bead counts do not become biological stages or establish infection or dengue impact.

### 1:55–2:20

Study plans preserve inputs, calculations and review comments. The numeric model is fitted locally and evaluated on held-out groups. This synthetic example scores sixty percent against a seventy percent constant baseline and misses three failures. That weakness stays visible; it is not a useful field predictor.

### 2:20–2:45

Inspection planning uses selected QA evidence and explicit rules. Suggestions keep their source revisions and reasons. A human records an accept, defer or dismiss decision with labels and dates. The audit preserves its history. Saving here sends no external assignment and does not authorise a mosquito release.

### 2:45–3:00

The guide explains each step. Firebase remains an inactive, unverified optional connector. The next work is real-photo references, the owner-operated checks and a practical field-workflow trial with appropriate domain review.

## Alternative when disconnected footage is unavailable

Replace the offline paragraph with this wording, showing the controlled test evidence or guide rather than staging an offline success:

> Controlled browser tests verified prepared offline reopening, new worker counts, human review and export. This recording is connected; it does not demonstrate the owner's disconnected laptop run. That check remains pending. The guide shows how to prepare and repeat it later.

Keep the visible wording **Controlled software test — owner laptop check pending**. Do not read the primary offline paragraph over connected footage or describe a device-only online run as an internet-disconnected test.

The script targets a video no longer than three minutes; actual speech, pauses and footage must be timed during recording. Do not invent a final video URL. See the [draft fields](submission/devpost-draft.md) and [requirements check](wolbachia-step-7.md#contest-requirements-check).
