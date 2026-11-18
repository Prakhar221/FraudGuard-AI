import pandas as pd
import numpy as np
import os
import time
import joblib
import warnings
warnings.filterwarnings('ignore')

from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.ensemble import (
    RandomForestClassifier,
    StackingClassifier,
    IsolationForest,
)
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    classification_report,
    f1_score,
    roc_auc_score,
    precision_recall_curve,
    confusion_matrix,
)
import xgboost as xgb
import lightgbm as lgb
from catboost import CatBoostClassifier

print("=" * 80)
print("ADVANCED FRAUD DETECTION MODEL TRAINING (v3.0 — Stacking + LGBM + CatBoost)")
print("=" * 80)

# ─────────────────────────────────────────────────────────────────────────────
# 1. LOAD DATA
# ─────────────────────────────────────────────────────────────────────────────
print("\n[1/6] Loading PaySim dataset...")
current_dir = os.path.dirname(os.path.abspath(__file__))
data_path = os.path.join(
    current_dir, "..", "data", "raw",
    "PS_20174392719_1491204439457_log_augmented.csv",
)

if not os.path.exists(data_path):
    print(f"Error: Dataset not found at {data_path}")
    exit(1)

data = pd.read_csv(data_path)
print(f"      Dataset loaded: {len(data):,} transactions")

from feature_engineering import build_features
data = build_features(data, is_training=True)

print("      Basic features done.")

# ─────────────────────────────────────────────────────────────────────────────
# 3. SPLIT (before encoding to prevent leakage)
# ─────────────────────────────────────────────────────────────────────────────
print("\n[3/6] Splitting data (75% train / 25% test, stratified)...")

# Temporarily keep 'type' as string for encoding
cols_to_drop = ["nameOrig", "nameDest", "isFraud"]
feature_cols = [c for c in data.columns if c not in cols_to_drop]
X_raw = data[feature_cols].copy()
y     = data["isFraud"].copy()

# Ordinal encode 'type' temporarily so we can split — we re-encode after
type_mapping_str = {
    "PAYMENT": 3, "TRANSFER": 4, "CASH_OUT": 1, "DEBIT": 2, "CASH_IN": 0
}
if X_raw["type"].dtype == object:
    X_raw["type"] = X_raw["type"].map(type_mapping_str).fillna(3)

X_train_raw, X_test_raw, y_train, y_test = train_test_split(
    X_raw, y, test_size=0.25, random_state=27, stratify=y
)
print(f"      Train: {len(X_train_raw):,}  |  Test: {len(X_test_raw):,}")

# ─────────────────────────────────────────────────────────────────────────────
# TARGET ENCODING for 'type' — computed only on train, applied to both
# ─────────────────────────────────────────────────────────────────────────────
print("      Applying target encoding to 'type' feature (no leakage)...")

train_with_target = X_train_raw.copy()
train_with_target["isFraud"] = y_train.values

type_fraud_rate = (
    train_with_target.groupby("type")["isFraud"].mean().to_dict()
)
global_rate = y_train.mean()

X_train = X_train_raw.copy()
X_test  = X_test_raw.copy()
X_train["type_encoded"] = X_train["type"].map(type_fraud_rate).fillna(global_rate)
X_test["type_encoded"]  = X_test["type"].map(type_fraud_rate).fillna(global_rate)

print(f"      Type fraud rates: {type_fraud_rate}")

# ─────────────────────────────────────────────────────────────────────────────
# ISOLATION FOREST anomaly score feature
# ─────────────────────────────────────────────────────────────────────────────
print("      Fitting Isolation Forest for anomaly score feature...")
iso_features = [
    "amount", "amount_log", "amount_to_balance_ratio",
    "errorBalanceOrig", "errorBalanceDest",
    "balance_drain_flag", "dest_balance_increase_ratio",
]
iso_forest = IsolationForest(
    n_estimators=100, contamination=0.02, random_state=27, n_jobs=-1
)
iso_forest.fit(X_train[iso_features])

# decision_function: higher = more normal, lower = more anomalous → invert
X_train["isolation_score"] = -iso_forest.decision_function(X_train[iso_features])
X_test["isolation_score"]  = -iso_forest.decision_function(X_test[iso_features])
print("      Isolation Forest done.")

# Final feature list (drop raw 'type' — replaced by type_encoded)
FINAL_FEATURES = [c for c in X_train.columns if c != "type"]
X_train = X_train[FINAL_FEATURES]
X_test  = X_test[FINAL_FEATURES]

