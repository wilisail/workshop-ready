# Wolbachia Field Review

A cloud-first research prototype for reviewing release-container observations, exploring case trends and preparing follow-ups.

The repository remains `wilisail/workshop-ready`. **Step 2 is implemented:** a working dashboard interface using fictional locations, synthetic case records and bead illustrations. Live image AI, evaluated ML and generated deployment recommendations are still pending.

## Try the current interface

The existing private review deployment is https://workshop-ready-wili.williworkmail.chatgpt.site. It retains its existing access restrictions and is not yet a public judging URL.

| View | Available in this build |
| --- | --- |
| Overview | Location/date filters, calculated sample totals, weekly case chart, review progress and pending observations. |
| Image review | Sample illustration, reference guides, searchable/status-filtered queue, validated manual count correction/rejection and browser-local review saving. |
| Trends & modelling | Observed changes, case comparison, accessible chart-data table and explicit not-run states for the planned model and hypothesis tests. |
| Field planning | Sample location signals and a manually selected demo follow-up list. |
| Data & settings | CSV exports, reset of demo edits, four processing preferences, read-only capacity check and Firebase configuration form. |

Use **Image review** to edit a sample count, then return to **Overview**. The totals update and reviews survive a page refresh when browser storage is available. **Preview your image** displays a JPG/PNG/WebP locally in the tab; it does not save, upload or analyse the image, and sample counting/review controls are disabled while the personal image is being previewed.

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

No Firebase account or model download is required to explore the current demonstration interface.

## Processing preferences

Cloud only is the default. Data & settings retains these choices:

- Cloud only — default.
- Prefer cloud, allow device fallback.
- Prefer device, allow cloud fallback.
- Device only — no cloud fallback.

In this milestone these preferences are saved, but the dashboard does not invoke an AI model. The existing Firebase initialization, App Check and guarded text-routing modules remain in the repository for the next integration stage.

Image routing must be validated separately: the existing local browser capability check covers text, not vision. Device-only must never silently upload data. Browser numeric computation is also distinct from on-device LLM inference.

## Firebase can be connected later

1. Create/select a Firebase project and register a Web app.
2. Enable Firebase AI Logic and a supported image-capable cloud model.
3. Set up App Check with reCAPTCHA Enterprise and allow the deployed domain.
4. Enter the public Firebase web configuration, public App Check site key and model ID in **Data & settings**, or use the public variables in [.env.example](.env.example).
5. Verify the real image adapter and a live response after they are implemented. **Saving settings does not verify a connection.**

Never enter service-account keys or App Check debug tokens into the form or repository. For local development only, `VITE_APPCHECK_DEBUG=true` is honored by the existing AI module in Vite development mode; register the generated debug token privately in Firebase Console. Hosted builds require the production provider.

## Data and storage

- `src/lib/dashboard.ts` defines the fictional locations, synthetic weekly case counts, sample observations and validated dashboard-state reader.
- Reviews and manual follow-up choices use `wolbachia-field-review:workspace:v1` in localStorage. Old workshop drafts are kept separate.
- Original fixture estimates remain available after correction; rejected observations have no reviewed numeric count.
- CSV exports include the synthetic dataset ID and provenance.
- Image previews use temporary object URLs and disappear on navigation/reload. Durable images and real observation ingestion belong to the image-workflow stage.
- The built service worker retains the application-shell caching mechanism. Reopening the deployed app offline still needs verification; a saved review is not offline AI generation.

## Capacity and local-AI learning

**Check this browser** reads approximate browser RAM, logical processors, site storage use/quota and text-model availability on your click. Free system RAM is not exposed, site quota is not free disk, and the report stays in the browser.

The owner-run [terminal readers](docs/capacity-routing.md) and [Qwen learning exercise](docs/local-qwen.md) remain available separately. The [measured Qwen experiment](docs/qwen-memory-benchmark.md) used about 573–575 MiB peak process RAM in Linux. It does not establish Chrome-model eligibility or native Windows performance, and the website has no terminal-model endpoint.

## Next stages

1. Real image ingestion and image-analysis adapter, with review provenance.
2. Small ML model, chronological evaluation and properly specified exploratory hypothesis tests.
3. Evidence-linked location suggestions, human approval and report export.
4. Live Firebase/App Check and task-specific routing verification on the deployed domain.
5. End-to-end checks, public judging access, current contest-rule review and demonstration recording.

See [step 1 scope](docs/wolbachia-step-1.md) and [step 2 implementation notes](docs/wolbachia-step-2.md). Historical workshop setup notes are archived [here](docs/legacy-workshop-readme.md).

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
