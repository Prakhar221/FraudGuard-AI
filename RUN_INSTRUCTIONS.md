# How to Run the Project (v3.0)

## Prerequisites
Open your terminal (PowerShell or Command Prompt) and navigate to the project root folder:
```powershell
cd "c:\Users\prakh\OneDrive\Desktop\proj\FraudGuardAi"
```

---

## Step 1: Start the Backend (FastAPI API)
Run this command from the project root to start the intelligent prediction server:
```powershell
.\.venv_fraud_311\Scripts\python -m uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload
```
*Wait until you see: `Uvicorn running on http://127.0.0.1:8000`.*

---

## Step 2: Start the Frontend Dashboard (Streamlit)
Open a **new** terminal window, navigate to the project root, and run:
```powershell
cd "c:\Users\prakh\OneDrive\Desktop\proj\FraudGuardAi"
.\.venv_fraud_311\Scripts\python -m streamlit run web/app.py
```
The Streamlit app will launch in your browser at `http://localhost:8501`.

---

## Step 3: Train Model (Optional)
If you need to retrain the Heterogeneous Stacking Ensemble model:
```powershell
cd "c:\Users\prakh\OneDrive\Desktop\proj\FraudGuardAi"
.\.venv_fraud_311\Scripts\python models/train.py
```
