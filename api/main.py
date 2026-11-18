from fastapi import FastAPI, File, Query, UploadFile, HTTPException, Form
from fastapi.responses import FileResponse, PlainTextResponse
import uvicorn
import joblib
import numpy as np
from pydantic import BaseModel
import pandas as pd
from datetime import datetime


app = FastAPI(
    title="Credit Card Fraud Detection API",
    description="""An API that utilizes a Machine Learning model that detects if a credit card transaction is fraudulent or not based on the following features: hours, amount, transaction type etc.""",
    version="1.0.0", debug=True)

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Runtime Counters ---
_startup_time: datetime = datetime.utcnow()
_stats = {
    "total_predictions": 0,
    "fraud_count": 0,
    "safe_count": 0,
    "total_probability": 0.0,
}


# Load Model and Artifacts
artifacts = None
try:
    import os
    # Get the directory of the current script
    current_dir = os.path.dirname(os.path.abspath(__file__))
    # Construct absolute path to the model
    model_path = os.path.join(current_dir, '..', 'models', 'credit_fraud.pkl')

    artifacts = joblib.load(model_path)
    # Check if it's the new dictionary format or old model
    if isinstance(artifacts, dict) and 'model' in artifacts:
        model = artifacts['model']
        THRESHOLD = artifacts.get('threshold', 0.5)
        ISO_FOREST = artifacts.get('iso_forest', None)
        ISO_FEATURES = artifacts.get('iso_features', [])
        TYPE_ENCODING = artifacts.get('type_encoding', {})
        GLOBAL_FRAUD_RATE = artifacts.get('global_fraud_rate', 0.0)
        MODEL_FEATURES = artifacts.get('features', [])
        MODEL_VERSION = artifacts.get('model_version', 'v2.0')
        print(f"Loaded {MODEL_VERSION} model with threshold: {THRESHOLD}")
    else:
        model = artifacts
        THRESHOLD = 0.5
        ISO_FOREST = None
        ISO_FEATURES = []
        TYPE_ENCODING = {}
        GLOBAL_FRAUD_RATE = 0.0
        MODEL_FEATURES = []
        MODEL_VERSION = 'legacy'
        print("Loaded legacy model (threshold 0.5)")
except Exception as e:
    print(f"Error loading model: {e}")
    model = None
    THRESHOLD = 0.5
    ISO_FOREST = None
    ISO_FEATURES = []
    TYPE_ENCODING = {}
    GLOBAL_FRAUD_RATE = 0.0
    MODEL_FEATURES = []
    MODEL_VERSION = 'none'

@app.get("/", response_class=PlainTextResponse)
async def running():
  note = """
Credit Card Fraud Detection API 🙌🏻

Model: Advanced Stacking Ensemble (RF + XGB + LightGBM + CatBoost → LR meta)
Note: add "/docs" to the URL to get the Swagger UI Docs or "/redoc"
  """
  return note

favicon_path = 'favicon.png'
@app.get('/favicon.png', include_in_schema=False)
async def favicon():
    return FileResponse(favicon_path)
																	
class fraudDetection(BaseModel):
    step:int
    types:int
    amount:float	
    oldbalanceorig:float	
    newbalanceorig:float	
    oldbalancedest:float	
    newbalancedest:float	
    isflaggedfraud:float


import sys
import os
current_dir = os.path.dirname(os.path.abspath(__file__))
models_dir = os.path.abspath(os.path.join(current_dir, '..'))
if models_dir not in sys.path:
    sys.path.append(models_dir)

from models.feature_engineering import build_features

def _build_features(data: "fraudDetection") -> pd.DataFrame:
    """
    Central feature engineering function — now imported from models module.
    """
    # Create DataFrame from payload
    df = pd.DataFrame([{
        "step": data.step,
        "types": data.types,
        "type": data.types,
        "amount": data.amount,
        "oldbalanceorig": data.oldbalanceorig,
        "newbalanceorig": data.newbalanceorig,
        "oldbalancedest": data.oldbalancedest,
        "newbalancedest": data.newbalancedest,
        "isflaggedfraud": data.isflaggedfraud
    }])
    
    # Process using shared function
    processed_df = build_features(
        df, 
        is_training=False,
        iso_forest=ISO_FOREST,
        iso_features=ISO_FEATURES,
        type_encoding=TYPE_ENCODING,
        global_fraud_rate=GLOBAL_FRAUD_RATE,
        model_features=MODEL_FEATURES
    )
    
    return processed_df

