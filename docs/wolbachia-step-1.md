# Step 1 — Wolbachia dashboard baseline and migration scope

Date: 21 November 2026 (WIB).
Repository: https://github.com/wilisail/workshop-ready
Audited GitHub commit: 8b13b0c231fbe4eee4484b65724ab631d62dcbe1
Verified source tree: c245f2b5d6813584de34bd05698ab9544db491b9

## Decision

Keep the existing repository and React/Vite/TypeScript stack. Develop a cloud-first Wolbachia release-container review and planning dashboard. The submission demonstration will use prepared images of beads as larva proxies, synthetic health records and mock locations. Physical cameras, firmware and field deployment belong to a later phase.

Working product name: **Wolbachia Field Review**. This does not rename the repository or the deployed site.

Step 1 audits the existing application and fixes the implementation scope. The running application remains the workshop-note prototype at this milestone.

## Verified baseline

The existing Sites source checkout and GitHub main have different commit histories but the same complete source-tree hash listed above. The audit therefore covers the source actually present in both, without treating matching files as evidence of live inference.

| Area | Present in source | Migration decision |
| --- | --- | --- |
| Application | React 19, Vite 7, TypeScript; static deployment | Keep the stack and hosting configuration. |
| Processing choices | Cloud only, cloud preferred, device preferred, device only | Keep the choices, but evaluate capability for each task and input modality. |
| Routing | Cloud default; no local preparation in cloud-only; local-only rejects cloud responses | Preserve these guarantees and actual execution-source reporting. |
| Firebase | AI Logic and App Check code; settings form; public build-time configuration | Reuse initialization and configuration patterns. Actual project connection and live requests remain unverified. |
| Device reader | Approximate browser RAM, logical processors, site quota and text-model readiness | Keep the limitations visible. Site quota is not free disk; exact available system RAM is not exposed by this browser reader. |
| Terminal reader | Owner-run Node and PowerShell capacity tools; guarded Qwen launcher | Retain as separate learning/diagnostic tools. They do not provide a model endpoint to the website. Native Windows guard behavior remains unverified. |
| Drafts and offline shell | Local text draft, saved settings, generated service worker | Reuse the shell; introduce separate versioned storage for dashboard records and images. |
| Current business logic | Text prompt and Ready/Blocked/Next actions parser | Replace with image review, structured observations, numeric analysis and planning outputs. |
| Sample mode | Explicit no-AI sample result | Preserve truthful sample labels; distinguish fixtures from live model results. |
| Visual design | Warm colors, decorative serif heading, three pastel result cards | Replace in step 2 with a restrained operational dashboard. |
| Checks | 14 tests for routing, execution-source checks and text parsing | Keep relevant routing coverage; add meaningful domain evaluation when the corresponding features exist. |

Existing implementation points:

- `src/App.tsx`: current UI, request state, device report and Firebase settings dialog.
- `src/lib/ai.ts`: Firebase initialization, App Check, text-only request and response handling.
- `src/lib/capacity.ts`: browser readings and inference routing.
- `src/lib/notes.ts`: existing text schema, parser, sample and source validation.
- `src/lib/storage.ts`: existing draft/configuration storage.
- `src/styles.css`: current visual treatment to replace.
- `vite.config.ts`: offline shell generation.
- `scripts/` and existing Qwen documents: retain for local-inference learning.

No image ingestion, object-counting request, health-data import, trained planning model, hypothesis test, review audit trail or Wolbachia dashboard exists at this baseline.

## Approved demonstration workflow

1. Load a prepared bead photo or choose a clearly labelled sample image.
2. Associate it with a mock release-container ID, location and observation date.
3. Use cloud image analysis after Firebase configuration; return an estimated visible-object count and quality warnings.
4. Show the image and estimate for human correction or rejection. Preserve the original estimate alongside the reviewed count.
5. Combine reviewed observations with dated synthetic dengue and intervention records.
6. Calculate observed changes and run a small, evaluated prediction example.
7. Rank candidate locations for follow-up, inspection or additional deployment review, with reasons, uncertainty and human approval.
8. Export a report that retains data provenance and distinguishes demonstration findings from field evidence.

The specimen image is a bead demonstration, not biological validation of larva detection. Image estimates must not be presented as measurements of Wolbachia infection or confirmed adult emergence.

## Dashboard structure for step 2

| View | Main content |
| --- | --- |
| Overview | Selected area/date, reviewed versus pending observations, data-quality issues, observed case trends and candidate follow-ups. |
| Image review | Prepared image input, container/date/location, estimated count, quality warnings, corrected count, accept/reject controls. |
| Trends and modelling | Time series, observed deltas, declared prediction target, baseline/model comparison and exploratory tests. |
| Planning | Location table/map, prioritisation reasons, missing evidence and approval state. |
| Data and settings | Synthetic-data labels, import/export, Firebase connection and processing choices. |

Use dark slate navigation, white/slate work surfaces, restrained blue/teal accents, compact tables and readable charts. Use ordinary sans-serif type, explicit units, useful empty states and accessible contrast. Desktop is the primary dashboard layout; mobile must remain usable. Do not carry over the decorative workshop-card appearance.

