"""Independent numeric cross-check. Requires numpy, scipy and scikit-learn for development only.

Usage:
  node --experimental-strip-types scripts/export-prediction-reference.mjs > /tmp/wolbachia-reference.json
  python scripts/verify-prediction-reference.py /tmp/wolbachia-reference.json
"""
import json
import sys
import numpy as np
import scipy
import sklearn
from scipy.special import expit
from scipy.stats import norm
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, confusion_matrix

with open(sys.argv[1], encoding='utf-8') as stream:
    run = json.load(stream)

train, test = run['split']['train'], run['split']['test']
raw_train = np.array([r['features'] for r in train], dtype=float)
raw_test = np.array([r['features'] for r in test], dtype=float)
means = np.nanmean(raw_train, axis=0)
means = np.where(np.isnan(means), 0, means)
imputed = np.where(np.isnan(raw_train), means, raw_train)
scales = np.std(imputed, axis=0)
scales = np.where(scales == 0, 1, scales)

def transform(raw):
    values = np.where(np.isnan(raw), means, raw)
    return np.concatenate([np.clip((values - means) / scales, -12, 12), np.isnan(raw).astype(float)], axis=1)

X_train, X_test = transform(raw_train), transform(raw_test)
y_train = np.array([r['target'] for r in train])
y_test = np.array([r['target'] for r in test])
np.testing.assert_allclose(means, run['model']['means'], atol=1e-12)
np.testing.assert_allclose(scales, run['model']['scales'], atol=1e-12)
js_scores = np.array([p['score'] for p in run['predictions']])
reconstructed = expit(X_test @ np.array(run['model']['weights']) + run['model']['intercept'])
np.testing.assert_allclose(js_scores, reconstructed, atol=1e-12)
assert abs(brier_score_loss(y_test, js_scores) - run['metrics']['model']['brier']) < 1e-12
tn, fp, fn, tp = confusion_matrix(y_test, js_scores >= .5, labels=[0, 1]).ravel()
assert [int(v) for v in (tn, fp, fn, tp)] == [run['metrics']['model'][k] for k in ('tn', 'fp', 'fn', 'tp')]

# sklearn's objective is mean log loss + ||w||²/(2*n*C), with unpenalized intercept.
reference = LogisticRegression(C=1 / (len(train) * run['protocol']['l2']), solver='lbfgs', max_iter=10000, tol=1e-10)
reference.fit(X_train, y_train)
reference_scores = reference.predict_proba(X_test)[:, 1]
max_score_difference = float(np.max(np.abs(js_scores - reference_scores)))
# Fixed-step gradient descent approximates the converged reference optimizer.
assert max_score_difference < .02, f'Optimizer discrepancy: {max_score_difference}'

z = norm.ppf(.975)
n = len(test)
p = (tp + tn) / n
center = (p + z*z/(2*n)) / (1 + z*z/n)
half = z * np.sqrt(p*(1-p)/n + z*z/(4*n*n)) / (1 + z*z/n)
np.testing.assert_allclose([center-half, center+half], run['metrics']['model']['accuracyInterval'], atol=1e-12)
print(json.dumps({'reference_check': 'passed', 'numpy': np.__version__, 'scipy': scipy.__version__,
                  'scikit_learn': sklearn.__version__, 'maximum_score_difference_vs_converged_reference': max_score_difference,
                  'matched_confusion_counts': {'tn': int(tn), 'fp': int(fp), 'fn': int(fn), 'tp': int(tp)},
                  'brier': float(brier_score_loss(y_test, js_scores)),
                  'scope': 'Numerical agreement on a synthetic fixture; not field validation'}, indent=2))