# --- Firewall Rules & Compliance System ---
FIREWALL_RULES = [
    {
        "id": "rule_high_amount_night",
        "name": "High-Value Night Check",
        "description": "Flags transactions > $50,000 executed between 12 AM and 6 AM.",
        "condition": "amount > 50000 and is_night == 1",
        "severity": "High",
        "active": True,
        "violations_count": 0
    },
    {
        "id": "rule_account_drain",
        "name": "Account Drain Detection",
        "description": "Flags transactions that drain more than 99% of the source balance for accounts with > $10,000.",
        "condition": "newbalanceorig == 0 and oldbalanceorig > 10000 and amount > 10000",
        "severity": "Critical",
        "active": True,
        "violations_count": 0
    },
    {
        "id": "rule_empty_recipient",
        "name": "New/Empty Recipient Routing",
        "description": "Flags large transfers (> $100,000) to recipient accounts with $0 initial balance.",
        "condition": "oldbalancedest == 0 and amount > 100000",
        "severity": "Medium",
        "active": True,
        "violations_count": 0
    },
    {
        "id": "rule_structuring_attempt",
        "name": "Exact Round Structuring",
        "description": "Flags round transactions (multiples of $50,000) representing potential smurfing or structuring.",
        "condition": "amount % 50000 == 0 and amount > 0",
        "severity": "Medium",
        "active": False,
        "violations_count": 0
    }
]

class RuleToggle(BaseModel):
    id: str

class CustomRule(BaseModel):
    name: str
    description: str
    condition: str
    severity: str

def evaluate_rule(rule, features_dict):
    cond = rule["condition"]
    try:
        amount = features_dict.get("amount", 0.0)
        is_night = features_dict.get("is_night", 0)
        newbalanceorig = features_dict.get("newbalanceorig", 0.0)
        oldbalanceorig = features_dict.get("oldbalanceorig", 0.0)
        oldbalancedest = features_dict.get("oldbalancedest", 0.0)
        newbalancedest = features_dict.get("newbalancedest", 0.0)
        types = features_dict.get("types", 0)
        
        # Hardcoded evaluations for default rules for robustness
        rule_id = rule["id"]
        if rule_id == "rule_high_amount_night":
            return amount > 50000 and is_night == 1
        elif rule_id == "rule_account_drain":
            return newbalanceorig == 0 and oldbalanceorig > 10000 and amount > 10000
        elif rule_id == "rule_empty_recipient":
            return oldbalancedest == 0 and amount > 100000
        elif rule_id == "rule_structuring_attempt":
            return amount > 0 and amount % 50000 == 0
        
        # Custom evaluation
        safe_dict = {
            "amount": amount,
            "is_night": is_night,
            "newbalanceorig": newbalanceorig,
            "oldbalanceorig": oldbalanceorig,
            "oldbalancedest": oldbalancedest,
            "newbalancedest": newbalancedest,
            "types": types
        }
        return bool(eval(cond, {"__builtins__": None}, safe_dict))
    except Exception as e:
        print(f"Error evaluating rule {rule['id']}: {e}")
        return False

def classify_typology(features_dict, probability):
    amount = features_dict.get("amount", 0.0)
    is_night = features_dict.get("is_night", 0)
    newbalanceorig = features_dict.get("newbalanceorig", 0.0)
    oldbalanceorig = features_dict.get("oldbalanceorig", 0.0)
    oldbalancedest = features_dict.get("oldbalancedest", 0.0)
    
    if probability < 0.2:
        return "None"
        
    if newbalanceorig == 0 and oldbalanceorig > 10000 and amount > 10000:
        return "Account Takeover / Balance Draining"
    elif is_night == 1 and amount > 50000:
        return "Midnight High-Value Anomaly"
    elif oldbalancedest == 0 and amount > 100000:
        return "Mule Account Routing"
    elif amount > 0 and amount % 1000 == 0:
        return "Structuring / Smurfing Risk"
    else:
        return "Standard Anomaly Profile"