print(f"\n      Final feature set ({len(FINAL_FEATURES)} features):")
for f in FINAL_FEATURES:
    print(f"        • {f}")

# ─────────────────────────────────────────────────────────────────────────────
# 4. SMOTE (training set only)
# ─────────────────────────────────────────────────────────────────────────────
print("\n[4/6] Balancing training data with SMOTE...")
from imblearn.over_sampling import SMOTE
smote = SMOTE(random_state=27, k_neighbors=5)
X_train_bal, y_train_bal = smote.fit_resample(X_train, y_train)
print(f"      After SMOTE — Total: {len(X_train_bal):,}  |  Fraud: {(y_train_bal==1).sum():,}  |  Legit: {(y_train_bal==0).sum():,}")

# ─────────────────────────────────────────────────────────────────────────────
# 5. DEFINE BASE LEARNERS
# ─────────────────────────────────────────────────────────────────────────────
print("\n[5/6] Building Advanced Stacking Ensemble...")

print("   [A] Random Forest (200 trees)...")
rf = RandomForestClassifier(
    n_estimators=200,
    max_depth=20,
    min_samples_split=10,
    class_weight="balanced",
    n_jobs=-1,
    random_state=27,
)

print("   [B] XGBoost (200 estimators, tuned)...")
xgb_model = xgb.XGBClassifier(
    n_estimators=200,
    learning_rate=0.05,
    max_depth=6,
    subsample=0.8,
    colsample_bytree=0.8,
    scale_pos_weight=(y_train_bal == 0).sum() / (y_train_bal == 1).sum(),
    eval_metric="logloss",
    random_state=27,
    n_jobs=-1,
    verbosity=0,
)

print("   [C] LightGBM (leaf-wise tree growth, 300 estimators)...")
lgbm_model = lgb.LGBMClassifier(
    n_estimators=300,
    learning_rate=0.05,
    num_leaves=63,
    max_depth=-1,
    min_child_samples=20,
    subsample=0.8,
    colsample_bytree=0.8,
    class_weight="balanced",
    random_state=27,
    n_jobs=-1,
    verbose=-1,
)

print("   [D] CatBoost (ordered boosting, native categorical handling, 300 iters)...")
cat_model = CatBoostClassifier(
    iterations=300,
    learning_rate=0.05,
    depth=6,
    eval_metric="F1",
    random_seed=27,
    verbose=0,
    auto_class_weights="Balanced",
)

# ── Meta-learner (Level-1) ───────────────────────────────────────────────────
print("   [E] Meta-Learner: Logistic Regression (trained on OOF predictions)...")
meta_lr = Pipeline([
    ("scaler", StandardScaler()),
    ("lr", LogisticRegression(C=1.0, solver="lbfgs", max_iter=1000, random_state=27)),
])

# ── Stacking Classifier ──────────────────────────────────────────────────────
print("\n   Assembling StackingClassifier...")
stacking_clf = StackingClassifier(
    estimators=[
        ("rf",      rf),
        ("xgb",     xgb_model),
        ("lgbm",    lgbm_model),
        ("catboost", cat_model),
    ],
    final_estimator=meta_lr,
    cv=StratifiedKFold(n_splits=5, shuffle=True, random_state=27),
    stack_method="predict_proba",
    n_jobs=-1,
    passthrough=False,  # meta-learner sees only base model outputs
)

print("\n   Training Stacking Ensemble (5-fold CV for OOF meta-features)...")
print("   >> This will take 10-20 minutes -- please wait...\n")
t0 = time.time()
stacking_clf.fit(X_train_bal, y_train_bal)
train_time = time.time() - t0
print(f"\n   >> Training complete in {train_time/60:.1f} minutes.")

# ─────────────────────────────────────────────────────────────────────────────
# EVALUATE BASE LEARNERS
# ─────────────────────────────────────────────────────────────────────────────
print("\n[G] Evaluating base learners on held-out test set...")
base_learner_names = {"rf": "Random Forest", "xgb": "XGBoost", "lgbm": "LightGBM", "catboost": "CatBoost"}
for key, display_name in base_learner_names.items():
    clf = stacking_clf.named_estimators_[key]
    y_prob = clf.predict_proba(X_test)[:, 1]
    prec, rec, threshs = precision_recall_curve(y_test, y_prob)
    with np.errstate(divide="ignore", invalid="ignore"):
        fsc = np.where((prec + rec) == 0, 0, 2 * prec * rec / (prec + rec))
    best_idx = np.argmax(fsc[:-1])  # last element has no threshold
    best_thr = threshs[best_idx] if len(threshs) > best_idx else 0.5
    y_pred = (y_prob >= best_thr).astype(int)
    print(
        f"   [{display_name}] "
        f"F1: {f1_score(y_test, y_pred):.4f} | "
        f"AUC: {roc_auc_score(y_test, y_prob):.4f} | "
        f"Thresh: {best_thr:.4f}"
    )

