# Small image counter: Vercel and browser routes

Updated 22 November 2026 (WIB), release 0.8.0.

## Scope

The product can run without Firebase, App Check, Google Cloud billing or a model API key. Vercel hosts the interface and a CPU-only image-processing function. The same deterministic counter can run in a browser worker. Numeric logistic training/evaluation, QA/study records and inspection planning retain their existing browser-local behavior.

This is classical computer vision: colour/luminance selection, 8-connected components, approximate-roundness/area checks and human review. There are no learned weights, LLM tokens or automatic learning. This release does not replace a validated biological detector. Real larvae are rejected by this method. The optional Firebase vision adapter remains separate and unverified.

## Image flow and audit

1. Save the original image and metadata in browser IndexedDB, or explicitly generate the eight-circle proxy. Generated images are labelled `generated_proxy` with a construction reference, never uploaded field observations. The counter receives pixels, not the reference count.
2. On Count, verify the original SHA-256, decode and reduce a copy to a longest side of 768 pixels; retain original bytes separately. Count-area percentages, foreground, threshold and pixel-area limits are explicit controls.
3. Follow the selected only/first/fallback policy. Device-only never invokes the service. Vercel receives reduced RGB pixels, settings and fingerprints, not case records, reviewer labels or coordinates. No image is automatically uploaded on import.
4. Record method/version, actual runtime, requested policy, elapsed time, reduced-pixel SHA-256, exact settings and accepted/rejected boxes. Wrong-image or invalid response evidence is an error rather than a reason to substitute a fallback answer.
5. Save a distinct human review. New analyses require fresh reviews while preserving earlier results and reviews. CSV and full JSON retain method, runtime and provenance. JSON includes marks/settings but no image pixels.

The example contains eight drawn discs. Its count verifies a controlled pixel-processing path; it does not estimate accuracy on real beads, larvae, container contents, infection, emergence or dengue impact. Touching beads can merge, debris can pass shape filters, and glare/shadows can alter counts. Inspect the displayed regions and test prepared photos against independent reference counts.

## Limits and safeguards

The API accepts bounded RGB input (at most 768 × 768, about 1.77 MB raw RGB and 2.36 MB base64), with a 2.4 MB request cap before JSON parsing. The core uses bounded image/visited/queue arrays, not a multi-gigabyte language model. Original image decoding and browser overhead are additional; no exact system spare-RAM guarantee is inferred. A 768-pixel copy can miss tiny objects.

Any detected boundary-clipped, irregular or oversized candidate, >45% foreground coverage, or >250 candidates produces an unaccepted/null count. Small components below the selected minimum are omitted. These are illustrative image heuristics, not published biological thresholds. Zero accepted candidates yields zero with an explicit warning that it does not prove an empty container.

The Vercel function has a ten-second maximum duration, no image storage/logging or third-party model request, no cross-origin browser access, and best-effort per-instance 12-count/minute/IP limiting. In-memory limiting is not a global production quota or proof against determined abuse; Vercel execution quotas still apply. The worker has a 15-second timeout and is terminated on cancellation; cloud work already sent may still finish. Errors and unsupported methods remain visible. No credentials are created.

The service worker caches built UI/worker assets. Browser-only counting needs no model service. Cold offline reopening and execution require a separate real disconnected-device test; successful online worker execution is not proof of that scenario. This path does not make Chrome's managed model eligible on the supplied laptop and is not on-device LLM inference.

## Hosting

`vercel.json` uses Vite and builds `api/count-image.ts` as a Node function. Node 22, `npm ci` and `npm run build` are sufficient; no environment variables are required for this method. Vite's development-only adapter labels results `development-server`, never Vercel. The private static Site has no Node API: choose device-only or explicitly permit browser fallback there. Existing Site audience is preserved.

Supabase is optional future shared storage and user access, not required for image computation. No existing data are migrated by this release. Firebase contest requirements are separate; a Vercel CV result does not satisfy mandatory Firebase AI Logic/App Check integration.

## Verification

The compiled-server smoke check emits the Node API and its shared module as JavaScript, imports the emitted entrypoint and counts a real pixel request. Relative TypeScript imports are rewritten to the emitted JavaScript extensions, preventing the initial production module-resolution error.

The automated suite covers known dark/light/colour pixel examples; ROI; zero warnings; clipped/oversized refusal; bounds and larvae rejection; cloud/device-only and allowed fallbacks; cancellation and integrity errors; actual HTTP pixel computation and hashes; invalid/oversized/cross-origin requests; demo rate limiting; and generated-proxy/runtime history through reopening and export. Existing QA, study, model and inspection tests remain in the suite.

All 97 automated checks and the TypeScript/Vite production build passed. Preview browser QA counted all eight generated objects through both the actual development HTTP handler and the browser worker; their distinct runtime labels were preserved. A reviewed zero correction survived reload, a rerun retained history and required a fresh review, and the displayed region boxes matched the example. With counting controls expanded in a 390 px frame, usable/document/body widths were all 375 px with no page overflow. The responsive harness was removed before packaging. Production verification is reported with the deployment result. Real-photo error measurements, biological validation and cold offline reopening remain pending.
