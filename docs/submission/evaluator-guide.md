# Evaluator instructions

## Access and expected setup

- [Public app](https://workshop-ready-theta.vercel.app/#overview)
- [How to use](https://workshop-ready-theta.vercel.app/#guide)
- [Public source and MIT licence](https://github.com/wilisail/workshop-ready)

Use a supported browser with JavaScript, browser storage and internet for the first visit. The small worker uses normal browser image/worker APIs; it does not need Chrome's managed language model. The demo has no app sign-in, subscription or provider-key requirement. Stored records belong to the browser/profile used for testing. Built-in examples are explicitly synthetic or generated proxies.

## A short connected review

1. Open **Data & settings**. Select **Small bead counter · no Firebase** and **Prefer Vercel, allow browser fallback**. Click **Check bead service**. A successful response identifies the hosted service at that moment; the Browser online label alone is not a service test.
2. Open **Image review → Your image tests**. Click **Load eight-bead example**, then **Count this image**. The current generated image has eight drawn objects; the counter reads the pixels rather than receiving that construction count. Inspect the actual returned number and regions.
3. Read the actual source. **Counted on Vercel** identifies the hosted Node function. A service failure can use the permitted worker and must instead show **Counted in this browser**. Do not interpret a local fallback result as hosted execution.
4. Enter a checked count and reviewer label, then **Save human review**. A correction or rejection needs a reason. Export **image records** or **audit JSON**; original computation and review history stay separate.

The **Demo examples** tab contains predefined estimates. Use **Your image tests** for fresh computation. The generated example cannot establish prepared-photo accuracy; the prepared-photo report correctly remains pending without qualifying uploaded photos and separate references.

## Offline review

1. While connected, open **Data & settings**, click **Prepare offline use**, and wait for **App assets prepared on this browser**. Refresh/reprepare after an app-version change if requested.
2. Disconnect this test browser/device from the network and reopen the same app link in the same browser/profile. Initial preparation is essential. A new unprepared browser cannot open the app for the first time offline.
3. Run a **new** bead count, save a human review and export. Confirm the new result's time and browser execution source. Old saved results alone do not prove disconnected computation.
4. Reconnect and request a new cloud-first count. Inspect its actual source. Records remain local; this does not perform automatic database sync.

**Vercel only** stays blocked when unreachable. **This device only — no image upload** forbids hosted counting. The [full user guide](../user-walkthrough.md) covers cache/storage recovery. Audits omit original image bytes and are not a general restore/import format.

## Public-health workflow rehearsal

| View and controls | Inspect |
| --- | --- |
| Container QA → Load synthetic examples → Export all QA history | Three synthetic example records; origin, source, stage context, unknown versus zero, separate outcome assessments and revision history |
| Study & review → Create synthetic study example → Run descriptive / readiness check | Four complete pairs, one unknown pair, one exclusion; descriptive MAE 1.25 objects. Record a review comment, then export the full study audit. These are fixture inputs, not real photograph measurements. |
| Trends & modelling → Create synthetic prediction example → Train and evaluate | Actual local fitting and untouched held-out predictions. Model accuracy 60%; constant baseline 70%; the model misses all three failed test containers. Open this study and review to retain a comment tied to that model version. |
| Inspection planning → Generate inspection queue using the synthetic QA origin | Pinned source revisions and reasons; accept/defer/dismiss with the required labels, reason and dates. Export inspection audit and reload to inspect persistence. |

The public-health rehearsal is for software evaluation. Real biological images are manual-review material for this counter. Bead counts are not copied into biological stages, and photographs do not establish species, infection, emergence or dengue impact. Model scores/case charts do not rank the current rule-based inspection queue. Decisions are browser-local records and send no notification or physical instruction.

## Provider disclosure

Firebase remains optional, inactive by default and unverified. Leave its configuration blank for this review. Its presence is not a claim of a working Firebase project, on-device generative inference or contest compliance. Shared Supabase/Firebase storage, field cameras and an intranet service are not connected in this release.