def get_recommended_action(typology, has_rule_violations):
    if typology == "Account Takeover / Balance Draining":
        return "Freeze source account immediately. Initiate security verification and review recent MFA changes."
    elif typology == "Midnight High-Value Anomaly":
        return "Place 12-hour transaction hold. Send authorization verification alert to customer phone."
    elif typology == "Mule Account Routing":
        return "Freeze destination account. Verify destination KYC status and report to compliance officer."
    elif typology == "Structuring / Smurfing Risk":
        return "Flag account for historical frequency audit. Place on 30-day compliance watchlist."
    elif has_rule_violations:
        return "Review flagged compliance firewalls. Verify source and destination credentials."
    else:
        return "Standard verification protocol. No immediate freeze required unless risk score increases."

@app.get('/rules')
def get_rules():
    return FIREWALL_RULES

@app.post('/rules/toggle')
def toggle_rule(payload: RuleToggle):
    for r in FIREWALL_RULES:
        if r["id"] == payload.id:
            r["active"] = not r["active"]
            return {"status": "success", "id": r["id"], "active": r["active"]}
    raise HTTPException(status_code=404, detail="Rule not found")

@app.post('/rules/add')
def add_rule(payload: CustomRule):
    new_id = f"rule_custom_{len(FIREWALL_RULES) + 1}"
    new_rule = {
        "id": new_id,
        "name": payload.name,
        "description": payload.description,
        "condition": payload.condition,
        "severity": payload.severity,
        "active": True,
        "violations_count": 0
    }
    # Validate condition quickly by running on dummy data
    try:
        evaluate_rule(new_rule, {"amount": 0.0, "is_night": 0, "newbalanceorig": 0.0, "oldbalanceorig": 0.0, "oldbalancedest": 0.0, "newbalancedest": 0.0, "types": 0})
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid rule condition expression: {e}")
        
    FIREWALL_RULES.append(new_rule)
    return {"status": "success", "rule": new_rule}

@app.post('/predict')
def predict(
    data: fraudDetection, 
    model_type: str = Query("stacking", description="Ensemble model name or sub-model ID (stacking, rf, xgb, lgbm, catboost)"),
    custom_threshold: float = Query(None, description="Custom override decision threshold (0.0 to 1.0)")
):
    if model is None:
        return {"error": "Model not loaded"}

    import time
    start_time = time.perf_counter()

    features = _build_features(data)
    features_dict = {
        "step": data.step,
        "types": data.types,
        "type": data.types,
        "amount": data.amount,
        "oldbalanceorig": data.oldbalanceorig,
        "newbalanceorig": data.newbalanceorig,
        "oldbalancedest": data.oldbalancedest,
        "newbalancedest": data.newbalancedest,
        "isflaggedfraud": data.isflaggedfraud,
        "is_night": 1 if (data.step % 24) <= 6 else 0
    }

    # Determine which model to run
    if not isinstance(model_type, str):
        model_type = "stacking"
    model_used = model
    model_name = "Stacking Ensemble"
    
    if model_type != "stacking" and hasattr(model, "named_estimators_"):
        estimator = model.named_estimators_.get(model_type)
        if estimator is not None:
            model_used = estimator
            model_names_map = {
                "rf": "Random Forest Classifier",
                "xgb": "XGBoost Classifier",
                "lgbm": "LightGBM Classifier",
                "catboost": "CatBoost Classifier"
            }
            model_name = model_names_map.get(model_type, model_type)

    # Predict
    try:
        probability = model_used.predict_proba(features)[0][1]
    except Exception as e:
        # Fallback to main model
        probability = model.predict_proba(features)[0][1]
        model_name = "Stacking Ensemble (Fallback)"

    # Apply optimised threshold
    decision_threshold = float(custom_threshold) if isinstance(custom_threshold, (int, float)) else THRESHOLD
    prediction = 1 if probability >= decision_threshold else 0
    latency_ms = (time.perf_counter() - start_time) * 1000.0

    # Evaluate rules
    triggered_rules = []
    for r in FIREWALL_RULES:
        if r["active"]:
            if evaluate_rule(r, features_dict):
                triggered_rules.append({
                    "id": r["id"],
                    "name": r["name"],
                    "description": r["description"],
                    "severity": r["severity"]
                })
                r["violations_count"] += 1

    # Classify typology
    typology = classify_typology(features_dict, probability)
    recommended = get_recommended_action(typology, len(triggered_rules) > 0)

    # Unified risk verdict
    if prediction == 1:
        final_verdict = "High Risk (ML Flagged)"
    elif len(triggered_rules) > 0:
        final_verdict = "Suspicious (Rules Triggered)"
    elif probability >= 0.2:
        final_verdict = "Medium Risk (ML Suspect)"
    else:
        final_verdict = "Safe"

    # Update counters (only for main stacking query to avoid skewing stats on comparative playground runs)
    if model_type == "stacking":
        _stats["total_predictions"] += 1
        _stats["total_probability"] += float(probability)
        if prediction == 1 or final_verdict == "Suspicious (Rules Triggered)":
            _stats["fraud_count"] += 1
        else:
            _stats["safe_count"] += 1

    return {
        "result": "Fraudulent" if (prediction == 1 or len(triggered_rules) > 0) else "Not Fraudulent",
        "probability": float(probability),
        "model_used": model_name,
        "latency_ms": float(latency_ms),
        "triggered_rules": triggered_rules,
        "fraud_typology": typology,
        "recommended_action": recommended,
        "final_verdict": final_verdict
    }

