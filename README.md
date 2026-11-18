# WorkshopReady

Turn messy workshop and offsite notes into **Ready**, **Blocked**, and **Next actions**.

The application supports Firebase AI Logic hybrid inference, with **Cloud** selected by default so a lightweight laptop can be used for setup and demonstrations. Local-model preparation is an explicit choice. Drafts are saved in the browser.

## Current status

- The interface and sample preview work without a Firebase project.
- Firebase AI Logic and App Check integration are implemented. Live Firebase generation is **pending project configuration and end-to-end verification**.
- Chrome local inference is **implemented but unverified**. The current 8 GB development laptop is not eligible for Chrome's managed model.
- A separate CPU-only Qwen learning experiment **was measured successfully** in Linux at about **573–575 MiB peak process RAM**. That is not a Chrome/Gemini Nano benchmark and does not prove Windows performance.
- The sample preview is explicitly labelled **Sample preview — no AI request**. It is not a simulated Firebase response.
- A browser capacity reader and guarded inference routing are implemented. The cross-platform terminal capacity reader was run successfully in Linux; native Windows reporting and the Windows process watchdog remain unverified.

## Run the application

Requirements: Node.js 22.12+ or a supported newer LTS release, npm, and desktop Chrome for the optional local-model path.

```sh
git clone https://github.com/wilisail/workshop-ready.git
cd workshop-ready
npm ci
npm run dev
```

Open the localhost address printed by Vite. Select **Try an example** to inspect the flow. To generate new results, configure Firebase as described below.

```sh
npm test
npm run build
```

## Firebase setup

1. In [Firebase Console](https://console.firebase.google.com/), create or select a project. Start with the Spark plan and a Gemini Developer API model available within its free quota.
2. Add a **Web app**, for example `workshop-ready-web`. Copy its Firebase web configuration.
3. Set up **Firebase AI Logic** with the Gemini Developer API. Check the selected model's current availability and quota.
4. Configure **App Check** using reCAPTCHA Enterprise for a hosted web application. Add the actual application domain and ensure App Check is enforced for AI Logic.
5. Open **Connect Firebase** in the app. Paste the web configuration as JSON, the public reCAPTCHA Enterprise site key, and the selected model name. These settings are saved only in that browser. Alternatively, set the public build-time variables listed in `.env.example`.
6. Generate one note in **Cloud** mode. Verify that a real response is shown with **Processed in cloud**. Merely saving settings is not a successful connection test.

Firebase web configuration and a reCAPTCHA site key identify the application; they are not server credentials. Never put service-account keys or App Check debug tokens into the repository or the settings form.

### Local development App Check

Copy `.env.example` to `.env.local`, fill the Firebase web values and set `VITE_APPCHECK_DEBUG=true`. This flag is only honored in Vite development mode. Register the generated debug token privately in Firebase Console → App Check → Manage debug tokens. Keep App Check enforcement enabled.

The public build always needs a production App Check provider. Do not publish debug tokens or debug builds.

## Processing modes

| UI choice | Firebase mode | Behavior |
| --- | --- | --- |
| Cloud only — start here | `ONLY_IN_CLOUD` | Send the note to the configured cloud model; do not initialize or download the local model. |
| Prefer cloud, allow device fallback | `PREFER_IN_CLOUD` when local is ready | Prefer cloud. Prepare an already-downloaded local model as fallback; otherwise use cloud-only without starting a download. |
| Prefer device, allow cloud fallback | `PREFER_ON_DEVICE` when local is ready | Query readiness on every request. If the model is unavailable or not ready, route straight to cloud without starting a model download. |
| Device only — no cloud fallback | `ONLY_ON_DEVICE` | Await a prepared local model; fail visibly if it is unavailable. No cloud fallback. |

The displayed source is derived from `response.inferenceSource`, not inferred from the requested mode. Firebase SDK v13.4.0 enum values are `on_device` and `in_cloud`. Unknown sources are rejected, and local-only mode rejects a cloud response.

**Check device** queries browser availability without starting a model download. A compatible device may still need to download a model before it can generate locally.

The reader also displays browser-estimated RAM, logical processors, site storage use/quota and a connection hint. These are limited browser readings: free system RAM is deliberately shown as **Not exposed**. A browser permission checkbox cannot reveal an OS API that is not provided. The report is computed locally and is not added to AI prompts or sent to Firebase.

See [capacity readers and routing](docs/capacity-routing.md) for owner-run terminal commands, available-memory percentages and the Windows Qwen process guard. Browser readiness is not a guarantee of spare physical RAM.

## Offline behavior

- Drafts are stored locally and can be edited without internet.
- Production builds generate a service worker that caches the application shell and bundled assets. The page must have loaded successfully online first. Verify reopening offline on the intended deployment; an installed model alone is insufficient.
- Cloud generation needs internet. A queued or saved draft is not an offline AI response.
- Offline device generation requires compatible hardware, a downloaded browser model and a prepared application. This path has not yet been verified in this project.
- Cancellation stops waiting for a response. It cannot guarantee cancellation of server-side processing or charges already incurred.
- External web fonts are optional; system fonts remain available offline.

## Small-model learning exercise

See [the measured CPU experiment](docs/qwen-memory-benchmark.md) and [Windows instructions](docs/local-qwen.md). This separate experiment uses llama.cpp and a small Qwen model. It demonstrates local inference without requiring Chrome's managed model or a GPU.

Model weights and binary downloads are ignored by Git. This exercise does not replace the contest's specified Firebase local-model integration.

## Deploy

The repository includes `firebase.json` for Firebase Hosting:

```sh
npm run build
npx firebase-tools login
npx firebase-tools deploy --only hosting --project YOUR_PROJECT_ID
```

Complete App Check configuration for the hosted domain before testing generation there. A private review deployment may also be available separately; it is not automatically a public judging URL.

## Submission honesty

The demo may show the real cloud path on a laptop without a compatible local model. Describe that accurately. Do not claim local/offline generation was tested unless there is evidence. The app includes a supported local code path; whether a submission without verified local execution meets the organizer's expectations remains unconfirmed.

Before submission: make the repository public, configure and verify Firebase, publish a judging-accessible application, check current contest requirements, and record a short English demonstration. See [the demo outline](docs/demo-outline.md).

## Stack and license

React, Vite, TypeScript, Firebase JS SDK 13.4.0, Firebase AI Logic and Firebase App Check. Application code: MIT. llama.cpp and Qwen retain their own upstream licenses.
