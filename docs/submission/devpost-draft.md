# Devpost project draft

**Draft only. Not submitted.** The current prototype does not meet the required Firebase integration boundary recorded in [Step 7](../wolbachia-step-7.md#contest-requirements-check). Keep the provider disclosure intact. A portfolio description can use the same factual text without claiming Firebase contest eligibility.

## Project name

Wolbachia Field Review

## Tagline

Cloud-first field review with offline bead counting.

## Inspiration

The project explores how a public-health team could keep release-container observations, reference counts, review comments and inspection decisions understandable when connectivity varies. Its starting point is accountable record keeping: show what was observed, what remains unknown, where processing happened and which decisions a human recorded.

Published Wolbachia research informed the separation of container QA, laboratory infection evidence and epidemiological outcomes. It does not validate this prototype or imply affiliation, endorsement or an absence of existing programme data systems.

## What it does

A small computer-vision counter reads bead-proxy images in a Vercel Node function or a browser worker. The operator chooses the routing policy; saved results identify actual execution, settings and image fingerprints. Human corrections and rejections preserve the computed estimate.

Uploaded images can carry separately obtained reference counts, methods, physical-unit references and amendment histories. The comparison report retains missing/excluded pairs, duplicate images, repeated units and method/settings groups. Generated examples remain outside prepared-photo measurements.

The public-health workspace records dated QA observations with origin/source labels, stages and separately supported outcomes. Study plans retain fixed input snapshots and versioned reviews. A small logistic model demonstrates local fitting and held-out comparison with baselines. Inspection planning creates an evidence-linked, rule-based queue with recorded human decisions.

After connected preparation, the app can reopen without internet, run the small worker, retain reviews and export locally. Reconnecting permits hosted computation again while records stay in that browser.

## How we built it

React and TypeScript provide the workbench, with Vite for the build. The same bounded colour/connected-components counter runs in a Node function and a Web Worker. A service worker caches versioned application assets. IndexedDB/local browser storage retains originals, analyses, QA/study/planning histories and preferences. CSV, JSON and Markdown exports keep their provenance and limitations.

The image counter is classical computer vision, not a trained larvae detector or a language model. The separate numeric ML exercise fits logistic regression in TypeScript and evaluates later, held-out container groups against simple baselines.

## How Firebase AI Logic is used

An optional image adapter and App Check code are retained, but **Firebase AI Logic is not configured or demonstrated in this delivery**. The default hosted method is Vercel CPU processing and its offline fallback is a browser CV worker. This is not a demonstration of Firebase hybrid generative inference or Gemini Nano execution. Retaining the adapter does not satisfy the contest's required integration.

## Challenges

The Chrome-managed model path was unsuitable for the checked laptop. We reduced the image route to a small explicit method, separated execution from network hints, and tested genuine disconnected reopening rather than treating saved results as fresh computation.

Another challenge was keeping evidence types distinct: generated fixtures, uploaded test images, prepared-photo references and operator-entered field observations must not silently become interchangeable.

## Accomplishments

- Hosted/browser processing with explicit routing and retained result evidence.
- Controlled offline reopening, fresh counting, human review, export, browser restart and reconnection.
- Separate reference and review histories with visible missingness and exclusions.
- A complete synthetic QA → study/model review → inspection-decision rehearsal with exported evidence and persistence checks.
- A user walkthrough and public demo with no evaluator login requirement.

These are software results. Actual prepared-photo accuracy, owner-laptop confirmation and practical field usefulness remain pending. The fixed synthetic model scores 60% accuracy versus a 70% constant baseline and misses three failed test containers; no predictive improvement is claimed.

## What we learned

Local execution and hosted execution are deployment choices; model learning is a different question. A useful prototype must also preserve uncertainty, the source of a count, repeated-unit structure and the reason for a human decision. A successful demonstration pipeline does not establish field validity.

## What's next

Run the deferred laptop/photo/workflow checks, obtain independently supported references with domain collaborators, and evaluate usefulness on new observations. Any detector replacement needs appropriate validation. Shared storage, field-device ingestion, intranet deployment and provider activation are separate future work.

## Built with

React; TypeScript; Vite; Node.js; Vercel; Web Workers; Service Workers; IndexedDB; classical computer vision; logistic regression.

Firebase SDK/AI Logic/App Check: **retained optional adapter only, inactive/unverified**. Supabase: **not connected in this build**. No paid LLM API is required for the delivered demonstration.

## Existing work and contribution disclosure

This repository builds on an earlier WorkshopReady notes-prototype scaffold. The current Wolbachia dashboard, counting routes, offline preparation, reference reporting, QA/study/model/inspection workflow and walkthrough are described in the dated step notes and commit history. Legacy text-note code and documentation remain separate from the delivered dashboard. AI-assisted development used Codex. No measured user-adoption, field-deployment or external-validation claim is made. The owner must confirm any additional prior work, contributors and usage details before final submission.

## Links and remaining form fields

- Demo: https://workshop-ready-theta.vercel.app/#overview
- Instructions: https://workshop-ready-theta.vercel.app/#guide
- Repository: https://github.com/wilisail/workshop-ready
- Licence: MIT
- Platform represented by this demonstration: Web browser. This does not assert compliance with the contest's required Web model integration.
- Public YouTube video URL: **PENDING OWNER RECORDING/UPLOAD**
- Entrant/team details: **OWNER TO COMPLETE**
- Final submission URL/confirmation: **NOT SUBMITTED**