import io

@app.post('/batch-predict')
async def batch_predict(file: UploadFile = File(...)):
    if model is None:
        return {"error": "Model not loaded"}
    
    try:
        content = await file.read()
        df = pd.read_csv(io.BytesIO(content))
        
        # handle special cases if needed
        if "type" in df.columns and "types" not in df.columns:
            # Create types column if using type, or just let feature_engineering handle it
            pass
        elif "types" in df.columns and "type" not in df.columns:
            df["type"] = df["types"]
        
        processed_df = build_features(
            df, 
            is_training=False,
            iso_forest=ISO_FOREST,
            iso_features=ISO_FEATURES,
            type_encoding=TYPE_ENCODING,
            global_fraud_rate=GLOBAL_FRAUD_RATE,
            model_features=MODEL_FEATURES
        )
        
        probabilities = model.predict_proba(processed_df)[:, 1]
        predictions = (probabilities >= THRESHOLD).astype(int)
        
        # Update counters
        _stats["total_predictions"] += len(predictions)
        _stats["fraud_count"] += int(predictions.sum())
        _stats["safe_count"] += int(len(predictions) - predictions.sum())
        _stats["total_probability"] += float(probabilities.sum())
        
        # Return results
        results = []
        for i in range(len(predictions)):
            # safely get source and destination names whether they use nameOrig/nameDest or nameorig/namedest
            src = df["nameOrig"].iloc[i] if "nameOrig" in df.columns else (df["nameorig"].iloc[i] if "nameorig" in df.columns else f"Unknown-{i}")
            dest = df["nameDest"].iloc[i] if "nameDest" in df.columns else (df["namedest"].iloc[i] if "namedest" in df.columns else f"Unknown-{i}")
            amt = float(df["amount"].iloc[i]) if "amount" in df.columns else 0.0

            results.append({
                "index": i,
                "amount": amt,
                "probability": float(probabilities[i]),
                "result": "Fraudulent" if predictions[i] == 1 else "Not Fraudulent",
                "source": str(src),
                "destination": str(dest)
            })
            
        return {"results": results, "total": len(results), "fraud_detected": int(predictions.sum())}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": f"Failed to process CSV: {str(e)}"}


# -----------------
# Health & Stats Endpoints
# -----------------

@app.get("/health")
async def health():
    """Returns API health, uptime, and model status."""
    uptime_seconds = (datetime.utcnow() - _startup_time).total_seconds()
    hours, remainder = divmod(int(uptime_seconds), 3600)
    minutes, seconds = divmod(remainder, 60)
    return {
        "status": "online",
        "model_loaded": model is not None,
        "threshold": float(THRESHOLD),
        "uptime": f"{hours:02d}h {minutes:02d}m {seconds:02d}s",
        "uptime_seconds": uptime_seconds,
    }


