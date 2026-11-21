# Wolbachia Field Review

A cloud-first research prototype for reviewing release-container observations, exploring case trends and preparing follow-ups.

The repository remains `wilisail/workshop-ready`. **Step 5 is implemented:** evidence-linked inspection queues, pinned sources, capacity suggestions, human decisions and report/audit exports. Step 4C retains its small logistic model, two baselines and chronological, held-out evaluation. Real-photo tests and live Firebase verification remain deferred.

The current presentation follows a Lotus Notes-inspired workbench: muted blue/lavender and gray, working view tabs, compact panels and table grids. The [updated workplan](docs/wolbachia-updated-plan.md) refocuses the next stages on container quality assurance and a reviewable study workflow. Numeric model training and study review work without Firebase. A model is fitted only when you select Train and evaluate; no fixture metrics substitute for training.

## Try the current interface

The existing private review deployment is https://workshop-ready-wili.williworkmail.chatgpt.site. It retains its existing access restrictions and is not yet a public judging URL.

| View | Available in this build |
| --- | --- |
| Overview | Location/date filters, calculated sample totals, weekly case chart, review progress and pending observations. |
| Image review | Saved original photos, image-specific routing checks, Firebase counting adapter, validated human review and audit history; demo fixtures remain on their own tab. |
| Container QA | Dated stage counts, batch/location references, condition, temperature provenance, separately entered outcomes, revision history and CSV/JSON export. No Firebase is needed for record entry. |
| Study & review | Counting-accuracy and container-performance planning templates; versioned methods, input snapshots, descriptive/readiness checks, reviewer comments and Markdown/JSON export. |
| Trends & modelling | Actual numeric model training, chronological/grouped evaluation, two baselines, confusion counts, Brier loss, conditional intervals, evidence exports and separate synthetic case context. |
| Inspection planning | Rule-based inspection priorities, pinned QA/study inputs, editable capacity, attributed human decisions, source-change warnings and report/CSV/JSON exports. The earlier manual location demo remains collapsed below. |
| Data & settings | CSV exports, reset of demo edits, four processing preferences, read-only capacity check and Firebase configuration form. |

Use **Image review → Your image tests → Add an image** to save a still JPG/PNG/WebP (up to 8 MB / 16 megapixels), container ID, date, target kind and fictional demo location. Manual review works immediately without Firebase. Original image bytes and all analysis/review versions are saved in IndexedDB on this browser; clearing browser data removes them. They are not synced across devices. **Demo examples** contains the separate predefined illustrations and fixture reviews used by the synthetic overview.

All sample estimates are fixtures. The illustration guides are reference positions, not detections. Charts and percentage changes are calculated from the synthetic records; no trained model or causal efficacy finding is implied.

Use **Container QA → New QA observation** for the new records, or explicitly load the synthetic examples. Blank counts remain unknown; a checked zero remains zero. Temperature sources, emergence methods and operator-entered QA outcomes keep separate labels. Revisions preserve older snapshots and require a reason. Save before leaving the editor. Records use their own browser-local IndexedDB database and do not alter the case charts; export full history to retain a copy. See [step 4A details](docs/wolbachia-step-4a.md).

Use **Study & review → Create synthetic study example → Run descriptive / readiness check** for a reproducible workflow example. It has six fictional observation rows, four complete pairs, three unit references, one missing pair and one excluded duplicate. Mean absolute error is 1.25 objects; unit-balanced MAE is 1.333 objects. These fixture results do not establish biological accuracy.

Choose **New counting study** to enter your own method/reference count pairs, or **New prediction plan** to select matching-origin QA records. Record a dated plan before capturing its input snapshot. Plan amendments, new snapshots and new runs retain their history and need a fresh review. The primary outcome, sampling justification, reference independence, missing-data handling and repeated-unit checks support review; no universal sample cutoff, p-value, power calculation, confidence interval or automatic validity certificate is supplied. The prediction template checks data readiness; it does not train a model. See [step 4B details](docs/wolbachia-step-4b.md).

Use **Trends & modelling → Create synthetic prediction example → Train and evaluate** for the 4C exercise. The generator creates 100 clearly fictional QA records representing 48 repeated container groups plus four exclusion examples. The fixed split uses 35 earlier training groups and 10 later test groups; 55 input rows are excluded with reasons. No image request, Firebase setup, model download or 16 GB machine is required for this small browser computation.

The fixed example is deliberately reported honestly: model accuracy is 60% versus 50% for the inspection rule and 70% for the training-prevalence baseline. All three miss the three failed test containers. These synthetic results demonstrate evaluation, not useful field prediction. Do not interpret the generated relationships as published Wolbachia effects. See [4C methods, results and independent numerical verification](docs/wolbachia-step-4c.md).

Use **Inspection planning → Load synthetic QA examples → Generate inspection queue** to try step 5 without Firebase. Review the reasons and evidence, then accept a task with an assignee and due date, defer it with a next-review date, or dismiss it with a reason. Every decision requires a reviewer label and reason and is retained in history. Assignments are recorded locally; no notification or physical action is sent.

Plans pin their source revisions and selected checks. Source changes block new decisions until the plan is regenerated; the new plan retains a link to the earlier one without copying its decisions. Capacity marks a suggested shortlist while keeping all candidates available. Model evaluations may be retained as historical context but do not rank this queue. See [step 5 methods and checks](docs/wolbachia-step-5.md).

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

No Firebase account or model download is required to import images, save manual reviews or explore the demonstration interface.

## Processing preferences

