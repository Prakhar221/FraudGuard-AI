import pandas as pd
import numpy as np

def build_features(df: pd.DataFrame, is_training: bool = False, iso_forest=None, iso_features=None, type_encoding=None, global_fraud_rate=0.0, model_features=None) -> pd.DataFrame:
    """
    Central feature engineering function shared between train.py and api/main.py.
    """
    data = df.copy()
    data = data.fillna(0)
    
    if 'step' not in data.columns:
        data['step'] = 1

    # ── Normalize 'type' / 'types' ───────────────────────────────────────────
    type_str_mapping = {
        "CASH_IN": 0, "CASH_OUT": 1, "DEBIT": 2, "PAYMENT": 3, "TRANSFER": 4,
        "cash_in": 0, "cash_out": 1, "debit": 2, "payment": 3, "transfer": 4
    }
    if "type" in data.columns:
        if data["type"].dtype == object:
            data["type"] = data["type"].map(type_str_mapping).fillna(3).astype(int)
    elif "types" in data.columns:
        if data["types"].dtype == object:
            data["type"] = data["types"].map(type_str_mapping).fillna(3).astype(int)
        else:
            data["type"] = data["types"]
    if "type" in data.columns and "types" not in data.columns:
        data["types"] = data["type"]
        
    # ── Temporal ─────────────────────────────────────────────────────────────
    data["hour"]        = data["step"] % 24
    data["day_of_week"] = (data["step"] // 24) % 7
    data["is_night"]    = (data["hour"] <= 6).astype(int)

    # ── Balance errors ────────────────────────────────────────────────────────
    if "newbalanceOrig" in data.columns and "oldbalanceOrg" in data.columns and "amount" in data.columns:
        data["errorBalanceOrig"] = data["newbalanceOrig"] + data["amount"] - data["oldbalanceOrg"]
    else:
        # Fallback if names are slightly different (like in API payload)
        data["errorBalanceOrig"] = data.get("newbalanceorig", 0) + data.get("amount", 0) - data.get("oldbalanceorig", 0)
        
    if "oldbalanceDest" in data.columns and "newbalanceDest" in data.columns and "amount" in data.columns:
        data["errorBalanceDest"] = data["oldbalanceDest"] + data["amount"] - data["newbalanceDest"]
    else:
        data["errorBalanceDest"] = data.get("oldbalancedest", 0) + data.get("amount", 0) - data.get("newbalancedest", 0)

    # ── Log-amount ────────────────────────────────────────────────────────────
    data["amount_log"] = np.log1p(data.get("amount", 0))

    # ── Advanced ratio features ───────────────────────────────────────────────
    oldbalanceOrg = data.get("oldbalanceOrg", data.get("oldbalanceorig", 0))
    newbalanceOrig = data.get("newbalanceOrig", data.get("newbalanceorig", 0))
    oldbalanceDest = data.get("oldbalanceDest", data.get("oldbalancedest", 0))
    newbalanceDest = data.get("newbalanceDest", data.get("newbalancedest", 0))
    amount = data.get("amount", 0)
    
    data["amount_to_balance_ratio"] = amount / (oldbalanceOrg + 1)
    data["balance_drain_flag"] = (newbalanceOrig == 0).astype(int)
    data["dest_balance_increase_ratio"] = (newbalanceDest - oldbalanceDest) / (amount + 1)
    data["is_round_amount"] = (amount % 1000 == 0).astype(int)
    data["balance_dest_ratio"] = amount / (oldbalanceDest + 1)

    # ── Target-encoded 'type' ─────────────────────────────────────────────────
    if not is_training and type_encoding is not None:
        if "type" in data.columns:
            data["type_encoded"] = data["type"].map(type_encoding).fillna(global_fraud_rate)
        elif "types" in data.columns:
            # API fallback
            data["type_encoded"] = data["types"].map(type_encoding).fillna(global_fraud_rate)

    # ── Isolation Forest anomaly score ────────────────────────────────────────
    if not is_training and iso_forest is not None and iso_features:
        try:
            iso_input = data[iso_features]
            data["isolation_score"] = -iso_forest.decision_function(iso_input)
        except Exception:
            data["isolation_score"] = 0.0

    # If inference mode, map back to expected columns
    if not is_training and model_features:
        # Fill missing with 0
        for col in model_features:
            if col not in data.columns:
                data[col] = 0
        return data[model_features]

    return data
