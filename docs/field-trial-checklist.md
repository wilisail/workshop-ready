# Deferred photo and public-health workflow trial

Step 6C owner block: approximately 30–60 minutes once the implementation is ready. Wili's collection and hands-on work remain deferred. This checklist prepares a small software/workflow pilot, not a validated field study or a mosquito-release protocol.

## What to bring later

- A small starter batch, for example 5–10 prepared bead photos, with counts obtained separately from the computed estimate. This is a practical starting quantity, not a statistical sufficiency threshold.
- A physical setup/container-and-batch reference for each image. Repeated photos of the same arrangement keep the same unit reference. A copied image does not become another independent unit.
- Available dated public-health observations or programme records for a manual data-entry trial. If none are available, keep the exercise labelled a synthetic rehearsal and leave the actual field trial pending.

Blank worksheets: [photo references](templates/photo-reference-sheet.csv) and [public-health observations](templates/public-health-trial-sheet.csv). They contain headers only: no invented observations or reference counts. They are recording aids, not an automatic import format.

## 1. Prepare and record references

Open [Data & settings](https://workshop-ready-theta.vercel.app/#settings) while connected and confirm offline preparation for the browser/profile you will use. Keep the small bead counter and cloud-first or device-only processing selected. The separate [6B checklist](wolbachia-step-6b.md) covers the later laptop/disconnection check.

Obtain the visible-object reference count without using a computed estimate or a correction copied from it. Record who counted, how, and whether they had seen an estimate. Keep original filenames and observation dates. Counted zero is `0`; not checked or not countable stays blank/unknown. Record unsuitable images and reasons rather than silently dropping inconvenient results.

Choose how you will count and any calibration settings before using the comparison photos. The reference must count the same area as the counter: a whole-photo reference is not comparable to a cropped-region estimate. Describe the selected area in the reference method. If you tune settings using these photos, treat them as development data and retain a new untouched set for a later evaluation.

## 2. Save, classify and count each photo

1. Open **Image review → Your image tests → Add an image**. Enter a container/setup reference and date. Importing saves the original locally; it does not itself request a count.
2. Under **Separate reference count**, choose the evidence declaration. Use **Prepared bead photo — operator declared** only for the corresponding prepared photo. Keep uploaded synthetic images under **Uploaded synthetic / test image**. Generated examples retain their construction reference and stay outside prepared-photo metrics.
3. Enter the physical unit reference, independent count, method and counter label. Independence and blinding default to unconfirmed; select them only when supported by what actually happened. Save the declaration before the computed count for a prospective comparison. Later entry remains possible and is flagged.
4. Run the small counter for bead proxies and inspect the marked regions and actual execution source. Save a human correction/rejection separately when appropriate. A correction never overwrites the original computed estimate or becomes an independent reference automatically.
5. Record exclusions explicitly with reasons. Amendments require reasons and retain previous declarations. Real biological images can be saved and manually reviewed; this counter does not automatically count them.

The image workspace's assigned location is still a fictional demo location. Do not present that location as field provenance. Actual observation/source references belong in the separate Container QA record.

## 3. Review measured errors

At **Photo validation report**, choose the prepared-photo scope. Review complete pairs, missing pairs, excluded photos and paired physical units. The report inventories all saved images regardless of the image list's search/status filters.

- MAE is the mean absolute difference between the original computed and separate reference counts.
- Signed bias is computed count minus reference count; maximum error is the largest absolute difference.
- Unit-balanced MAE first averages within each repeated physical unit, then across units.
- Different methods/versions/counting settings have separate results. The latest run per photo is used, never an automatically selected best run.
- Duplicate image bytes retain one earliest active record within the selected scope. Known copies of saved generated examples cannot become prepared-photo validation.

Read the independence, blinding, late-reference and rerun notes before interpreting errors. There is no p-value, confidence interval or automatic accuracy certificate. A prepared-bead result does not establish larvae detection, infection, emergence or dengue impact.

Export **validation CSV** for the inventory and paired counts, and **validation audit** for a frozen snapshot with settings, image hashes, original results and full reference/review histories. The exports do not contain original image bytes. Keep originals separately. If no qualifying pairs exist, the report remains **Photo-error measurements pending**.

## 4. Try the public-health observation workflow

Use available observations and their original source references. In **Container QA → New QA observation**, select the origin that matches the evidence. A synthetic rehearsal remains synthetic; actual user-entered field observations retain that label without becoming independently verified.

Enter container, batch, location/source reference, observation date/time and the correct time zone, such as `Asia/Jakarta` for WIB. Record only stages and conditions actually checked. Blank means unknown; `0` means checked and none observed. Preserve temperature source/basis when available. Keep emergence and QA outcome unassessed until there is a separately supported assessment and method/reference.

Do not copy bead counts into biological stage counts. Image records and QA records are not automatically linked: put the appropriate photo/worksheet identifier in **Source reference** and explain the observation in notes. Infection assays and dengue outcomes require their own records and study design; this trial does not infer them.

Export **all QA history** and filtered QA CSV. If using **Study & review**, record the plan and preserve the selected data snapshot; copy the relevant image/unit references from the validation export when entering counting pairs. No automatic photo-to-study import is provided. Inspection planning uses the chosen QA evidence and recorded human decisions; it does not turn the photo-error report into a release instruction.

## Return later

Keep the photo-validation audit/CSV, original photos and QA audit/CSV, along with notes on what was confusing, which values were unknown and whether the disconnected workflow succeeded. Until those inputs exist, real-photo measurements and field usefulness remain pending.
