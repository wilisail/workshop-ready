# Step 4C — numeric container-performance evaluation

Implemented: 21 November 2026 (WIB). Software 0.6.0; algorithm `container-logistic-v1`.

## Run the exercise

1. Open **Trends & modelling** and choose **Create synthetic prediction example**.
2. Inspect the fixed evaluation method and select **Train and evaluate**. This genuinely fits coefficients and evaluates held-out predictions; the interface does not substitute predefined scores.
3. Inspect comparison metrics, missed failures, exact partitions/exclusions, input flags, fitted parameters and limitations.
4. **Open this study and review** selects that study in the existing review view. A reviewer label/comment attaches to the displayed plan, input snapshot, readiness result and model run. Any new result needs a fresh current review.
5. Export the methods report, complete JSON audit and held-out prediction CSV. The audit retains original input QA revisions, exclusions, preprocessing, fitted weights, predictions, metrics and review references. There are no image bytes.

Existing recorded prediction studies can also be selected. Their current QA snapshot is used without altering its origin or source records. Sparse/one-class, unsuitable bead-proxy or chronologically unusable data produce an explicit insufficient-data run with no fabricated model or metric.

The numeric model runs locally in the browser with no additional runtime dependency, API request, model download or GPU. It is separate from the Firebase image model and its cloud-default route. No Chrome/Gemini Nano eligibility is implied. Source generation is an explicit action; self-contained generator snapshots do not populate or replace the separate Container QA database.

## Target and fixed method

The positive target is a separately entered **later failed container QA outcome**; the negative target is satisfactory under the cited protocol. It is not a direct estimate of adult emergence, Wolbachia infection or dengue reduction. Synthetic labels are fictional, generated with seeded noise; their relationships are not estimates from a Wolbachia paper.

| Part | Fixed behavior |
| --- | --- |
| Eligibility | Definitive failed/satisfactory label, known condition, and assessment date strictly after observation date. Unknown condition is excluded for both methods so the baseline comparison uses identical rows. |
| Unit | One earliest eligible observation per physical container across cycles. If the plan declares site as its unit, retain one earliest eligible observation per site. Additional visits/units within the group are explicitly excluded. |
| Test | Latest 20% of eligible groups by first observation date, rounded up. Date ties use stable group ordering, without label-based selection. |
| Chronology | Exclude training candidates whose outcome is dated on/after the earliest held-out observation. Physical containers cannot occur in both training and test, including in site-grouped mode. |
| Inputs | Age at observation; container-water temperature; larvae, pupae and dead-immature ratios against stated starting eggs; adverse container condition. Each has a missingness indicator. |
| Missing values | Means and population standard deviations are fitted only on training data. Unknown/zero starting quantity or counts above that quantity yield unknown ratios. Air/weather values do not replace water temperature. Values beyond the engineering numeric guard of ±1,000,000 remain unknown; standardized values are clipped to ±12. |
| Excluded features | Final QA label/date as predictors, emergence result, infection status, pupal skins, dead-adult counts, IDs, notes, dengue data and future observations. Outcome dates are used for eligibility and chronological exclusion only. |
| Model | Logistic regression minimizing mean binary log loss + 0.02/2 × sum of squared weights. Intercept is unpenalized. Full-batch gradient descent: 1,000 steps, learning rate 0.08. No test-set tuning. |
| Decision | Model score ≥0.5 flags a failed outcome. Scores are uncalibrated; they are not validated failure probabilities or confidence estimates. |
| Inspection baseline | Flag dry/damaged/missing containers; otherwise do not flag an intact container. This illustrative rule is not a published release protocol or biological failure threshold. |
| Constant baseline | Use training failure prevalence as the score for every held-out unit. |

Eligibility/group selection does not consult whether a definitive label is failed or satisfactory. Training and test each need both labels for this prototype comparison. That is a software feasibility condition, not a statistical sample-size recommendation. The split is not reselected until it gives an attractive result.

The system reports observation-to-assessment horizon variation and multiple cited outcome protocols. Those can imply different target definitions. The fixed software protocol is retained with the run; it may differ from an earlier free-text plan, which must be reviewed separately. Dated local records are not external preregistration or proof of when measurements became available. Future field evaluation needs a prospectively specified target, horizon, protocol and sample rationale.

## Metrics and the fixed synthetic result

The generator (`qa-prediction-fixture-v1`, seed 4271) supplies 96 repeated observations from 48 fictional containers plus four exclusion examples. There are 35 training groups and 10 later test groups, with a 9 October 2026 test cutoff. The 55 excluded rows comprise 48 repeated-group observations, four unusable examples and three training rows excluded by chronology. Fitting reduces the training objective from 0.659712 to 0.476315.

