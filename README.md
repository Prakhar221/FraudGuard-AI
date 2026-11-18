# 🛡️ FraudGuard AI: Real-Time Financial Fraud Detection

![Python Version](https://img.shields.io/badge/python-3.11-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green)
![Streamlit](https://img.shields.io/badge/Streamlit-1.25+-red)
![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-1.3+-orange)

**FraudGuard AI** is a state-of-the-art, microservices-based financial fraud detection framework. It utilizes a **Heterogeneous Penta-Ensemble Model** (combining the strengths of Random Forest, XGBoost, AdaBoost, Logistic Regression, and MLP Neural Networks) trained on the PaySim dataset to identify fraudulent financial transactions in real-time. 

To bridge the gap between "black-box" ML and human analysts, it actively incorporates **Explainable AI (SHAP)**. This provides immediate, transparent insights into exactly *why* a specific transaction was flagged or cleared.

---

## 🌟 Key Performance Features
- **Real-Time Prediction API:** Powered by a high-performance FastAPI backend capable of processing concurrent transaction evaluations.
- **Interactive Command Center:** A beautiful Streamlit dashboard capable of scanning single transactions and processing bulk historical CSV batches.
- **Explainable AI (SHAP Analysis):** Visual breakdown of the most critical risk factors driving the ensemble model's decisions.
- **Advanced Feature Engineering:** Utilizes explicit ledger discrepancy tracking (e.g., `errorBalanceOrig`) to capture sophisticated account-draining techniques that bypass standard filters.

---

## 🏗️ System Architecture

![Architecture](https://img.shields.io/badge/Architecture-Microservices-purple?style=for-the-badge)

1. **User Interface (Streamlit):** Gathers transaction data and presents intuitive visual dashboards.
2. **Backend API (FastAPI):** Central router that receives JSON telemetry, calculates real-time feature engineering variables (`amount_log`, `is_night`, `errorBalance`), and queries the model.
3. **Machine Learning Core (Scikit-Learn & XGBoost):** Evaluates the variables using soft voting across 5 distinct modeling paradigms to generate an aggregate anomaly probability and SHAP extraction.

---

## 🚀 Quick Start Guide

### Prerequisites
Ensure your terminal is opened directly in the `FraudGuardAi` project root folder.

### Step 1. Start the Backend API (FastAPI)
Run this command from the **main project folder** to start the intelligent prediction server:
```powershell
.\.venv_fraud_311\Scripts\python -m uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload
```
*Wait until you see the confirmation `Uvicorn running on http://127.0.0.1:8000`.*

### Step 2. Start the Frontend Dashboard (Streamlit)
Open a **new** terminal tab, ensure you are still in the **main project folder**, and activate the UI:
```powershell
.\.venv_fraud_311\Scripts\python -m streamlit run web/app.py
```
*The command center dashboard will automatically launch in your default web browser at `http://localhost:8501`.*

---

## 📂 Project Structure
```text
FraudGuardAi/
├── api/                 # Backend infrastructure
│   └── main.py          # FastAPI Application & Predict/Explain routing
├── web/                 # Frontend infrastructure
│   ├── app.py           # Streamlit User Interface Dashboard
│   └── assets/          # Custom visual assets & animations
├── models/              # Machine Learning core
│   ├── credit_fraud.pkl # Pre-trained Penta-Ensemble Model Weights
│   └── train.py         # Advanced training scripts (Not required for UI)
├── requirements.txt     # Python Dependencies
└── README.md            # You are here
```

---

*Academic Purpose Only - Developed for strictly educational purposes regarding Anomaly Detection architectures.*
