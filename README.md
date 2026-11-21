# Wolbachia Field Review

A cloud-first research prototype for reviewing release-container observations, exploring case trends and preparing follow-ups.

The repository remains `wilisail/workshop-ready`. **Step 3 implementation is ready:** saved image observations, guarded Firebase image-counting adapters and append-only analysis/review history are implemented. Your real-photo tests and live Firebase verification are deferred. Evaluated ML and generated planning recommendations remain future work.

The current presentation follows a Lotus Notes-inspired workbench: muted blue/lavender and gray, working view tabs, compact panels and table grids. The [updated workplan](docs/wolbachia-updated-plan.md) refocuses the next stages on container quality assurance and a reviewable study workflow. The planned model text reflects that scope; the model and study features are still pending.

## Try the current interface

The existing private review deployment is https://workshop-ready-wili.williworkmail.chatgpt.site. It retains its existing access restrictions and is not yet a public judging URL.

| View | Available in this build |
| --- | --- |
| Overview | Location/date filters, calculated sample totals, weekly case chart, review progress and pending observations. |
| Image review | Saved original photos, image-specific routing checks, Firebase counting adapter, validated human review and audit history; demo fixtures remain on their own tab. |
| Trends & modelling | Observed changes, case comparison, accessible chart-data table and explicit not-run states for the planned model and hypothesis tests. |
| Field planning | Sample location signals and a manually selected demo follow-up list. |
| Data & settings | CSV exports, reset of demo edits, four processing preferences, read-only capacity check and Firebase configuration form. |

Use **Image review → Your image tests → Add an image** to save a still JPG/PNG/WebP (up to 8 MB / 16 megapixels), container ID, date, target kind and fictional demo location. Manual review works immediately without Firebase. Original image bytes and all analysis/review versions are saved in IndexedDB on this browser; clearing browser data removes them. They are not synced across devices. **Demo examples** contains the separate predefined illustrations and fixture reviews used by the synthetic overview.

All sample estimates are fixtures. The illustration guides are reference positions, not detections. Charts and percentage changes are calculated from the synthetic records; no trained model or causal efficacy finding is implied.

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

1. Create/select a Firebase project and register a Web app.
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
- Saved image tests do not change the synthetic case charts. Combining them with planning/model features belongs to the next analysis stage. Resetting demo edits does not delete saved photo records.
- The built service worker retains the application-shell caching mechanism. Reopening the deployed app offline still needs verification; a saved review is not offline AI generation.

## Capacity and local-AI learning

**Check this browser** reads approximate browser RAM, logical processors, site storage use/quota and text-model availability on your click. Free system RAM is not exposed, site quota is not free disk, and the report stays in the browser.

The owner-run [terminal readers](docs/capacity-routing.md) and [Qwen learning exercise](docs/local-qwen.md) remain available separately. The [measured Qwen experiment](docs/qwen-memory-benchmark.md) used about 573–575 MiB peak process RAM in Linux. It does not establish Chrome-model eligibility or native Windows performance, and the website has no terminal-model endpoint.

## Next stages

1. Your deferred real-photo tests, Firebase/App Check configuration and live inference verification.
2. Container-QA records and guided study setup/review, followed by an evaluated container-performance ML example.
3. Evidence-linked inspection priorities, human decisions and study/report export.
4. Live Firebase/App Check and task-specific routing verification on the deployed domain.
5. End-to-end checks, public judging access, current contest-rule review and demonstration recording.

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