A table of mock locations can precede a map; a real mapping service is not a prerequisite for this demonstration.

## Data contracts to implement

| Record | Minimum fields |
| --- | --- |
| Location | Stable ID, name, mock coordinates, population if rates are calculated, data provenance. |
| Container observation | Stable ID, location/container IDs, observation date, image reference, image kind (bead proxy or real), record provenance. |
| Image analysis | Observation ID, original estimated count or an explicit inability to estimate, quality warnings, model/version, actual inference source, timestamp and elapsed time. |
| Human review | Analysis ID, accepted/corrected/rejected state, reviewed count when applicable, reviewer label, review time and reason for correction. |
| Location-week health record | Location, week, case count, reporting completeness and provenance; optional population and separately sourced laboratory/intervention fields. |
| Model run | Dataset/version, target, features, temporal split, baseline and model metrics, assumptions, sample size and failure/insufficient-data state. |
| Planning suggestion | Location, supporting records, ranked reasons, uncertainty/data gaps, recommended review action and approval state. |

Use separate versioned dashboard storage so old workshop drafts are not silently interpreted as health records. Store images in suitable blob storage rather than placing large base64 files into localStorage. Browser-local records can use IndexedDB initially; shared multi-user storage is a later decision.

## Modelling and evaluation boundary

The numeric calculation and ML model must be separate from the LLM explanation.

- Initial demonstration target: next-week synthetic reported dengue case rate, where population is available; otherwise explicitly use case counts.
- Use only features available at the prediction date. Candidate features include lagged case records, reviewed container observations and dated intervention coverage.
- Compare a small regression model against a simple baseline such as the previous week's value. Use a chronological holdout and report MAE with the target's units. Mark model quality as unknown until evaluated.
- Synthetic data must remain labelled during training, charts, exports and the video. Results demonstrate the pipeline; they do not establish field accuracy or intervention efficacy.
- Exploratory hypothesis testing may examine a declared association. Report the hypothesis, method, assumptions, sample size and effect size alongside any p-value. Repeated observations and spatial/temporal dependence need consideration.
- Neither an association test nor an observed decrease establishes that container deployment caused dengue reduction.
- A planning suggestion must expose its evidence and require human review. Do not manufacture a numerical dengue-reduction promise.

Actual field datasets, biological validation, causal evaluation and researcher feedback are future work. Publication preparation is outside this implementation milestone.

## Runtime and Firebase boundary

Cloud is the default. The supplied laptop remains the same 8 GB Windows device already checked; this plan does not assume a different computer, a RAM upgrade or a rented GPU.

The current browser readiness check and `onDeviceParams` specify **text** input. They do not prove support for image analysis. Before enabling any operation locally, its supported modality must be checked independently.

- Cloud-only must not initialize or download a local model.
- Preference modes may use cloud fallback only because that choice permits it.
- Device-only must never upload an image or record as a fallback. An unsupported image operation should offer manual review or an explicit change of mode.
- Report execution separately for image analysis, numeric/browser computation and LLM explanation. A browser chart or regression is not proof that an LLM ran on the device.
- A future eligible-device implementation is a separate validation task. Do not claim parity with a hypothetical 16 GB computer.
- The Qwen learning exercise remains independent; there is no automatic browser-to-terminal connection in the current code.

Firebase setup can follow the initial dashboard work. Before it is connected, examples must be explicitly labelled sample/no-AI fixtures; imported records can still be inspected and deterministic calculations can run once implemented. Do not display a fixture as a successful cloud AI result.

Later integration must verify a supported vision model, structured image responses, input limits, App Check on the deployed domain and real execution-source reporting. Recheck the contest's current requirements, including expectations for local execution, before claiming submission eligibility.

## Implementation sequence

These estimates retain the agreed planning range; they are estimates, not measured completion percentages.

| Step | Deliverable | Planned hours |
| --- | --- | --- |
| 1 | Baseline audit and migration scope — this document | 1 |
| 2 | Operational dashboard shell, navigation and labelled sample records | 2–3 |
| 3 | Image input, counting adapter and human review | 2–3 |
| 4 | Numeric modelling, observed trends, exploratory tests and evaluation | 4–6 |
| 5 | Location prioritisation, approval and report/export | 2–3 |
| 6 | Real Firebase/App Check connection and modality-aware routing validation | 2–3 |
| 7 | End-to-end checks, deployment accessibility and submission/demo materials | 3–4 |
| Buffer | Fix observed integration, data, model-response or deployment failures | 4–5 |
| Total | All seven steps plus buffer | 20–28 |

Step 2 may use sample data while connection is pending. Step 3 is not complete until the real image-analysis path has been exercised; step 6 includes the deployed-domain check. Buffer is for discovered problems, not additional feature scope.

## Step 1 verification

- Source-tree equality checked against GitHub main.
- `npm ci --no-audit --no-fund`: completed.
- `npm test`: 14 passed, 0 failed.
- `npm run build`: completed (TypeScript check and Vite production build).
- No live Firebase request, local model download, camera connection or mosquito-related field action performed.
- UI and application behavior unchanged in this milestone.
