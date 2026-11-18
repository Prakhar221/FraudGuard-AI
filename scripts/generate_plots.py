import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import f1_score, roc_auc_score, precision_recall_curve, confusion_matrix
import joblib
import os
import matplotlib.pyplot as plt
import seaborn as sns

def generate_plots():
    print("Generating plots...")
    current_dir = os.path.dirname(os.path.abspath(__file__))
    base_dir = os.path.abspath(os.path.join(current_dir, '..'))
    data_path = os.path.join(base_dir, 'data', 'raw', 'PS_20174392719_1491204439457_log_augmented.csv')
    model_path = os.path.join(base_dir, 'models', 'credit_fraud.pkl')
    output_dir = os.path.join(base_dir, 'docs', 'Paper Review PDF')
    
    os.makedirs(output_dir, exist_ok=True)
    
    print("Loading data...")
    data = pd.read_csv(data_path)
    
    type_mapping = {
        "PAYMENT": 3,
        "TRANSFER": 4,
        "CASH_OUT": 1,
        "DEBIT": 2,
        "CASH_IN": 0
    }
    data["type"] = data["type"].map(type_mapping)
    data = data.fillna(0)
    
    data["hour"] = data["step"] % 24
    data["errorBalanceOrig"] = data["newbalanceOrig"] + data["amount"] - data["oldbalanceOrg"]
    data["errorBalanceDest"] = data["oldbalanceDest"] + data["amount"] - data["newbalanceDest"]
    
    data["day_of_week"] = (data["step"] // 24) % 7
    data["is_night"] = data["hour"].apply(lambda x: 1 if x >= 0 and x <= 6 else 0)
    data["amount_log"] = np.log1p(data["amount"])
    data["balance_dest_ratio"] = data["amount"] / (data["oldbalanceDest"] + 1)
    
    cols_to_drop = ['nameOrig', 'nameDest', 'isFraud']
    X = data.drop([c for c in cols_to_drop if c in data.columns], axis=1)
    y = data["isFraud"]
    
    print("Splitting data...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=27, stratify=y
    )
    
    print("Loading model...")
    artifacts = joblib.load(model_path)
    voting_clf = artifacts['model']
    best_thresh_voting = artifacts['threshold']
    
    print("Predicting ensemble...")
    y_pred_proba_voting = voting_clf.predict_proba(X_test)[:, 1]
    y_pred_voting = (y_pred_proba_voting >= best_thresh_voting).astype(int)
    
    print("Generating confusion matrix...")
    cm = confusion_matrix(y_test, y_pred_voting)
    plt.figure(figsize=(8, 6))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", xticklabels=["Legitimate", "Fraudulent"], yticklabels=["Legitimate", "Fraudulent"])
    plt.title("Confusion Matrix - Penta-Ensemble Model")
    plt.xlabel("Predicted")
    plt.ylabel("Actual")
    cm_path = os.path.join(output_dir, 'confusion_matrix.png')
    plt.savefig(cm_path, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"Saved {cm_path}")
    
    print("Evaluating individual models...")
    print(f"Available estimators in saved model: {list(voting_clf.named_estimators_.keys())}")
    models_to_eval = []
    for name, clf in voting_clf.named_estimators_.items():
        if clf is not None and clf != 'drop':
            models_to_eval.append((name.upper(), clf))

    
    results = []
    for name, clf in models_to_eval:
        print(f"Predicting {name}...")
        y_pred_proba = clf.predict_proba(X_test)[:, 1]
        prec, rec, threshs = precision_recall_curve(y_test, y_pred_proba)
        with np.errstate(divide='ignore', invalid='ignore'):
            fsc = np.where((prec + rec) == 0, 0, (2 * prec * rec) / (prec + rec))
        best_idx = np.argmax(fsc)
        best_thr = threshs[best_idx]
        y_pred = (y_pred_proba >= best_thr).astype(int)
        f1 = f1_score(y_test, y_pred)
        auc = roc_auc_score(y_test, y_pred_proba)
        results.append({'Model': name, 'F1-Score': f1, 'AUC': auc})
    
    voting_f1 = f1_score(y_test, y_pred_voting)
    voting_auc = roc_auc_score(y_test, y_pred_proba_voting)
    results.append({'Model': 'Penta-Ensemble', 'F1-Score': voting_f1, 'AUC': voting_auc})
    
    df_res = pd.DataFrame(results)
    
    print("Generating model comparison plot...")
    plt.figure(figsize=(12, 7))
    df_melted = df_res.melt(id_vars='Model', var_name='Metric', value_name='Score')
    sns.barplot(x='Model', y='Score', hue='Metric', data=df_melted, palette='viridis')
    
    # Adjust y-limits dynamically
    min_score = df_melted['Score'].min()
    plt.ylim(max(0.0, min_score - 0.1), 1.0)
    
    plt.title("Model Comparison: F1-Score & AUC", fontsize=14)
    plt.xticks(rotation=45, ha='right', fontsize=12)
    plt.legend(loc='lower right', fontsize=12)
    plt.tight_layout()
    comp_path = os.path.join(output_dir, 'model_comparison.png')
    plt.savefig(comp_path, dpi=300)
    plt.close()
    print(f"Saved {comp_path}")
    
    print("Generating UMAP visualization...")
    import umap
    from sklearn.preprocessing import StandardScaler
    
    sample_size = min(10000, len(X))
    X_sample, _, y_sample, _ = train_test_split(X, y, train_size=sample_size, stratify=y, random_state=42)
    
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_sample)
    
    print("Fitting UMAP...")
    reducer = umap.UMAP(n_neighbors=15, min_dist=0.1, random_state=42)
    embedding = reducer.fit_transform(X_scaled)
    
    print("Generating UMAP plot...")
    plt.figure(figsize=(10, 8))
    # Plot legitimate transactions
    plt.scatter(embedding[y_sample == 0, 0], embedding[y_sample == 0, 1], 
                c='blue', label='Legitimate', alpha=0.5, s=10)
    # Plot fraudulent transactions
    plt.scatter(embedding[y_sample == 1, 0], embedding[y_sample == 1, 1], 
                c='red', label='Fraudulent', alpha=0.8, s=15)
    
    plt.title('UMAP Projection of Transactions', fontsize=16)
    plt.legend()
    plt.tight_layout()
    umap_path = os.path.join(output_dir, 'umap_projection.png')
    plt.savefig(umap_path, dpi=300)
    plt.close()
    print(f"Saved {umap_path}")
    
if __name__ == '__main__':
    generate_plots()
