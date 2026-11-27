# Wolbachia Field Review

A cloud-first research prototype for reviewing release-container observations, exploring case trends and preparing follow-ups.

The repository remains `wilisail/workshop-ready`. **Step 5 is implemented:** evidence-linked inspection queues, pinned sources, capacity suggestions, human decisions and report/audit exports. Step 4C retains its small logistic model, two baselines and chronological, held-out evaluation. **Version 0.8 adds a small bead-image counter that runs in a Vercel Node function or a browser worker without Firebase, API keys or a managed-model download.** Real-photo validation and the optional Firebase adapter remain unverified.

The current presentation follows a Lotus Notes-inspired workbench: muted blue/lavender and gray, working view tabs, compact panels and table grids. The [updated workplan](wolbachia-updated-plan.md) refocuses the next stages on container quality assurance and a reviewable study workflow. Numeric model training and study review work without Firebase. A model is fitted only when you select Train and evaluate; no fixture metrics substitute for training.

## Try the current interface

Public demo: https://workshop-ready-theta.vercel.app/ (no evaluator login). The existing private Site remains https://workshop-ready-wili.williworkmail.chatgpt.site/ and keeps its original access restrictions. The Vercel counting endpoint is available on Vercel; the static private Site can use the browser route.

| View | Available in this build |
| --- | --- |
| Overview | Location/date filters, calculated sample totals, weekly case chart, review progress and pending observations. |
| Image review | Saved originals, small Vercel/browser bead counter with marked regions, optional Firebase adapter, human review and audit history; demo fixtures remain on their own tab. |
| Container QA | Dated stage counts, batch/location references, condition, temperature provenance, separately entered outcomes, revision history and CSV/JSON export. No Firebase is needed for record entry. |
| Study & review | Counting-accuracy and container-performance planning templates; versioned methods, input snapshots, descriptive/readiness checks, reviewer comments and Markdown/JSON export. |
| Trends & modelling | Actual numeric model training, chronological/grouped evaluation, two baselines, confusion counts, Brier loss, conditional intervals, evidence exports and separate synthetic case context. |
| Inspection planning | Rule-based inspection priorities, pinned QA/study inputs, editable capacity, attributed human decisions, source-change warnings and report/CSV/JSON exports. The earlier manual location demo remains collapsed below. |
| Data & settings | CSV exports, reset of demo edits, four processing preferences, read-only capacity check and Firebase configuration form. |
| How to use | Connected/offline walkthrough, evidence boundaries, troubleshooting and links into each workspace; included in the prepared offline app. |

