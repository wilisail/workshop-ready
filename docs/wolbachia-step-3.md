# Step 3 — Image workflow implementation

Date: 21 November 2026 (WIB). Version: 0.3.0.

**Status: implementation and engineering checks ready; user photo tests and live Firebase verification deferred.** This milestone must not be described as a verified biological larva detector or a verified offline AI demonstration.

## Delivered

- Separate **Your image tests** and **Demo examples** workspaces. Imported photos are not mixed into the predefined sample estimates or synthetic case charts.
- Original still JPG/PNG/WebP import with container ID, observation date, target kind (bead proxy or larva-like objects) and explicitly fictional location.
- File content/MIME, 8 MB file-size and 16-megapixel dimension checks before decoding; a SHA-256 digest binds analysis results to the saved image.
- IndexedDB metadata and image stores. Imports write both atomically; queue reads avoid loading every image into RAM. Prototype limit: 50 saved images per browser.
- Firebase AI Logic image adapter with App Check, inline image input and a structured JSON count response. Zero and uncountable/null are distinct.
- Cloud-only skips local capability checks/preparation. Other modes check image + text capability. An undownloaded local model is never initialized; local-only refuses instead of uploading. A prepared local path exists in code but remains unverified on eligible hardware.
- Explicit request, cancellation, request IDs and abort-aware persistence prevent stale/cancelled results from replacing another image's state. An already-sent cloud request may still complete and incur provider charges.
- Actual source/model/prompt version, image hash, timestamp, original response, warnings and explanation are preserved in each analysis version.
- Human review keeps original AI estimates intact. Corrections/rejections need a note. New AI analyses require a new review, while earlier history is retained. Manual counts are labelled separately and need no Firebase setup.
- Per-image history, CSV records and JSON audit export; JSON audit excludes image bytes. Demo reset preserves uploaded photo records.

## Engineering verification

- All 36 automated tests and the TypeScript/Vite production build passed.
- Unit/transaction checks cover provider-source guards, unavailable local-only routing, no eager local preparation in cloud-only, cancellation, malformed/contradictory model responses, valid zero/null handling, image limits and format mismatches.
- IndexedDB tests cover persistence through a fresh connection, atomic duplicate failure, image/result binding, stale-review rejection, preserved history and manual/no-AI provenance.
- Browser test imported a controlled 320×240 PNG containing twelve separated circles, saved a manual count of 12, refreshed the page and verified the original image and review history remained available.
- Downloaded browser-generated CSV and JSON were read back: both retained manual count 12, zero AI analyses and no-AI provenance. This is interface/storage verification, not a model-accuracy test.
- The read-only image-model check returned unavailable in the test browser without starting a model download. The saved-image review was checked in a 390px test frame with 375px usable width and no document overflow; the temporary harness was removed.
- The production build and automated checks are run before publication. GitHub CI is checked for the release commit.

## Deferred user checks

These are intentionally deferred; no setup or image upload from the owner is required to finish this implementation milestone.

1. Connect Firebase AI Logic, the selected vision model and production App Check for the deployed domain.
2. Import prepared bead photographs with independently known counts. Request an AI count; compare errors, image quality and repeated runs. Do not use only the included demo illustrations as accuracy evidence.
3. Confirm review corrections, source/model labels, re-analysis history and export on the owner's browser/device.
4. If an eligible local-image device becomes available, separately verify device-only execution and offline conditions. The checked 8 GB laptop has not become eligible through this code change.

The full step 3 acceptance condition still includes a real image-analysis request. Until those checks happen, report the code as implemented and the live image/model behavior as unverified.

## Technical references

- [Firebase: image input and inline request limits](https://firebase.google.com/docs/ai-logic/analyze-images)
- [Firebase: structured multimodal output](https://firebase.google.com/docs/ai-logic/generate-structured-output)
- Installed Firebase JS SDK 13.4.0 declarations were checked for image/text expected inputs, hybrid modes, nullable schemas, response execution source and cancellation.

Images and results are browser-local application records, not a shared field database. Browser storage is not a substitute for a field backup policy; shared collection, actual case datasets, evaluated forecasting and field operation remain later work.
