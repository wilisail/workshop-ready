# Step 6E: connected and offline user walkthrough

Updated: 27 November 2026 (WIB).

The three delivery goals remain **network visibility**, **public-health collection/review**, and **cloud-first processing with useful local fallback**. The current fallback is small classical CV and local numeric computation, not an on-device LLM. Firebase stays optional and unverified. Owner-operated laptop, photo, field and clarity checks remain deferred.

## Delivered walkthrough

- **How to use** is an application view at `#guide`, reachable from both navigation bars and **Read the walkthrough** on Overview. Direct opening and reloading retain the guide view.
- Six plain-language steps cover preferences/service checking; a computed bead example and human review; preparation, offline reopening and reconnection; later photo references; QA/study/inspection decisions; and the optional numeric ML exercise.
- Links open the relevant workspaces. Guide image links explicitly select **Your image tests**, even if the visitor previously chose **Demo examples**; that keeps predefined fixture estimates separate from the computed exercise.
- The guide uses semantic headings, an ordered sequence, native disclosure controls, descriptive links, visible keyboard focus and a layout that stacks on narrow screens. It does not add mandatory onboarding, automatic counting or a checklist that pretends to verify work.
- The [portable Markdown walkthrough](user-walkthrough.md) matches the button names and evidence boundaries in the app. README and the technical guide link to it and the live guide.

## Evidence boundaries

Instructions keep connection hints, checked service access and actual execution separate. They explain initial connected preparation, the same-browser/profile requirement, cloud-only/device-only restrictions, retained originals/history, and reconnecting without shared database sync. Exported audits omit photo bytes and are not a general restore/import system.

Generated examples, uploaded synthetic diagnostics, prepared-photo declarations and actual QA observations keep their own labels. Unknown differs from zero, human corrections differ from separate references, and the 60% versus 70% synthetic model comparison is reported as an exercise. No biological detection, infection, emergence, dengue impact or actual field usefulness is claimed.

## Verification

The new controlled browser scenario follows the walkthrough at a 390 px viewport: keyboard entry from Overview; deep-link reload; correct defaults; connected count; returning from fixture examples to computed image tests; cached offline guide reopening with a failed uncached API request proving disconnection; keyboard disclosure; no page overflow; a fresh local count, human review and audit export; and navigation into QA, study, inspection and modelling workspaces while offline.

**121 automated tests, the compiled Node API smoke check and the production build passed locally.** All ten existing browser scenarios and the new walkthrough scenario passed. The offline guide check reloads the document to prove a cached load, rather than relying on an in-document hash change. Keyboard/mobile checks cover these demonstrated paths; no full accessibility certification or owner clarity approval is implied.

## Release evidence

- Source release: [`8ca9f9940aab5e52242c8435fd2af8f61eb301dc`](https://github.com/wilisail/workshop-ready/commit/8ca9f9940aab5e52242c8435fd2af8f61eb301dc).
- [GitHub CI run 45956997892](https://github.com/wilisail/workshop-ready/actions/runs/45956997892) passed all 121 automated tests, the compiled Node API smoke check, production build and eleven Chromium browser scenarios.
- Vercel production deployment `dpl_5hAw2bdAQFnMZGap9Zydn1QHs8xv` reached **READY** for that source commit. The public [How to use view](https://workshop-ready-theta.vercel.app/#guide) was opened and checked on 27 November 2026 (WIB).
- The live guide displayed all six steps and the three goals. Its processing-settings link opened the expected panel, showing the small counter, cloud-first preference, **Inactive · not configured** Firebase connector and **10/10 assets saved**. Its image-test link selected **Your image tests** with the saved generated examples; prepared-photo measurements stayed pending. The guide was kept open for review.
- Deployed offline build `4ec87068b33c` matched the locally tested build. Full disconnected walkthrough behaviour is covered by the controlled browser scenario; the live asset confirmation is not an owner-operated laptop check.

The 6E software walkthrough and release are complete. Actual laptop/photo/field/clarity evidence remains deferred. No live Firebase request, actual field observation or external submission was made during production verification.

## Next

The owner's **10–15 minute clarity check** stays in the later owner block. Step 7 remains the demo sequence, narration, end-to-end evaluator review and submission package. No external submission or message is sent by step 6E.