| Method | Test n | Failed found | Missed failures | Balanced accuracy | Accuracy | Binary Brier loss |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Logistic model | 10 | 0/3 | 3 | 42.9% | 60% | 0.303082 |
| Inspection rule | 10 | 0/3 | 3 | 35.7% | 50% | 0.500000 |
| Training-prevalence baseline | 10 | 0/3 | 3 | 50.0% | 70% | 0.215102 |

The model does not beat the constant baseline on this holdout. Its six correct satisfactory classifications do not compensate for missing every failure for a failure-finding workflow. The fixture demonstrates a reproducible evaluation pipeline; it does not establish useful prediction performance or support automatic field decisions. Neither labels, features, split nor threshold were adjusted to make this table look better.

Reported metrics include TP/TN/FP/FN, sensitivity, specificity, precision, accuracy, balanced accuracy and binary Brier score (mean squared score error, 0–1). Zero denominators are unknown. Brier scoring the inspection rule uses its hard 0/1 flags. Brier alone does not establish calibration.

Wilson 95% intervals for accuracy and sensitivity illustrate finite-test-sample uncertainty under independent Bernoulli-unit assumptions. For the model, accuracy is 60% (31.3–83.2%); sensitivity is 0/3 (0–56.1%). These intervals omit spatial/batch dependence, training uncertainty, label errors and distribution shift. Uncalibrated individual scores have no attached confidence interval.

## Storage and compatibility

Model history is an optional extension to the existing study schema. Old 4B studies remain readable. A run binds the plan version, dataset ID, origin, protocol, algorithm and software version. New model runs do not inherit an earlier current review; the previous review remains in history. Concurrent stale writes are rejected. Up to 30 model runs are retained per study.

The application validates saved partition/input consistency, training preprocessing, scores, input flags and metrics when reading. This is a local reproducibility mechanism, not a tamper-proof registry or authenticated scientific review. Field-source changes flag the older pinned snapshot; generated example snapshots are self-contained. Original source data and raw audit history remain available for external review.

Case charts and their location/date filters are a separate synthetic context panel and do not change the model data. Saved images are still a separate workflow; this stage does not automatically turn an image count into a stage-specific QA label.

## Verification and independent reference

All 76 automated tests and the TypeScript/Vite production build passed. The 16 new prediction tests cover known arithmetic values, date/group leakage, test-only label/input changes, unknown/zero handling, exhaustive exclusions, model fitting, insufficient-data states, protocol/horizon warnings, saved-result validation, review binding, compatibility and persistence/concurrency.

An independent development-only Python script uses NumPy/SciPy/scikit-learn to reconstruct training preprocessing and scores, verify confusion counts and Brier loss, compare the fitted model with a converged L-BFGS logistic fit under the same objective, and check interval arithmetic. Run:

```sh
node --experimental-strip-types scripts/export-prediction-reference.mjs > /tmp/wolbachia-reference.json
python scripts/verify-prediction-reference.py /tmp/wolbachia-reference.json
```

This optional development check requires `numpy`, `scipy` and `scikit-learn`; the web app does not. Checked with NumPy 2.3.5, SciPy 1.17.0 and scikit-learn 1.8.0. The largest held-out score difference between fixed-step training and the converged reference was **0.00662754**, within the declared 0.02 numerical tolerance. Reconstructed score arithmetic, confusion counts, Brier loss and Wilson bounds agreed to floating-point tolerance. Numerical agreement on this fixture does not validate a biological prediction.

Browser QA checked the existing three-record study's insufficient-data output, explicit example generation, actual training, model-bound review, invalidation on rerun, preserved results after reload and report/audit/CSV exports. The downloaded JSON contained 100 raw QA records, 12 fitted weights, 10 held-out predictions, 55 exclusion reasons and the matching reviewer/model reference. Changing the case-location filter left model results unchanged. A 390 px frame had 375 px usable/document/body width, including expanded evidence tables and fitted parameters; tables scroll within their panels. The temporary harness was removed before packaging.

Live Firebase/App Check, real image accuracy, eligible-device LLM inference and field effectiveness remain unverified and belong to later work.

## Method references

- [scikit-learn grouped/chronological evaluation](https://scikit-learn.org/stable/modules/cross_validation.html)
- [Preventing data leakage](https://scikit-learn.org/stable/common_pitfalls.html#data-leakage)
- [Logistic regression and its penalized objective](https://scikit-learn.org/stable/modules/linear_model.html#logistic-regression)
- [Brier score and calibration limitations](https://scikit-learn.org/stable/modules/model_evaluation.html#brier-score-loss)
- [NIST Wilson interval formulas](https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm)

These describe analytical methods. They do not endorse this implementation, supply a Wolbachia deployment threshold or establish this synthetic model's field usefulness.