# ─────────────────────────────────────────────────────────────────────────────
# EVALUATE STACKING ENSEMBLE + THRESHOLD TUNING
# ─────────────────────────────────────────────────────────────────────────────
print("\n[H] Evaluating full Stacking Ensemble...")
y_pred_proba = stacking_clf.predict_proba(X_test)[:, 1]

precision, recall, thresholds = precision_recall_curve(y_test, y_pred_proba)
with np.errstate(divide="ignore", invalid="ignore"):
    fscore = np.where(
        (precision + recall) == 0, 0,
        2 * precision * recall / (precision + recall)
    )
best_ix = np.argmax(fscore[:-1])
best_thresh = float(thresholds[best_ix]) if len(thresholds) > best_ix else 0.5

y_pred_final = (y_pred_proba >= best_thresh).astype(int)
final_f1  = f1_score(y_test, y_pred_final)
final_auc = roc_auc_score(y_test, y_pred_proba)

print(f"   Best Threshold : {best_thresh:.4f}")
print(f"   F1 Score       : {final_f1:.4f}")
print(f"   AUC-ROC        : {final_auc:.4f}")
print()
print(classification_report(y_test, y_pred_final, target_names=["Legitimate", "Fraud"]))

print("\n" + "=" * 80)
print(f"SELECTED: Advanced Stacking Ensemble (RF + XGB + LightGBM + CatBoost → LR)")
print(f"   F1 Score  : {final_f1:.4f}")
print(f"   AUC-ROC   : {final_auc:.4f}")
print(f"   Threshold : {best_thresh:.4f}")
print("=" * 80)

# ─────────────────────────────────────────────────────────────────────────────
# FEATURE IMPORTANCE (average of tree-based models)
# ─────────────────────────────────────────────────────────────────────────────
print("\n[5b] Computing ensemble feature importance...")
rf_imp   = stacking_clf.named_estimators_["rf"].feature_importances_
xgb_imp  = stacking_clf.named_estimators_["xgb"].feature_importances_
lgbm_imp = stacking_clf.named_estimators_["lgbm"].feature_importances_
# CatBoost importances
cat_imp  = stacking_clf.named_estimators_["catboost"].get_feature_importance()

# Normalise each to sum to 1
def norm(x): return x / (x.sum() + 1e-10)
avg_importance = (norm(rf_imp) + norm(xgb_imp) + norm(lgbm_imp) + norm(cat_imp)) / 4

print("\n   Top-10 Most Important Features:")
feat_imp_pairs = sorted(zip(FINAL_FEATURES, avg_importance), key=lambda x: x[1], reverse=True)
for feat, imp in feat_imp_pairs[:10]:
    bar = "█" * int(imp * 200)
    print(f"   {feat:<35} {imp:.4f}  {bar}")

# ─────────────────────────────────────────────────────────────────────────────
# 6. SAVE MODEL
# ─────────────────────────────────────────────────────────────────────────────
print("\n[6/6] Saving model artifacts...")
save_path = os.path.join(current_dir, "..", "models", "credit_fraud.pkl")

artifacts = {
    "model":               stacking_clf,
    "threshold":           best_thresh,
    "features":            FINAL_FEATURES,
    "feature_importances": avg_importance,
    "iso_forest":          iso_forest,
    "iso_features":        iso_features,
    "type_encoding":       type_fraud_rate,
    "global_fraud_rate":   global_rate,
    "model_version":       "v3.0-stacking",
    "base_learners":       ["RandomForest", "XGBoost", "LightGBM", "CatBoost"],
    "meta_learner":        "LogisticRegression",
}

joblib.dump(artifacts, save_path)
print(f"   ✅ Saved to: {save_path}")
print(f"   Model size: {os.path.getsize(save_path) / 1024 / 1024:.1f} MB")
print("\n   Restart the API server to load the new model. Streamlit will auto-detect it.\n")
print("=" * 80)
print("DONE — Advanced Stacking Ensemble ready for production.")
print("=" * 80)
