# Step 6A: observable network and execution paths

Updated: 26 November 2026 (WIB).

Scope: the network goal in the [current delivery plan](remaining-steps-and-goals.md). Owner-operated checks are deferred until implementation is ready. Firebase stays an optional, unverified connector.

## Implemented

- A **Network & processing** panel appears in Data & settings and in the saved-image workspace.
- The browser's connection hint is explicitly separate from service reachability. A connected LAN can still have an unavailable public service.
- **Check bead service** issues `GET /api/count-image` with no photo or record body, no application credentials, no response cache and no redirects. The read-only endpoint does not consume the POST counting allowance or call an AI provider. Normal hosting/request quotas still apply.
- A successful check requires JSON with the expected counter engine/version, bounded image size, supported bead-proxy kind and known runtime. A sign-in page, wrong method/version, non-2xx status, network error or eight-second timeout cannot appear as a verified service.
- The check retains its timestamp, elapsed time and Vercel/development runtime distinction. An online/offline event clears the result and cancels any pending probe. Leaving the view also cancels the probe without reporting an outage.
- Local readiness is labelled as browser API support, not proof of running a worker or reopening without internet.
- Saved-image diagnostics show the last count's retained execution evidence. Selecting a preference does not relabel an older result.
- Browser-local storage, optional Firebase status and absence of shared sync remain explicit.
- README and the original black-on-white network SVG/DOT/Mermaid sources describe the service check and actual image path.

## Actual paths

| Path | Payload / processing | Persistence |
| --- | --- | --- |
| Staff browser → hosted Vercel UI | Built HTML/CSS/JS/worker assets | Service-worker asset cache exists; full offline acceptance is step 6B |
| Browser → `GET /api/count-image` | Counter metadata only; no pixels or inference | Last-check state in the open panel |
| Browser → `POST /api/count-image` | Reduced RGB copy, options, original/pixel fingerprints; deterministic bead CV | Result returned to browser; no server image archive |
| Browser → local Web Worker | Pixels transferred inside the browser; same deterministic bead CV | Result saved on the device |
| Browser → IndexedDB/localStorage | Original photos, analyses, human reviews and workspace records | Local to this browser/profile; exports available |

The four existing policies remain: cloud-only, cloud-first with permitted worker fallback, device-first with permitted service fallback, and device-only with no image upload. Invalid/wrong-image evidence is a visible failure rather than an excuse to substitute a fallback result. A development endpoint reports `node-preview`, never Vercel.

The small image counter accepts separated bead proxies only. The local numeric model is experimental. Neither is a validated biological detector or a general-purpose local LLM.

## Verification

- **104 automated tests passed**, including seven new tests for real metadata handling, request privacy, distinct runtimes, bad HTTP/HTML/metadata responses, malformed JSON, network failure, timeout, cancellation and source labels.
- The compiled Node API smoke check and TypeScript/Vite production build passed.
- Browser/deployment verification is recorded below after execution.

## Deferred owner check

After the implementation block, open Data & settings on Wili's laptop, press **Check bead service**, and confirm the last-check time and runtime. In Image review, run the generated proxy once through the hosted route and once in device-only mode; retain their distinct execution labels. This takes approximately 10–15 minutes and is **pending**, not a condition for completing independent implementation.

Full cold offline reopening, local counting/review/export and recovery after reconnect belong to step 6B. Real-photo errors and a practical public-health observation trial belong to 6C. Field gateways, intranet installation, MQTT/LoRaWAN ingestion and shared institutional storage remain reference/future components.