Cloud only is the default. Data & settings retains these choices:

- Cloud only — default.
- Prefer cloud, allow device fallback.
- Prefer device, allow cloud fallback.
- Device only — no cloud fallback.

The image adapter applies these preferences when you explicitly request an AI count. Cloud-only skips the local availability probe and model preparation. Preference modes route to cloud when an image-capable local model is not already ready. Device-only rejects an unavailable/undownloaded model before making a provider request. No mode starts a managed-model download in this implementation.

The new image check declares image + English text input, separately from the retained text capacity reader. The prepared local image path is implemented but unverified on eligible hardware. The supplied 8 GB laptop remains unsuitable for Chrome’s managed model. Actual cloud/device source is taken from the SDK response; unknown or disallowed sources fail visibly. Manual counting and browser numeric computation are distinct from on-device LLM inference.

## Firebase can be connected later

1. Connect the official Firebase plugin/MCP when available, then create/select a Firebase project and register a Web app using supported authorized operations. See [connection and automation options](docs/firebase-connection-options.md).
2. Enable Firebase AI Logic and a supported image-capable cloud model.
3. Set up App Check with reCAPTCHA Enterprise and allow the deployed domain.
4. Enter the public Firebase web configuration, public App Check site key and model ID in **Data & settings**, or use the public variables in [.env.example](.env.example).
5. Later, run **Request AI count** on a saved image and verify the real response, model/source label and App Check behavior. The adapter is implemented, but this live test is still pending. **Saving settings does not verify a connection.**

Never enter service-account keys or App Check debug tokens into the form or repository. For local development only, `VITE_APPCHECK_DEBUG=true` is honored by the existing AI module in Vite development mode; register the generated debug token privately in Firebase Console. Hosted builds require the production provider.

## Data and storage

- `src/lib/dashboard.ts` defines the fictional locations, synthetic weekly case counts, sample observations and validated dashboard-state reader.
- Reviews and manual follow-up choices use `wolbachia-field-review:workspace:v1` in localStorage. Old workshop drafts are kept separate.
- Original fixture estimates remain available after correction; rejected observations have no reviewed numeric count.
- CSV exports include the synthetic dataset ID and provenance.
- Imported photos use a separate IndexedDB records/image store; queue reads load metadata only and the selected image is decoded for display. Import checks the image signature, dimensions, file size and SHA-256 hash. The original is saved without resizing.
- A fresh AI count appends a result instead of replacing prior estimates. It invalidates the previous review for the new analysis version; old reviews remain in history. Wrong-image hashes, stale reviews and cancelled late results are rejected.
- A model unable to count returns a null estimate rather than an invented zero. Corrections and rejections require a reason. CSV exports preserve upload/model/manual provenance; the JSON audit includes all analyses/reviews but no image bytes.
- Study plans, pinned datasets, calculations and reviews use their own `wolbachia-field-review:studies:v1` IndexedDB database. Reviewer labels and timestamps are locally entered/generated, not authenticated external certification or preregistration. Export the full JSON audit with the readable methods report; neither includes image bytes. Optional 4C model histories preserve fitted parameters, fixed protocol, exact train/test partitions, scores and metrics. Reviews also bind the current model-run ID; rerunning invalidates the current review without deleting it.
- Inspection plans and all decision versions use their own `wolbachia-field-review:inspection-plans:v1` IndexedDB database. Full exports contain pinned QA/study/model context and rule versions, not image bytes. Reviewer and assignee labels are self-entered. Clearing browser data removes these records.
- Saved image tests do not change the synthetic case charts. Numeric QA/study evidence supports inspection planning; photo records are not automatically linked or treated as biological outcomes. Resetting demo edits does not delete saved photo records.
- The built service worker retains the application-shell caching mechanism. Reopening the deployed app offline still needs verification; a saved review is not offline AI generation.

## Capacity and local-AI learning

**Check this browser** reads approximate browser RAM, logical processors, site storage use/quota and text-model availability on your click. Free system RAM is not exposed, site quota is not free disk, and the report stays in the browser.

The owner-run [terminal readers](docs/capacity-routing.md) and [Qwen learning exercise](docs/local-qwen.md) remain available separately. The [measured Qwen experiment](docs/qwen-memory-benchmark.md) used about 573–575 MiB peak process RAM in Linux. It does not establish Chrome-model eligibility or native Windows performance, and the website has no terminal-model endpoint.

## Next stages

1. Live Firebase/App Check and task-specific routing verification on the deployed domain (step 6), alongside your deferred real-photo tests.
2. End-to-end checks, public judging access, current contest-rule review and demonstration recording (step 7).
3. A separate future model-improvement experiment: fuller exploratory data analysis, suitable standard-library candidates, reliable field labels and new held-out evaluation. No stronger model or automatic learning is claimed by this release.

See [step 1 scope](docs/wolbachia-step-1.md), [step 2 implementation notes](docs/wolbachia-step-2.md) and [step 3 implementation/test boundary](docs/wolbachia-step-3.md). Historical workshop setup notes are archived [here](docs/legacy-workshop-readme.md).

## Deploy

The tracked hosting manifest retains the existing private Site identity. `firebase.json` also supports Firebase Hosting after project setup:

```sh
npm run build
npx firebase-tools login
npx firebase-tools deploy --only hosting --project YOUR_PROJECT_ID
```

Neither the current private repository nor the private review deployment should be presented as a public submission. Local/offline AI and contest eligibility remain unverified.

## License

Application code and authored demonstration material: MIT. llama.cpp and Qwen retain their upstream licenses.