For a visitor without development setup, start with the [live How to use view](https://workshop-ready-theta.vercel.app/#guide) or [portable user walkthrough](user-walkthrough.md). The Overview entry and navigation both open the guide. Its image links select **Your image tests** so a previous visit to the separate fixture tab cannot turn the computed exercise into a predefined estimate. See [6E verification](wolbachia-step-6e.md).

Use **Image review → Load eight-bead example → Count this image** to count actual pixels of a clearly generated image. Its construction reference is not passed to the counter. Choose **This device only** for a worker run with no upload, or **Vercel only** to verify the hosted function. Each result retains settings, reduced-pixel SHA-256, marked regions, source and elapsed time. This classical CV baseline has no learned weights and is not a validated larvae detector.

Use **Image review → Your image tests → Add an image** to save a still JPG/PNG/WebP (up to 8 MB / 16 megapixels), container ID, date, target kind and fictional demo location. Manual review works immediately without Firebase. Original image bytes and all analysis/review versions are saved in IndexedDB on this browser; clearing browser data removes them. They are not synced across devices. **Demo examples** contains the separate predefined illustrations and fixture reviews used by the synthetic overview.

Estimates on the separate **Demo examples** tab are fixtures, distinct from computed saved-image results. The illustration guides are reference positions, not detections. Charts and percentage changes are calculated from the synthetic records; no trained model or causal efficacy finding is implied.

Use **Container QA → New QA observation** for the new records, or explicitly load the synthetic examples. Blank counts remain unknown; a checked zero remains zero. Temperature sources, emergence methods and operator-entered QA outcomes keep separate labels. Revisions preserve older snapshots and require a reason. Save before leaving the editor. Records use their own browser-local IndexedDB database and do not alter the case charts; export full history to retain a copy. See [step 4A details](wolbachia-step-4a.md).

Use **Study & review → Create synthetic study example → Run descriptive / readiness check** for a reproducible workflow example. It has six fictional observation rows, four complete pairs, three unit references, one missing pair and one excluded duplicate. Mean absolute error is 1.25 objects; unit-balanced MAE is 1.333 objects. These fixture results do not establish biological accuracy.

Choose **New counting study** to enter your own method/reference count pairs, or **New prediction plan** to select matching-origin QA records. Record a dated plan before capturing its input snapshot. Plan amendments, new snapshots and new runs retain their history and need a fresh review. The primary outcome, sampling justification, reference independence, missing-data handling and repeated-unit checks support review; no universal sample cutoff, p-value, power calculation, confidence interval or automatic validity certificate is supplied. The prediction template checks data readiness; it does not train a model. See [step 4B details](wolbachia-step-4b.md).

Use **Trends & modelling → Create synthetic prediction example → Train and evaluate** for the 4C exercise. The generator creates 100 clearly fictional QA records representing 48 repeated container groups plus four exclusion examples. The fixed split uses 35 earlier training groups and 10 later test groups; 55 input rows are excluded with reasons. No image request, Firebase setup, model download or 16 GB machine is required for this small browser computation.

The fixed example is deliberately reported honestly: model accuracy is 60% versus 50% for the inspection rule and 70% for the training-prevalence baseline. All three miss the three failed test containers. These synthetic results demonstrate evaluation, not useful field prediction. Do not interpret the generated relationships as published Wolbachia effects. See [4C methods, results and independent numerical verification](wolbachia-step-4c.md).

Use **Inspection planning → Load synthetic QA examples → Generate inspection queue** to try step 5 without Firebase. Review the reasons and evidence, then accept a task with an assignee and due date, defer it with a next-review date, or dismiss it with a reason. Every decision requires a reviewer label and reason and is retained in history. Assignments are recorded locally; no notification or physical action is sent.

Plans pin their source revisions and selected checks. Source changes block new decisions until the plan is regenerated; the new plan retains a link to the earlier one without copying its decisions. Capacity marks a suggested shortlist while keeping all candidates available. Model evaluations may be retained as historical context but do not rank this queue. See [step 5 methods and checks](wolbachia-step-5.md).

## Run locally

Requirements: Node.js 22.12+ or a supported newer LTS release, and npm.

```sh
git clone https://github.com/wilisail/workshop-ready.git
cd workshop-ready
npm ci
npm run dev
```

Open the localhost address printed by Vite.

```sh
npm test
npm run build
```

No Firebase account, App Check token or model download is required for the small bead counter, numeric ML, record entry, review or inspection planning. Development commands are for maintainers; a demo visitor needs only the Vercel URL.

## Processing preferences

The small counter is the default image engine. New workspaces prefer Vercel with explicit browser fallback. Existing saved preferences are preserved.

| Preference | Behaviour |
| --- | --- |
| Vercel only | Reduced RGB pixels go to `/api/count-image`; failure stays visible. |
| Prefer Vercel, allow browser fallback | Uses Vercel online; may run the same method in the browser if the endpoint is unavailable. |
| Prefer this device, allow Vercel fallback | Tries the browser worker first; a cloud request is permitted only by this selected policy. |
| This device only | Runs in a worker; no counting upload or cloud fallback. |

The bounded counter accepts only bead proxies, uses at most a 768-pixel longest side, and returns no accepted count for detected clipped, irregular, overlarge or overly dense regions. Foreground, threshold, minimum/maximum area and count-area controls are saved with the result. Touching beads can still merge or debris can be counted; marks and human review are required. A zero estimate is not proof of an empty container. Results on generated circles do not establish real-bead or larvae accuracy. See [method and verification](vercel-counter.md).

The optional **Firebase vision model** engine retains its separate adapter and managed-model checks. The 8 GB laptop remains unsupported for Chrome's managed model; no different device or upgrade is assumed. The small CV worker and numeric ML do not require that model. Neither is an on-device LLM.

## Optional Firebase adapter (deferred)

**The current delivery preserves this connector without configuring or demonstrating it.** Step 6D reviews the inactive boundary and labels; it does not establish a working provider connection. The small counter defaults to Vercel with browser fallback and never falls back to Firebase. Saved settings and engine selection are separate; see [6D evidence](wolbachia-step-6d.md).

The following setup applies only if Firebase activation is chosen later:

1. Create/select an authorized Firebase project and registered Web app using the supported operations available then. See [deferred connection options](firebase-connection-options.md).
2. Enable Firebase AI Logic and a supported image-capable cloud model.
3. Set up App Check with reCAPTCHA Enterprise and allow the deployed domain.
4. Enter the public Firebase web configuration, public App Check site key and model ID in **Data & settings**, or use the public variables in [.env.example](../.env.example).
5. Later, select the Firebase image method and run **Count this image** on a saved image and verify the real response, model/source label and App Check behavior. The adapter is implemented, but this live test is still pending. **Saving settings does not verify a connection.**

Never enter service-account keys or App Check debug tokens into the form or repository. For local development only, `VITE_APPCHECK_DEBUG=true` is honored by the existing AI module in Vite development mode; register the generated debug token privately in Firebase Console. Hosted builds require the production provider.

## Data and storage

- `src/lib/dashboard.ts` defines the fictional locations, synthetic weekly case counts, sample observations and validated dashboard-state reader.
- Reviews and manual follow-up choices use `wolbachia-field-review:workspace:v1` in localStorage. Old workshop drafts are kept separate.
- Original fixture estimates remain available after correction; rejected observations have no reviewed numeric count.
- CSV exports include the synthetic dataset ID and provenance.
- Imported photos use a separate IndexedDB records/image store; queue reads load metadata only and the selected image is decoded for display. Import checks the image signature, dimensions, file size and SHA-256 hash. The original is saved without resizing.
- A fresh computed count appends a result instead of replacing prior estimates. It invalidates the previous review for the new analysis version; old reviews remain in history. Wrong-image hashes, stale reviews and cancelled late results are rejected.
- A model unable to count returns a null estimate rather than an invented zero. Corrections and rejections require a reason. CSV exports preserve upload/model/manual provenance; the JSON audit includes all analyses/reviews but no image bytes.
- Study plans, pinned datasets, calculations and reviews use their own `wolbachia-field-review:studies:v1` IndexedDB database. Reviewer labels and timestamps are locally entered/generated, not authenticated external certification or preregistration. Export the full JSON audit with the readable methods report; neither includes image bytes. Optional 4C model histories preserve fitted parameters, fixed protocol, exact train/test partitions, scores and metrics. Reviews also bind the current model-run ID; rerunning invalidates the current review without deleting it.
- Inspection plans and all decision versions use their own `wolbachia-field-review:inspection-plans:v1` IndexedDB database. Full exports contain pinned QA/study/model context and rule versions, not image bytes. Reviewer and assignee labels are self-entered. Clearing browser data removes these records.
- Saved image tests do not change the synthetic case charts. Numeric QA/study evidence supports inspection planning; photo records are not automatically linked or treated as biological outcomes. Resetting demo edits does not delete saved photo records.
- The built service worker caches the app and worker assets. Data & settings checks complete preparation for the current build. Cold offline reopening, local counting/review/export, a second browser restart and reconnection passed in the [step 6B browser tests](wolbachia-step-6b.md); the owner-operated laptop check remains deferred. A prior saved result alone does not demonstrate offline execution.

## Capacity and local-AI learning

**Check this browser** reads approximate browser RAM, logical processors, site storage use/quota and text-model availability on your click. Free system RAM is not exposed, site quota is not free disk, and the report stays in the browser.

The owner-run [terminal readers](capacity-routing.md) and [Qwen learning exercise](local-qwen.md) remain available separately. The [measured Qwen experiment](qwen-memory-benchmark.md) used about 573–575 MiB peak process RAM in Linux. It does not establish Chrome-model eligibility or native Windows performance, and the website has no terminal-model endpoint.

## Next stages

1. Test prepared bead photographs against independently checked counts; report errors, refusals and sensitivity to lighting/settings.
2. Rehearse the public demo, exports and study/inspection flow; retain synthetic/proxy labels.
3. Keep the optional Firebase connector inactive and unverified for the current delivery. Revisit provider setup and current contest requirements only if Firebase activation is chosen later; connector code alone does not establish eligibility.
4. Consider shared Supabase storage only when cross-device/team records are needed. Numeric model improvement still requires reliable labels, explicit retraining and fresh held-out evaluation; the current 60% versus 70% synthetic result is unchanged.

See [step 1 scope](wolbachia-step-1.md), [step 2 implementation notes](wolbachia-step-2.md) and [step 3 implementation/test boundary](wolbachia-step-3.md). Historical workshop setup notes are archived [here](legacy-workshop-readme.md).

## Deploy

`vercel.json` builds the Vite interface and the bounded `api/count-image.ts` Node function. Use Node 22 and `npm ci`, then `npm run build`; no Firebase environment variables are needed for this route. Vercel quotas still apply. The function performs CPU-only image processing, does not store images and does not call an LLM. Best-effort per-instance request limiting is a demo guard, not distributed quota enforcement.

The tracked Site manifest preserves the private static review deployment. That host has no Node counting API, so use the explicitly permitted browser fallback or device-only mode. Firebase Hosting configuration is retained for an optional future route, not required for the current product.

The GitHub repository is public (metadata checked 27 November 2026). Source visibility and a public demo do not establish Firebase contest eligibility; any required integration and current submission rules need their own verification if that judging track is pursued.

## License

Application code and authored demonstration material: MIT. llama.cpp and Qwen retain their upstream licenses.

## Separate photo references and practical trial preparation

Step 6C adds reference declarations and a scoped descriptive error report in Image review. Unknown counts, exclusions, duplicates, repeated setups and method/settings groups remain explicit. Human corrections do not overwrite computed estimates. See [6C notes](wolbachia-step-6c.md) and the [deferred owner checklist](field-trial-checklist.md). Real-photo and field usefulness remain unverified until owner evidence is collected.
