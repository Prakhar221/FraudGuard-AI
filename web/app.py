import streamlit as st
import json
import requests as re
from streamlit_lottie import st_lottie
import time
import joblib
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import altair as alt
import os

# Page Config
st.set_page_config(
    page_title="FraudGuard AI",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Session State Initialization
from datetime import datetime, timedelta

# --- Demo prefill defaults ---
if 'demo_step' not in st.session_state:
    st.session_state.demo_step = 1
if 'demo_amount' not in st.session_state:
    st.session_state.demo_amount = 0.0
if 'demo_type_idx' not in st.session_state:
    st.session_state.demo_type_idx = 3  # Payment
if 'demo_oldbalanceorg' not in st.session_state:
    st.session_state.demo_oldbalanceorg = 0.0
if 'demo_newbalanceorg' not in st.session_state:
    st.session_state.demo_newbalanceorg = 0.0
if 'demo_oldbalancedest' not in st.session_state:
    st.session_state.demo_oldbalancedest = 0.0
if 'demo_newbalancedest' not in st.session_state:
    st.session_state.demo_newbalancedest = 0.0
if 'demo_sender' not in st.session_state:
    st.session_state.demo_sender = ""
if 'demo_receiver' not in st.session_state:
    st.session_state.demo_receiver = ""

if 'history' not in st.session_state:
    now = datetime.now()
    st.session_state.history = [
        {"Timestamp": (now - timedelta(minutes=20)).strftime("%H:%M:%S"), "Source": "C1239821", "Destination": "M928371", "Amount": 450.00, "Risk Score": 0.02, "Status": "Safe"},
        {"Timestamp": (now - timedelta(minutes=16)).strftime("%H:%M:%S"), "Source": "C9827312", "Destination": "M128371", "Amount": 12500.00, "Risk Score": 0.15, "Status": "Safe"},
        {"Timestamp": (now - timedelta(minutes=14)).strftime("%H:%M:%S"), "Source": "C6271823", "Destination": "C721638", "Amount": 250000.00, "Risk Score": 0.89, "Status": "Fraud"},
        {"Timestamp": (now - timedelta(minutes=10)).strftime("%H:%M:%S"), "Source": "C1283712", "Destination": "M827162", "Amount": 50.00, "Risk Score": 0.005, "Status": "Safe"},
        {"Timestamp": (now - timedelta(minutes=7)).strftime("%H:%M:%S"), "Source": "C7261523", "Destination": "C261524", "Amount": 9800.00, "Risk Score": 0.04, "Status": "Safe"},
        {"Timestamp": (now - timedelta(minutes=3)).strftime("%H:%M:%S"), "Source": "C1827361", "Destination": "M928172", "Amount": 180000.00, "Risk Score": 0.76, "Status": "Fraud"},
        {"Timestamp": (now - timedelta(seconds=30)).strftime("%H:%M:%S"), "Source": "C9182736", "Destination": "M129381", "Amount": 120.50, "Risk Score": 0.01, "Status": "Safe"},
    ]

# Load Lottie Animation
@st.cache_resource
def load_lottiefile(filename: str):
    try:
        # Construct absolute path to assets
        current_dir = os.path.dirname(os.path.abspath(__file__))
        filepath = os.path.join(current_dir, 'assets', filename)
        with open(filepath, "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return None

# Custom CSS for "Pro" Look
st.markdown("""
<style>
    /* Google Fonts */
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Roboto', sans-serif;
    }
    
    /* Header Styling */
    .main-header {
        font-size: 2.5rem;
        font-weight: 700;
        background: -webkit-linear-gradient(#fca311, #e5e5e5);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 0px;
    }
    
    /* Card Styling */
    .stCard {
        background-color: #1e1e1e;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        border: 1px solid #333;
    }
    
    /* Metric Styling */
    div[data-testid="stMetricValue"] {
        font-size: 1.8rem;
    }
    
    /* Button Styling */
    .stButton>button {
        width: 100%;
        background-color: #fca311;
        color: black;
        font-weight: bold;
        border: none;
        padding: 10px;
        border-radius: 5px;
        transition: all 0.3s ease;
    }
    .stButton>button:hover {
        background-color: #e59400;
        color: white;
    }
</style>
""", unsafe_allow_html=True)

# Sidebar
lottie_shield = load_lottiefile("shield.json")
with st.sidebar:
    if lottie_shield:
        st_lottie(lottie_shield, height=150, key="shield")
    else:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        img_path = os.path.join(current_dir, 'assets', 'image.png')
        if os.path.exists(img_path):
            st.image(img_path, use_column_width="auto")

    st.title("🛡️ FraudGuard AI")

    # --- API Health & Stats Widget ---
    try:
        api_url = os.getenv("API_URL", "http://127.0.0.1:8000")
        h_res = re.get(f"{api_url}/health", timeout=1)
        s_res = re.get(f"{api_url}/stats", timeout=1)
        if h_res.status_code == 200 and s_res.status_code == 200:
            h = h_res.json()
            s = s_res.json()
            st.markdown("### System Status: 🟢 Online")
            st.markdown(
                f"""
                <div style='background:#1a1a2e;border-radius:10px;padding:12px 14px;border:1px solid #333;margin-bottom:8px'>
                    <div style='color:#aaa;font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px'>⚡ API Live Metrics</div>
                    <div style='display:flex;justify-content:space-between;margin-bottom:6px'>
                        <span style='color:#ccc;font-size:0.85rem'>Uptime</span>
                        <span style='color:#fca311;font-weight:600;font-size:0.85rem'>{h['uptime']}</span>
                    </div>
                    <div style='display:flex;justify-content:space-between;margin-bottom:6px'>
                        <span style='color:#ccc;font-size:0.85rem'>Total Scanned</span>
                        <span style='color:#fff;font-weight:600;font-size:0.85rem'>{s['total_predictions']}</span>
                    </div>
                    <div style='display:flex;justify-content:space-between;margin-bottom:6px'>
                        <span style='color:#ccc;font-size:0.85rem'>Fraud Detected</span>
                        <span style='color:#ff4b4b;font-weight:600;font-size:0.85rem'>{s['fraud_count']}</span>
                    </div>
                    <div style='display:flex;justify-content:space-between'>
                        <span style='color:#ccc;font-size:0.85rem'>Fraud Rate</span>
                        <span style='color:#{'ff4b4b' if s['fraud_rate_pct'] > 20 else 'fca311'};font-weight:600;font-size:0.85rem'>{s['fraud_rate_pct']}%</span>
                    </div>
                </div>
                """,
                unsafe_allow_html=True
            )
        else:
            st.markdown("### System Status: 🟡 Degraded")
    except Exception:
        st.markdown("### System Status: 🔴 API Offline")

    # --- Live Threat Feed ---
    st.markdown("---")
    st.markdown("### 🔴 Live Threat Feed")
    recent = list(reversed(st.session_state.history[-5:])) if st.session_state.history else []
    if recent:
        for tx in recent:
            is_fraud = tx['Status'] == 'Fraud'
            border_color = '#ff4b4b' if is_fraud else '#22c55e'
            icon = '🚨' if is_fraud else '✅'
            risk_pct = f"{tx['Risk Score']:.0%}" if isinstance(tx['Risk Score'], float) else tx['Risk Score']
            amount_fmt = f"${tx['Amount']:,.0f}" if isinstance(tx['Amount'], (int, float)) else tx['Amount']
            st.markdown(
                f"""
                <div style='background:#111827;border-left:3px solid {border_color};border-radius:6px;
                            padding:8px 10px;margin-bottom:6px;'>
                    <div style='display:flex;justify-content:space-between;align-items:center'>
                        <span style='font-size:0.8rem;color:#9ca3af'>{tx['Timestamp']}</span>
                        <span style='font-size:0.75rem;color:{border_color};font-weight:700'>{icon} {tx['Status'].upper()}</span>
                    </div>
                    <div style='font-size:0.78rem;color:#d1d5db;margin-top:3px'>
                        <b style='color:#f9fafb'>{str(tx['Source'])[:10]}</b> → <b style='color:#f9fafb'>{str(tx['Destination'])[:10]}</b>
                    </div>
                    <div style='display:flex;justify-content:space-between;margin-top:3px'>
                        <span style='font-size:0.75rem;color:#fca311'>{amount_fmt}</span>
                        <span style='font-size:0.75rem;color:#9ca3af'>Risk: {risk_pct}</span>
                    </div>
                </div>
                """,
                unsafe_allow_html=True
            )
    else:
        st.caption("No transactions yet this session.")

    st.markdown("---")
    st.info("""
    **Real-Time Fraud Detection System**
    Detects anomalies in financial transactions using a Heterogeneous Penta-Ensemble Framework.

    **Developed by:**
    - **Prakhar Bhardwaj**
    - **Sourabh Kumar Verma**
    - **Satyam Kumar**
    - **Vivek Singh Bisht**
    """)

# Main Content
# Dashboard KPIs
st.markdown("### 📊 Live Command Center")
kpi1, kpi2, kpi3, kpi4 = st.columns(4)

# Calculate Metrics
total_scans = len(st.session_state.history)
fraud_detected = len([x for x in st.session_state.history if x['Status'] == 'Fraud'])
fraud_value = sum([x['Amount'] for x in st.session_state.history if x['Status'] == 'Fraud'])
avg_risk = sum([x['Risk Score'] for x in st.session_state.history]) / total_scans if total_scans > 0 else 0

kpi1.metric("Total Scans", total_scans, delta=f"+{total_scans} (Session)")
kpi2.metric("Fraud Detected", fraud_detected, delta="CRITICAL" if fraud_detected > 0 else "Normal", delta_color="inverse")
kpi3.metric("Blocked Volume", f"${fraud_value:,.2f}", delta="Saved Value")
kpi4.metric("Avg Risk Level", f"{avg_risk:.1%}", delta="Network Avg")

st.divider()

c1, c2 = st.columns([3, 1])
with c1:
    st.markdown('<p class="main-header">🛡️ Secure Transaction Analysis</p>', unsafe_allow_html=True)
    st.markdown("Enter transaction details below to scan for potential security threats.")

st.divider()

tab1, tab2, tab3, tab4 = st.tabs(["📝 Single Transaction", "📂 Batch Upload", "🧠 Model Insights", "🛡️ Compliance Firewall"])

with tab3:
    st.subheader("🎓 Project Architecture & Model Explainability")

    # Architecture Diagram
    st.markdown("#### 1. System Architecture")
    st.markdown("""
    This project uses a microservices-inspired architecture:
    - **Frontend**: Streamlit (User Interface)
    - **Backend**: FastAPI (Prediction Logic)
    - **Model**: Heterogeneous Penta-Ensemble Framework (RF, XGB, Ada, LR, MLP)
    """)

    st.graphviz_chart("""
    digraph G {
        rankdir=LR;
        node [shape=box, style=filled, fillcolor=lightblue];
        User [shape=ellipse, fillcolor=lightgrey];
        Streamlit [label="Frontend UI\\n(Streamlit)"];
        FastAPI [label="Backend API\\n(FastAPI)"];
        Model [label="ML Model\\n(Penta-Ensemble)", fillcolor=lightgreen];

        User -> Streamlit [label="Interacts"];
        Streamlit -> FastAPI [label="Sends Data (JSON)"];
        FastAPI -> Model [label="Features"];
        Model -> FastAPI [label="Prediction"];
        FastAPI -> Streamlit [label="Response"];
    }
    """)

    st.divider()

    # --- Transaction Network Graph ---
    st.markdown("#### 2. Transaction Network Graph")
    st.info("Each bubble is a transaction from your session. **Size** = Amount, **Colour** = Risk Score (red = high risk). Hover for details.")

    if len(st.session_state.history) >= 2:
        net_df = pd.DataFrame(st.session_state.history).copy()
        net_df["Order"] = range(len(net_df))
        # Jitter X slightly so overlapping nodes are visible
        np.random.seed(42)
        net_df["jitter_x"] = net_df["Order"] + np.random.uniform(-0.3, 0.3, len(net_df))
        net_df["jitter_y"] = np.random.uniform(0.2, 0.8, len(net_df))
        net_df["AmountSafe"] = net_df["Amount"].apply(lambda x: x if isinstance(x, (int, float)) else 0)
        net_df["RiskSafe"] = net_df["Risk Score"].apply(lambda x: x if isinstance(x, (int, float)) else 0)
        # Normalise bubble size
        max_amt = net_df["AmountSafe"].max() or 1
        net_df["BubbleSize"] = ((net_df["AmountSafe"] / max_amt) * 900 + 100).clip(upper=1200)

        network_chart = alt.Chart(net_df).mark_circle(opacity=0.85, stroke="#1e1e2e", strokeWidth=1).encode(
            x=alt.X("jitter_x:Q", axis=None, scale=alt.Scale(zero=False)),
            y=alt.Y("jitter_y:Q", axis=None, scale=alt.Scale(domain=[0, 1])),
            size=alt.Size("BubbleSize:Q", legend=None, scale=alt.Scale(range=[80, 1200])),
            color=alt.Color(
                "RiskSafe:Q",
                scale=alt.Scale(domain=[0, 0.5, 1.0], range=["#22c55e", "#fca311", "#ff4b4b"]),
                legend=alt.Legend(title="Risk Score")
            ),
            tooltip=[
                alt.Tooltip("Timestamp", title="Time"),
                alt.Tooltip("Source", title="Sender"),
                alt.Tooltip("Destination", title="Recipient"),
                alt.Tooltip("AmountSafe", title="Amount ($)", format=",.2f"),
                alt.Tooltip("RiskSafe", title="Risk Score", format=".2%"),
                alt.Tooltip("Status", title="Verdict")
            ]
        ).properties(
            height=300,
            background="#0e1117"
        ).configure_view(strokeWidth=0)

        st.altair_chart(network_chart, use_container_width=True)
        st.caption("Figure 2: Transaction network — bubble size reflects transaction amount; colour encodes fraud probability.")
    else:
        st.info("📊 Analyse at least 2 transactions (or process a batch) to populate the network graph.")
    
    st.divider()
    
    # Feature Importance
    st.markdown("#### 2. Feature Importance Analysis")
    st.info("This chart explains **which factors** the model considers most important when detecting fraud.")
    
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(current_dir, '..', 'models', 'credit_fraud.pkl')
        model = joblib.load(model_path)
        
        # Map cryptic feature names to human-readable labels
        feature_map = {
            "step": "Time of Day (Hour)",
            "type": "Transaction Type",
            "amount": "Transaction Amount",
            "oldbalanceOrg": "Sender Initial Balance",
            "newbalanceOrig": "Sender Final Balance",
            "oldbalanceDest": "Receiver Initial Balance",
            "newbalanceDest": "Receiver Final Balance",
            "isFlaggedFraud": "System Flag (High Value)",
            "errorBalanceOrig": "Sender Balance Discrepancy",
            "errorBalanceDest": "Receiver Balance Discrepancy",
            "hour": "Hour of Day",
            "day_of_week": "Day of Week",
            "is_night": "Is Night Transaction",
            "amount_log": "Log(Amount)",
            "balance_dest_ratio": "Amount/Dest Balance Ratio"
        }
        
        # Handle dict format vs new format
        if isinstance(model, dict):
            # It's our new dict format
            feature_names = model.get('features', ["step", "type", "amount", "oldbalanceOrg", "newbalanceOrig", "oldbalanceDest", "newbalanceDest", "isFlaggedFraud"])
            
            # Check if pre-calculated importances exist (for VotingClassifier)
            if 'feature_importances' in model:
                importances = model['feature_importances']
            elif hasattr(model.get('model'), 'feature_importances_'):
                 importances = model['model'].feature_importances_
            else:
                 importances = np.zeros(len(feature_names))

        else:
             # Fallback for old list
            feature_names = ["step", "type", "amount", "oldbalanceOrg", "newbalanceOrig", "oldbalanceDest", "newbalanceDest", "isFlaggedFraud"]
            if hasattr(model, 'feature_importances_'):
                importances = model.feature_importances_
            else:
                importances = np.zeros(len(feature_names))

        # Ensure lengths match
        if len(feature_names) != len(importances):
             # Try resizing or create defaults if mismatch
             min_len = min(len(feature_names), len(importances))
             feature_names = feature_names[:min_len]
             importances = importances[:min_len]

        feat_df = pd.DataFrame({
            "Feature": [feature_map.get(f, f) for f in feature_names], 
            "Importance": importances
        }).sort_values(by="Importance", ascending=False).head(7)
            
        # Horizontal Bar Chart for better readability
        bars = alt.Chart(feat_df).mark_bar(color='#fca31180').encode(
            x=alt.X('Importance', title='Impact Power (0-1)'),
            y=alt.Y('Feature', sort='-x', title=''),
            tooltip=['Feature', alt.Tooltip('Importance', format='.1%')]
        )
        
        text = bars.mark_text(
            align='left',
            baseline='middle',
            dx=3,  # Nudges text to right so it doesn't overlap with the bar
            color='white'
        ).encode(
            text=alt.Text('Importance', format='.1%')
        )
        
        st.altair_chart((bars + text).properties(height=300), width="stretch")
        st.caption("Figure 1: Top factors driving the AI's fraud decisions.")

    except Exception as e:
        st.warning(f"Could not load feature importance: {e}")
        # Fallback static data if file not found (for demo purposes if running remotely without pkl)
        st.warning("Showing theoretical importance distribution (Model file unavailable).")
        data = {"oldbalanceOrg": 0.35, "amount": 0.25, "newbalanceOrig": 0.20, "type": 0.10, "step": 0.05, "oldbalanceDest": 0.03, "newbalanceDest": 0.02}
        st.bar_chart(data)

with tab1:
    # --- Quick Demo Buttons ---
    st.markdown("##### ⚡ Quick Demo")
    _TYPES_LIST = ["Cash In", "Cash Out", "Debit", "Payment", "Transfer"]
    demo_col1, demo_col2, demo_col3 = st.columns([1, 1, 4])
    with demo_col1:
        if st.button("🚨 Load Fraud Example", key="btn_fraud_demo"):
            # Realistic CASH_OUT fraud: sender drains account, receiver gets nothing logged
            st.session_state.demo_sender = "C6271823"
            st.session_state.demo_receiver = "C721638"
            st.session_state.demo_step = 206
            st.session_state.demo_amount = 245000.00
            st.session_state.demo_type_idx = 1   # Cash Out
            st.session_state.demo_oldbalanceorg = 245000.00
            st.session_state.demo_newbalanceorg = 0.00
            st.session_state.demo_oldbalancedest = 0.00
            st.session_state.demo_newbalancedest = 0.00
            st.toast("🚨 Fraud example loaded!", icon="🚨")
    with demo_col2:
        if st.button("✅ Load Safe Example", key="btn_safe_demo"):
            st.session_state.demo_sender = "C1239821"
            st.session_state.demo_receiver = "M928371"
            st.session_state.demo_step = 12
            st.session_state.demo_amount = 450.00
            st.session_state.demo_type_idx = 3   # Payment
            st.session_state.demo_oldbalanceorg = 8000.00
            st.session_state.demo_newbalanceorg = 7550.00
            st.session_state.demo_oldbalancedest = 300.00
            st.session_state.demo_newbalancedest = 750.00
            st.toast("✅ Safe example loaded!", icon="✅")

    st.markdown(
        "<div style='font-size:0.75rem;color:#6b7280;margin-bottom:8px'>Use the buttons above to pre-fill all fields with a known fraud or safe transaction for a quick demo.</div>",
        unsafe_allow_html=True
    )
    st.divider()

    with st.container():
        col_src, col_dest = st.columns(2)

        with col_src:
            st.subheader("📤 Source Account")
            sender_name = st.text_input("Account ID", value=st.session_state.demo_sender, placeholder="Ex: C12345678", key="input_sender")
            oldbalanceorg = st.number_input("Current Balance ($)", min_value=0.0, value=st.session_state.demo_oldbalanceorg, format="%.2f", key="input_oldbalanceorg")
            newbalanceorg = st.number_input("Post-Transaction Balance ($)", min_value=0.0, value=st.session_state.demo_newbalanceorg, format="%.2f", key="input_newbalanceorg")

        with col_dest:
            st.subheader("📥 Destination Account")
            receiver_name = st.text_input("Recipient ID", value=st.session_state.demo_receiver, placeholder="Ex: M12345678", key="input_receiver")
            oldbalancedest = st.number_input("Recipient Balance Before ($)", min_value=0.0, value=st.session_state.demo_oldbalancedest, format="%.2f", key="input_oldbalancedest")
            newbalancedest = st.number_input("Recipient Balance After ($)", min_value=0.0, value=st.session_state.demo_newbalancedest, format="%.2f", key="input_newbalancedest")

    st.divider()

    col_tx, col_meta = st.columns(2)

    with col_tx:
        st.subheader("💸 Transaction Details")
        amount = st.number_input("Transaction Amount ($)", min_value=0.0, value=st.session_state.demo_amount, format="%.2f", key="input_amount")
        types_map = {"Cash In": 0, "Cash Out": 1, "Debit": 2, "Payment": 3, "Transfer": 4}
        selected_type = st.selectbox("Transaction Type", list(types_map.keys()), index=st.session_state.demo_type_idx, key="input_type")
        types = types_map[selected_type]

    with col_meta:
        st.subheader("⚙️ Meta-Data")
        step = st.slider("Processing Time (Hours)", 0, 744, value=st.session_state.demo_step, key="input_step")
        isflaggedfraud = 1 if amount >= 200000 else 0
        st.caption(f"System Auto-Flag: {'🚩 High Value' if isflaggedfraud else '✅ Standard'}")
    
    # Analysis Button (Single)
    st.markdown("###")
    if st.button("🔍 ANALYZE TRANSACTION"):
        values = {
            "step": step,
            "types": types,
            "amount": amount,
            "oldbalanceorig": oldbalanceorg,
            "newbalanceorig": newbalanceorg,
            "oldbalancedest": oldbalancedest,
            "newbalancedest": newbalancedest,
            "isflaggedfraud": isflaggedfraud
        }
        
        try:
            # Animation & Progress Simulation
            with st.status("Initiating Protocol...", expanded=True) as status:
                st.write("🔌 Connecting to Secure Server...")
                time.sleep(0.6)
                st.write("🧠 Engaging Penta-Ensemble Model...")
                time.sleep(0.6)
                st.write("🔍 Scanning Transaction Patterns...")
                time.sleep(0.6)
                
                api_url = os.getenv("API_URL", "http://127.0.0.1:8000")
                res = re.post(f"{api_url}/predict", json=values)
                resp = res.json()
                status.update(label="Analysis Complete", state="complete", expanded=False)
                
            prediction = resp["result"]
            probability = resp["probability"]
            
            # Add to History
            st.session_state.history.append({
                "Timestamp": time.strftime("%H:%M:%S"),
                "Source": sender_name,
                "Destination": receiver_name,
                "Amount": amount,
                "Risk Score": probability,
                "Status": "Fraud" if prediction == "Fraudulent" else "Safe"
            })
            
            # Result Display
            st.markdown("---")
            
            types_name = ["Cash In", "Cash Out", "Debit", "Payment", "Transfer"]
            type_str = types_name[types] if types < len(types_name) else "Unknown"
            
            rules_text = "None"
            triggered_rules = resp.get("triggered_rules", [])
            if triggered_rules:
                rules_text = "\n".join([f"- [{r['name']}] (Severity: {r['severity']})\n    Description: {r['description']}" for r in triggered_rules])
            
            brief_content = f"""======================================================================
FRAUDGUARD AI - SECURITIES & COMPLIANCE INVESTIGATOR CASE BRIEF
======================================================================
Report Generated : {time.strftime('%Y-%m-%d %H:%M:%S')}
Investigation ID : FG-CASE-{np.random.randint(100000, 999999)}
Verdict Status   : {resp.get('final_verdict', 'N/A')}

TRANSACTION METRICS
-------------------
Source Account      : {sender_name}
Destination Account : {receiver_name}
Transaction Amount  : ${amount:,.2f}
Transaction Type    : {type_str}
Processing Time     : Step {step} ({step % 24}:00 Hours)

MODEL RISK METRICS
------------------
Classifier Model    : {resp.get('model_used', 'Stacking Ensemble')}
Model Risk Score    : {probability:.2%}
Execution Latency   : {resp.get('latency_ms', 0.0):.1f} ms

COMPLIANCE & HEURISTIC FIREWALL
-------------------------------
Unified Risk Verdict: {resp.get('final_verdict', 'N/A')}
Triggered Rules     : {len(triggered_rules)}
{rules_text}

CLASSIFIED FRAUD TYPOLOGY
-------------------------
Classified Pattern  : {resp.get('fraud_typology', 'None')}
Recommended Action  : {resp.get('recommended_action', 'None')}

RECOMMENDED ACTION CHECKLIST
----------------------------
[ ] Flag account {sender_name} for suspicious activity.
[ ] Hold/Freeze transaction funds (${amount:,.2f}).
[ ] Send multi-factor verification prompt to customer device.
[ ] Initiate KYC re-verification on account {receiver_name}.
[ ] File regulatory SAR/STR report if fraud consensus is unanimous.

Investigator Signature: ___________________________
Audit Approved By     : ___________________________ Date: _________________
======================================================================"""

            col_title, col_download = st.columns([3, 1])
            with col_title:
                st.subheader("📊 Examination Report")
            with col_download:
                st.download_button(
                    label="📥 Export Case Brief (.txt)",
                    data=brief_content,
                    file_name=f"case_brief_{sender_name}_{int(time.time())}.txt",
                    mime="text/plain"
                )
            
            r_col1, r_col2, r_col3, r_col4 = st.columns(4)
            
            with r_col1:
                st.metric("Unified Verdict", resp.get("final_verdict", prediction))
                
            with r_col2:
                st.metric("Fraud Probability", f"{probability:.2%}")
                st.progress(probability)
                
            with r_col3:
                st.metric("Model Evaluator", resp.get("model_used", "Stacking Ensemble"))
                
            with r_col4:
                st.metric("Execution Latency", f"{resp.get('latency_ms', 0.0):.1f} ms")

            # Typology Alert box
            typology = resp.get("fraud_typology", "None")
            if typology != "None":
                st.warning(f"""
                **🛡️ DETECTED FRAUD TYPOLOGY: {typology}**
                
                **Recommended Action:** {resp.get('recommended_action')}
                """)

            # Rules Violations Alert box
            if triggered_rules:
                st.error(f"""
                **⚠️ COMPLIANCE RULE TRIGGERED ({len(triggered_rules)} rules violated)**
                """)
                for rule in triggered_rules:
                    st.write(f"- **{rule['name']}** [{rule['severity']}]: {rule['description']}")

            # detailed alert
            if prediction == "Fraudulent" or len(triggered_rules) > 0:
                st.error(f"""
                **🚨 SECURITY ALERT TRIGGERED**
                
                This transaction exhibits patterns consistent with financial fraud.
                - **Type:** {selected_type}
                - **Amount:** ${amount:,.2f}
                - **Risk Score:** {probability:.4f}
                
                **Action Required:** Immediate freeze recommended.
                """)
                st.toast("🚨 Threat Detected!", icon="🚨")
            else:
                st.success(f"""
                **✅ TRANSACTION CLEARED**
                
                No anomalies detected. Proceed with processing.
                - **Type:** {selected_type}
                - **Amount:** ${amount:,.2f}
                """)
                st.toast("✅ Verification Successful", icon="✅")
                
        except Exception as e:
            st.error(f"❌ Connection Error: Ensure Backend is running on Port 8000. Details: {e}")
        
        # ---------------------------
        # Explainable AI (SHAP)
        # ---------------------------
        if 'prediction' in locals(): # Only run if prediction succeeded
            st.markdown("---")
            st.subheader("🤖 AI Explanation (SHAP)")
            st.info("Why did the model make this decision? This chart shows how each feature pushed the risk score higher (Red) or lower (Blue).")
            
            try:
                # Call Explain Endpoint
                api_url = os.getenv("API_URL", "http://127.0.0.1:8000")
                exp_res = re.post(f"{api_url}/explain", json=values)
                if exp_res.status_code == 200:
                    explanation = exp_res.json()
                    
                    if "error" in explanation:
                        st.warning(f"Explanation unavailable: {explanation['error']}")
                    else:
                        shap_values = explanation["shap_values"]
                        feature_names_list = explanation["feature_names"]
                        
                        # Create DataFrame for Altair
                        # We map feature names to human-readable names using feature_map (defined earlier, need fallback here)
                        map_local = {
                            "step": "Time of Day (Hour)",
                            "type": "Transaction Type",
                            "amount": "Transaction Amount",
                            "oldbalanceOrg": "Sender Initial Balance",
                            "newbalanceOrig": "Sender Final Balance",
                            "oldbalanceDest": "Receiver Initial Balance",
                            "newbalanceDest": "Receiver Final Balance",
                            "isFlaggedFraud": "System Flag (High Value)",
                            "errorBalanceOrig": "Sender Balance Discrepancy",
                            "errorBalanceDest": "Receiver Balance Discrepancy",
                            "hour": "Hour of Day",
                            "day_of_week": "Day of Week",
                            "is_night": "Is Night Transaction",
                            "amount_log": "Log(Amount)",
                            "balance_dest_ratio": "Amount/Dest Balance Ratio"
                        }
                        readable_names = [map_local.get(f, f) for f in feature_names_list]
                        
                        explain_df = pd.DataFrame({
                            "Feature": readable_names,
                            "Impact": shap_values,
                            "Color": ["Increase Risk" if x > 0 else "Decrease Risk" for x in shap_values]
                        })
                        
                        # Filter for top impactful features (Top 8 absolute impact)
                        explain_df["AbsImpact"] = explain_df["Impact"].abs()
                        explain_df = explain_df.sort_values(by="AbsImpact", ascending=False).head(8)
                        
                        # Chart
                        shap_chart = alt.Chart(explain_df).mark_bar().encode(
                            x=alt.X('Impact', title='Impact on Fraud Probability'),
                            y=alt.Y('Feature', sort='-x', title=''),
                            color=alt.Color('Color', scale=alt.Scale(domain=['Increase Risk', 'Decrease Risk'], range=['#ff4b4b', '#1f77b4'])),
                            tooltip=['Feature', 'Impact']
                        ).properties(height=350)
                        
                        st.altair_chart(shap_chart, width="stretch")
                        
                else:
                    st.warning("⚠️ Could not retrieve explanation from server.")
            except Exception as e:
                st.warning(f"Could not generate explanation: {e}")

with tab2:
    st.subheader("📂 Batch Transaction Processor")
    st.verified = False
    uploaded_file = st.file_uploader("Upload CSV File (Requires: step, type, amount, etc.)", type=["csv"])
    
    # Template download
    sample_csv = pd.DataFrame({
        "step": [1, 1],
        "type": ["PAYMENT", "TRANSFER"],
        "amount": [100.0, 500000.0],
        "nameOrig": ["C12345", "C67890"],
        "oldbalanceOrg": [1000.0, 500000.0],
        "newbalanceOrig": [900.0, 0.0],
        "nameDest": ["M12345", "M67890"],
        "oldbalanceDest": [0.0, 0.0],
        "newbalanceDest": [0.0, 0.0]
    }).to_csv(index=False).encode('utf-8')
    
    st.download_button("download sample.csv", sample_csv, "sample_batch.csv", "text/csv")
    
    st.divider()

    if uploaded_file is not None:
        try:
            import pandas as pd
            df_upload = pd.read_csv(uploaded_file)
            st.dataframe(df_upload.head())
            
            col_opts, col_btn = st.columns([2, 1])
            with col_opts:
                include_explanations = st.checkbox("Include AI Explanations (Slower but detailed)", value=True)
            
            with col_btn:
                start_btn = st.button("🚀 Process Batch")

            if start_btn:
                progress_bar = st.progress(0)
                status_text = st.empty()
                
                results_list = []
                
                processed_count = 0
                fraud_count = 0
                update_interval = max(1, len(df_upload) // 20)
                
                for index, row in df_upload.iterrows():
                    # Feature Mapping
                    row_lower = {key.lower(): val for key, val in row.items()}
                    type_str = str(row_lower.get('type', 'Payment')).strip().title()
                    types_map = {"Cash In": 0, "Cash Out": 1, "Debit": 2, "Payment": 3, "Transfer": 4}
                    type_val = types_map.get(type_str, 3) 
                    
                    values = {
                        "step": int(row_lower.get('step', 1)),
                        "types": type_val,
                        "amount": float(row_lower.get('amount', 0.0)),
                        "oldbalanceorig": float(row_lower.get('oldbalanceorg', 0.0)),
                        "newbalanceorig": float(row_lower.get('newbalanceorig', 0.0)),
                        "oldbalancedest": float(row_lower.get('oldbalancedest', 0.0)),
                        "newbalancedest": float(row_lower.get('newbalancedest', 0.0)),
                        "isflaggedfraud": 1 if float(row_lower.get('amount', 0)) >= 200000 else 0
                    }
                    
                    top_factor = "N/A"
                    
                    try:
                        # 1. Predict
                        api_url = os.getenv("API_URL", "http://127.0.0.1:8000")
                        res = re.post(f"{api_url}/predict", json=values)
                        if res.status_code == 200:
                            resp = res.json()
                            pred = resp["result"]
                            prob = resp["probability"]
                            
                            # 2. Explain (if requested)
                            if include_explanations and (pred == "Fraudulent" or pred == "Not Fraudulent"):
                                try:
                                    exp_res = re.post(f"{api_url}/explain", json=values)
                                    if exp_res.status_code == 200:
                                        explanation = exp_res.json()
                                        if "error" not in explanation:
                                            shap_vals = explanation["shap_values"]
                                            feat_names = explanation["feature_names"]
                                            zipped = sorted(zip(feat_names, shap_vals), key=lambda x: x[1], reverse=True)
                                            map_local = {
                                                "amount": "Transaction Amount",
                                                "oldbalanceOrg": "Sender Initial Balance",
                                                "errorBalanceOrig": "Sender Balance Discrepancy",
                                                "errorBalanceDest": "Receiver Balance Discrepancy",
                                                "newbalanceOrig": "Sender Final Balance",
                                                "oldbalanceDest": "Receiver Initial Balance",
                                                "newbalanceDest": "Receiver Final Balance"
                                            }
                                            if zipped[0][1] > 0:
                                               friendly_name = map_local.get(zipped[0][0], zipped[0][0])
                                               top_factor = f"🚨 {friendly_name} (+{zipped[0][1]:.2f})"
                                            else:
                                               top_factor = "✅ Low Risk Profile"
                                except:
                                    pass

                            # Store Result
                            results_list.append({
                                "ID": str(row_lower.get('nameorig', f'TXN-{index}')),
                                "Amount": f"${values['amount']:,.2f}",
                                "Status": "Fraud" if pred == "Fraudulent" else "Safe",
                                "Risk Score": f"{prob:.2%}",
                                "Top Risk Factor": top_factor
                            })
                            
                            # Add to Session History if fraud (or limit size)
                            if pred == "Fraudulent" or len(st.session_state.history) < 100:
                                st.session_state.history.append({
                                    "Timestamp": time.strftime("%H:%M:%S"),
                                    "Source": str(row_lower.get('nameorig', 'Unknown')),
                                    "Destination": str(row_lower.get('namedest', 'Unknown')),
                                    "Amount": values['amount'],
                                    "Risk Score": prob,
                                    "Status": "Fraud" if pred == "Fraudulent" else "Safe"
                                })
                            
                            if pred == "Fraudulent":
                                fraud_count += 1
                        
                    except Exception as e:
                        print(f"Error processing row {index}: {e}")
                        
                    processed_count += 1
                    
                    if processed_count % update_interval == 0 or processed_count == len(df_upload):
                        progress_bar.progress(processed_count / len(df_upload))
                        status_text.text(f"Processing {processed_count}/{len(df_upload)} transactions...")
                    
                st.success(f"✅ Batch Complete! {len(df_upload)} scanned, {fraud_count} potential threats found.")
                
                # Show Results Code
                res_df = pd.DataFrame(results_list)
                st.dataframe(res_df.style.apply(lambda x: ['background-color: #ff4b4b' if x.Status == 'Fraud' else '' for _ in x], axis=1), width="stretch")
                
                # Download Result
                csv_res = res_df.to_csv(index=False).encode('utf-8')
                st.download_button(
                    "📥 Download Analysis Report",
                    csv_res,
                    "fraud_analysis_report.csv",
                    "text/csv",
                    key='download-batch-res'
                )
                
        except Exception as e:
            st.error(f"Error reading file: {e}")

with tab4:
    st.subheader("🛡️ Compliance Firewall & Custom Heuristics")
    st.info("Heuristic firewall rules are run dynamically beside the ML ensemble core to enforce business rules.")
    
    # Load and render rules
    api_url = os.getenv("API_URL", "http://127.0.0.1:8000")
    try:
        rules_res = re.get(f"{api_url}/rules", timeout=2)
        if rules_res.status_code == 200:
            rules_list = rules_res.json()
            
            # Rule grid layout
            rule_cols = st.columns(2)
            for i, r in enumerate(rules_list):
                col = rule_cols[i % 2]
                with col:
                    st.markdown(
                        f"""
                        <div style='background:#1e1e2e; border:1px solid #333; border-radius:10px; padding:15px; margin-bottom:15px'>
                            <div style='display:flex; justify-content:space-between; align-items:center'>
                                <span style='font-size:1.1rem; font-weight:bold; color:#fff'>{r['name']}</span>
                                <span style='background:#{'ff4b4b' if r['severity'] == 'Critical' else ('fca311' if r['severity'] == 'High' else '1f77b4')}; color:#fff; font-size:0.75rem; font-weight:bold; padding:2px 8px; border-radius:12px'>{r['severity']}</span>
                            </div>
                            <p style='color:#bbb; font-size:0.8rem; margin:8px 0'>{r['description']}</p>
                            <div style='background:#0e1117; font-family:monospace; font-size:0.75rem; padding:6px; border-radius:4px; margin-bottom:10px; color:#fca311'>
                                Condition: {r['condition']}
                            </div>
                            <div style='display:flex; justify-content:space-between; align-items:center'>
                                <span style='font-size:0.8rem; color:#aaa'>Violations Triggered: <b>{r['violations_count']}</b></span>
                                <span style='font-size:0.8rem; font-weight:bold; color:{'#fca311' if r['active'] else '#888'}'>{'🟢 Active' if r['active'] else '🔴 Disabled'}</span>
                            </div>
                        </div>
                        """,
                        unsafe_allow_html=True
                    )
                    # Button to toggle active status
                    if st.button(f"{'Disable' if r['active'] else 'Enable'} '{r['name']}'", key=f"tgl_{r['id']}"):
                        re.post(f"{api_url}/rules/toggle", json={"id": r['id']})
                        st.rerun()
            
            st.divider()
            
            # Form to add custom rule
            st.markdown("#### ➕ Add Custom Firewall Rule")
            with st.form("custom_rule_form"):
                cr_name = st.text_input("Rule Name", placeholder="e.g., Night Transaction Threshold")
                cr_desc = st.text_input("Description", placeholder="Block all nighttime transfers over $10,000")
                cr_cond = st.text_input("Expression Condition", placeholder="amount > 10000 and is_night == 1")
                cr_sev = st.selectbox("Severity", ["Critical", "High", "Medium", "Low"], index=2)
                
                submitted = st.form_submit_button("Deploy Custom Rule")
                if submitted:
                    if cr_name and cr_desc and cr_cond:
                        payload = {
                            "name": cr_name,
                            "description": cr_desc,
                            "condition": cr_cond,
                            "severity": cr_sev
                        }
                        add_res = re.post(f"{api_url}/rules/add", json=payload)
                        if add_res.status_code == 200:
                            st.success("Custom firewall rule compiled and deployed successfully!")
                            time.sleep(1)
                            st.rerun()
                        else:
                            try:
                                err_detail = add_res.json().get("detail", "Compilation failed")
                            except:
                                err_detail = "Failed to parse API error"
                            st.error(f"Error compiling custom rule condition: {err_detail}")
                    else:
                        st.warning("Please fill in all custom rule fields.")
                        
        else:
            st.warning("Could not load rules from backend API.")
    except Exception as e:
        st.error(f"Backend API is offline: {e}")

# Session History Section
if st.session_state.history:
    st.divider()
    st.markdown("### 📜 Session Activity Log")
    
    # History Controls
    col_hist_1, col_hist_2 = st.columns([1, 6])
    with col_hist_1:
        if st.button("🗑️ Clear History"):
            st.session_state.history = []
            st.rerun()
    with col_hist_2:
        if st.button("↩️ Undo Last"):
            if len(st.session_state.history) > 0:
                st.session_state.history.pop()
                st.rerun()
    
    # Convert to DataFrame for display
    import pandas as pd
    df = pd.DataFrame(st.session_state.history)
    
    # Style the dataframe (Highlight Fraud rows)
    def highlight_fraud(row):
        return ['background-color: #ff4b4b' if row.Status == 'Fraud' else '' for _ in row]
    
    st.dataframe(df.style.apply(highlight_fraud, axis=1), width="stretch")
    
    # Advanced Altair Chart
    
    st.markdown("### 📈 Risk Trend Analysis")
    
    # Create valid dataframe for plotting
    chart_df = df.copy()
    chart_df["Order"] = range(len(chart_df))
    
    # Base Chart
    base = alt.Chart(chart_df).encode(
        x=alt.X('Order', axis=alt.Axis(title='Transaction Sequence')),
        tooltip=['Timestamp', 'Source', 'Amount', 'Risk Score', 'Status']
    )

    # Line Layer
    line = base.mark_line(color='#fca311', strokeWidth=3).encode(
        y=alt.Y('Risk Score', scale=alt.Scale(domain=[0, 1]), axis=alt.Axis(title='Fraud Probability'))
    )
    
    # Area Layer (Gradient)
    area = base.mark_area(opacity=0.3, color='#fca311').encode(
        y=alt.Y('Risk Score')
    )
    
    # Points Layer (for hover interaction)
    points = base.mark_circle(size=60, color='white').encode(
        y=alt.Y('Risk Score')
    )
    
    # Threshold Line (Red line at 0.5)
    threshold = alt.Chart(pd.DataFrame({'y': [0.5]})).mark_rule(color='red', strokeDash=[5, 5]).encode(
        y='y'
    )
    
    final_chart = (area + line + points + threshold).properties(
        height=300
    ).interactive()
    
    st.altair_chart(final_chart, width="stretch")
    
    # Download Button
    csv = df.to_csv(index=False).encode('utf-8')
    st.download_button(
        "📥 Download Activity Log",
        csv,
        "fraud_guard_log.csv",
        "text/csv",
        key='download-csv'
    )
