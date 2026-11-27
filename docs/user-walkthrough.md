# Wolbachia Field Review: user walkthrough

The [live How to use page](https://workshop-ready-theta.vercel.app/#guide) contains the same workflow with links into each workspace. Open it from the **How to use** navigation tab or **Read the walkthrough** on Overview. The guide itself is available offline after app preparation.

You need a supported browser and internet for the first visit. No account, Firebase setup, API key or language-model download is needed for the small bead counter. The three goals are to see where processing runs, keep public-health observations reviewable, and continue useful work locally when internet is unavailable.

## 1. Try a connected count

1. Open **Data & settings**. Choose **Small bead counter · no Firebase**, then **Prefer Vercel, allow browser fallback**. New browsers start with these choices; existing preferences are preserved.
2. Click **Check bead service**. It sends no photo and checks the hosted counter at that moment. The **Browser online** hint alone does not establish service access.
3. Open **Image review → Your image tests**. Click **Load eight-bead example**, then **Count this image**. Loading an example does not run the counter. The **Demo examples** tab contains predefined estimates rather than fresh computation.
4. Inspect the computed estimate, marked regions, warnings and source. **Counted on Vercel** means hosted processing; **Counted in this browser** means the small worker on this device. A permitted fallback stays visible in the result.
5. Enter **Reviewed count** and **Reviewer label**, then **Save human review**. Add a reason if correcting or rejecting. The original computed result stays in history. Use **Export image records** or **Export audit JSON** to retain the record.

The built-in image is a generated bead proxy. Its construction count does not establish accuracy on prepared photographs, larvae detection or public-health outcomes. The local image method is classical computer vision, not a trained larvae model or a local LLM.

## 2. Prepare, disconnect and reopen

1. While connected, open **Data & settings → Prepare for offline use**, click **Prepare offline use**, and wait for **App assets prepared on this browser**. If it reports another version, refresh while connected and check again. Missing assets need reconnection and preparation.
2. Keep the same browser and profile. Disconnect and reopen the same app link. A browser without initial preparation cannot make its first visit offline. Private browsing, clearing browser data or switching profiles can remove or bypass the prepared app and records.
3. Open **Your image tests**. Click **Run a new count** on a saved bead example, or load and count a new example. Check the new result's timestamp and **Counted in this browser** source. Seeing an old saved result alone does not show offline execution.
4. Save a human review, then export locally. The guide remains available at **How to use** if you need the instructions.
5. Reconnect and request a new count with the cloud-first preference. Inspect the actual source; a service failure can still use permitted browser fallback. Reconnection does not upload or sync saved records to a shared database.

| Counting preference | What to expect |
| --- | --- |
| Vercel only | Needs a working hosted endpoint; cannot count while disconnected. |
| Prefer Vercel, allow browser fallback | Tries the hosted method; allows the small worker if that route is unavailable. |
| Prefer this device, allow Vercel fallback | Tries the worker; permits the hosted method if needed and reachable. |
| This device only — no image upload | Runs the small worker without a counting upload or cloud fallback. |

The preference permits a route; the saved result identifies the route actually used. Browser connection hints, service checks and execution labels are separate signals.

## 3. Use prepared photos later

Use **Add an image** to save a prepared bead photo. It saves the original locally without automatically computing a count. Under **Separate reference count**, declare the evidence type, physical setup/unit, separately obtained count, method and counter label. Record independence and whether the counter had seen an estimate honestly. Save the declaration before counting when possible; later declarations are flagged.

Run the counter and save a human review separately. **Photo validation report** compares the original computed count with the separate reference. Human corrections do not replace either. Read complete/missing pairs, exclusions, duplicate images, repeated units and method/settings groups before interpreting errors. Export the validation CSV and audit with their inclusion reasons and histories.

Generated examples stay outside prepared-photo measurements. Uploaded synthetic images have a separate diagnostic scope. Without qualifying photos and references, **Photo-error measurements pending** is the expected state. Biological images can be saved for manual review; this small counter does not automatically count real larvae. The image workspace's assigned locations remain fictional demo locations.

The [deferred trial checklist](field-trial-checklist.md) has blank worksheets, matching count-area guidance and the fuller later owner block. No real photos or field observations are invented for this walkthrough.

## 4. Try the public-health workflow

1. In **Container QA**, click **Load synthetic examples** for a rehearsal. With actual observations available later, use **New QA observation**, select the matching origin and retain source, date/time, container, batch and observation context. Blank is unknown; **0** is checked and none observed. Keep emergence/outcome unassessed without a separately supported assessment.
2. In **Study & review**, click **Create synthetic study example**, then **Run descriptive / readiness check**. Read the dated plan, fixed inputs, missing-data/exclusion notes and results before recording a review. Export the methods report and full study audit.
3. In **Inspection planning**, click **Load synthetic QA examples**, then **Generate inspection queue**. Inspect the evidence and record an accept/defer/dismiss decision with the requested reviewer, reason, assignee and dates. These are local planning records; no notification, physical action or release instruction is sent.
4. Optionally, in **Trends & modelling**, click **Create synthetic prediction example**, then **Train and evaluate**. Inspect simple baselines and missed failures as well as accuracy. The fixed synthetic example gives 60% model accuracy versus 70% for the constant baseline; all three methods miss the three failed test containers. This is an evaluation exercise, not useful field prediction.

Bead counts do not become biological stage counts. Images and QA records are not linked automatically: keep the relevant source references. Rehearsals stay synthetic, and user-entered field observations do not become independently verified. The separate dengue charts remain synthetic context. Photographs/counts do not establish species, Wolbachia infection, successful emergence or dengue impact.

## 5. Keep copies and recover from problems

| Situation | Next step |
| --- | --- |
| Hosted service fails despite Browser online | Read the checked service result/error. Use cloud-first or device-only as appropriate and inspect the new count's actual source. |
| App does not reopen offline | Reconnect with the same browser/profile; refresh after a release if needed, prepare and wait for confirmation before disconnecting. |
| Count missing or wrong | Inspect the image, marks and warnings. Save a human count or rejection with a reason. Keep unsuitable photos in the inventory. Unknown is not zero; a correction is not an independent reference. |
| Records needed elsewhere | Export from each workspace and retain original photos separately. There is no shared database sync or general audit-file restore/import. Exported audits omit original image bytes. Do not clear browser storage before keeping the copies you need. |

Firebase remains an optional, inactive-by-default, unverified connector. The small counter does not route to it. Saving Firebase settings does not change the selected image method or verify a connection. No live Firebase demonstration is included in this delivery.

Actual owner-operated laptop checks, photo measurements, field usefulness and a 10–15 minute clarity review remain deferred. The walkthrough describes verified software paths; it does not establish those later results.