@app.get("/stats")
async def stats():
    """Returns running prediction statistics."""
    total = _stats["total_predictions"]
    avg_prob = (_stats["total_probability"] / total) if total > 0 else 0.0
    fraud_rate = (_stats["fraud_count"] / total * 100) if total > 0 else 0.0
    return {
        "total_predictions": total,
        "fraud_count": _stats["fraud_count"],
        "safe_count": _stats["safe_count"],
        "avg_probability": round(avg_prob, 4),
        "fraud_rate_pct": round(fraud_rate, 2),
    }


@app.get("/model-info")
async def model_info():
    """Returns metadata about the currently loaded ensemble model."""
    importances_dict = {}
    base_learners = []
    meta_learner = ""
    
    if isinstance(artifacts, dict):
        base_learners = artifacts.get("base_learners", [])
        meta_learner = artifacts.get("meta_learner", "")
        # Convert feature importances numpy array to list/dict of floats
        if "feature_importances" in artifacts and "features" in artifacts:
            try:
                imps = artifacts["feature_importances"]
                feats = artifacts["features"]
                importances_dict = {str(f): float(imp) for f, imp in zip(feats, imps)}
            except Exception as e:
                print(f"Error preparing feature importances: {e}")
                
    return {
        "model_version": MODEL_VERSION,
        "threshold": float(THRESHOLD),
        "features": MODEL_FEATURES,
        "feature_importances": importances_dict,
        "base_learners": base_learners,
        "meta_learner": meta_learner,
        "global_fraud_rate": float(GLOBAL_FRAUD_RATE)
    }


# -----------------
# Explainable AI (SHAP)
# -----------------
import shap

# Initialize Explainer Cache (Lazy Load to prevent startup crash)
explainers = {}

def get_explainer_for(model_type: str):
    global explainers
    if model_type in explainers:
        return explainers[model_type]

    try:
        if model is None:
            return None

        if model_type == 'stacking':
            # Stacking model: explain using tree-based submodel proxy for performance
            for estimator_key in ['lgbm', 'xgb', 'rf']:
                try:
                    est = model.named_estimators_.get(estimator_key)
                    if est is None:
                        continue
                    explainers['stacking'] = shap.TreeExplainer(est)
                    print(f"SHAP Explainer for stacking initialized using '{estimator_key}'.")
                    return explainers['stacking']
                except Exception:
                    continue

            # Fallback
            xgb_est = model.named_estimators_.get('xgb')
            if xgb_est is not None:
                explainers['stacking'] = shap.TreeExplainer(xgb_est)
                return explainers['stacking']
        else:
            # Base model
            est = model.named_estimators_.get(model_type)
            if est is not None:
                explainers[model_type] = shap.TreeExplainer(est)
                print(f"SHAP Explainer initialized for '{model_type}'.")
                return explainers[model_type]
    except Exception as e:
        print(f"Error initializing SHAP explainer for {model_type}: {e}")
    return None


@app.post('/explain')
def explain(data: fraudDetection, model_type: str = Query("stacking", description="Model type (stacking, rf, xgb, lgbm, catboost)")):
    if not isinstance(model_type, str):
        model_type = "stacking"
    explainer_instance = get_explainer_for(model_type)
    if explainer_instance is None:
        return {"error": f"Explainer could not be initialized for model: {model_type}"}

    features = _build_features(data)

    # Calculate SHAP values
    try:
        shap_values = explainer_instance.shap_values(features)
        # For binary classification some explainers return a list
        if isinstance(shap_values, list):
            shap_arr = shap_values[1][0]  # class 1
        else:
            # handle cases where shape is (1, n_features) or (n_features,)
            if len(shap_values.shape) > 1 and shap_values.shape[0] == 1:
                shap_arr = shap_values[0]
            else:
                shap_arr = shap_values

        return {
            "base_value":    float(explainer_instance.expected_value
                                  if not isinstance(explainer_instance.expected_value, (list, np.ndarray))
                                  else explainer_instance.expected_value[1]),
            "shap_values":   shap_arr.tolist(),
            "feature_names": list(features.columns),
        }
    except Exception as e:
        print(f"SHAP Params Error for model {model_type}: {e}")
        return {"error": f"Calculation failed: {str(e)}"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
