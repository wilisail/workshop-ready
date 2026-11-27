# Step 6D: optional Firebase connector review

Updated: 27 November 2026 (WIB).

**Firebase remains a retained, inactive-by-default, unverified connector. This step does not set up Firebase or perform a live demonstration.** The three delivery goals remain network visibility, a practical public-health workflow, and cloud-first processing with local fallback. Wili has no new task in this step; earlier laptop, photo and field checks stay deferred.

## Source review

| Check | Evidence | Result |
| --- | --- | --- |
| Fresh-browser image engine | `src/lib/counter-routing.ts`: `readImageEngine` | Defaults to `bead_cv`; existing saved engine choices are preserved. |
| Fresh-browser processing policy | `src/lib/dashboard.ts`: `readDashboardState` | Prefers the hosted counter with browser fallback. |
| No Firebase fallback from the small counter | `src/lib/counter-runtime.ts` and `counter-routing.ts` | Only the same-origin Node endpoint and browser worker are available to this engine. |
| Image adapter starts only on request | `src/components/PhotoWorkspace.tsx`: `analyse`; `src/lib/image-ai.ts`: `generate` | An explicit count action selects the adapter. Firebase SDK imports, initialization and App Check setup are inside its generation method. |
| Saving configuration stays local | `src/App.tsx`: `FirebaseForm`; `src/lib/storage.ts` | Parses public configuration, saves it in browser storage and updates UI state. No model call, engine switch or live verification occurs. |
| Missing configuration | Existing image-analysis automated test | Fails before Firebase SDK initialization or image encoding; manual review remains available. |
| Managed local-model preparation | `src/lib/image-analysis.ts`: `planImageRoute` | Requires image capability already reported available. Downloadable/unavailable states do not start a download; cloud fallback is permitted only by the selected policy. |
| Development App Check mode | `src/lib/image-ai.ts` and `src/lib/ai.ts` | Debug behaviour requires Vite development mode and the explicit development variable. Production setup remains unverified. |
| Historical text-note adapter | `src/lib/ai.ts`; dashboard import/call search | Retained but not invoked by the current dashboard. |
| Public demo and source | Existing Vercel deployment; GitHub repository metadata | The repository is public. The technical guide's obsolete private-repository statement was corrected. No visibility/access settings were changed. |

The service worker caches application bundles from this host for offline availability. Cached optional SDK code is not provider initialization or evidence of Firebase inference. The read-only bead-service probe also does not check Firebase.

## Changes

- The optional settings panel now distinguishes **Inactive · not configured**, **Inactive · configuration saved**, and **Selected · unverified**. A selected method is not presented as a successful connection.
- The form explains that saving does not switch the counting method and that a Firebase count needs a deliberate method selection and count request.
- The configuration template and [connection notes](firebase-connection-options.md) describe optional, deferred activation. Firebase setup is no longer phrased as a required next delivery task.
- Adapter code, SDK dependency, Firebase Hosting configuration and public-variable names are retained. No provider API, model version, routing algorithm or SDK dependency was changed.

## Controlled verification

The browser regression uses dummy public configuration in a disposable local test profile. All external HTTP requests are observed and blocked; service-worker interception is disabled for this test so it cannot hide provider traffic. The separate offline suite still verifies the real service worker.

The regression checks the default engine, the unconfigured Firebase path, available manual review, configuration saving, selected-but-unverified status, persistence after reopening, switching back to the small counter and a successful same-origin bead count. It never clicks the Firebase count action. Zero provider requests are required throughout; the only counting POST must occur after the explicit small-counter action.

**121 automated tests, the compiled Node API smoke check, the production build and ten Chromium browser scenarios passed locally.** The added connector scenario observed zero external provider requests, zero counting POSTs before an explicit action, and one same-origin small-counter POST after that action. It also confirmed all three connector labels and retained configuration/preferences across reloads.

These tests establish the inactive connector boundary, not a working Firebase project, App Check token, provider response, managed-model capability or contest eligibility.

## Release evidence

Source CI and production verification will be recorded here after release. No live Firebase count is part of that verification.

## Remaining work

Step 6E is the connected/offline user walkthrough. Step 7 is the final demo and submission package. Actual prepared photos, independent references, field observations and owner laptop confirmation remain in the deferred owner block; see the [current plan](remaining-steps-and-goals.md).
