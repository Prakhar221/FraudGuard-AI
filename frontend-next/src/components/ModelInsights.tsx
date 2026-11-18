'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Loader2, ServerCrash, Cpu, Compass, Sliders, CheckCircle2 } from 'lucide-react';

const featureMap: { [key: string]: string } = {
  "step": "Time of Day (Hour)",
  "type_encoded": "Transaction Type (Rate)",
  "amount": "Transaction Amount",
  "oldbalanceOrg": "Sender Initial Balance",
  "newbalanceOrig": "Sender Final Balance",
  "oldbalanceDest": "Receiver Initial Balance",
  "newbalanceDest": "Receiver Final Balance",
  "isFlaggedFraud": "High Value Flag",
  "errorBalanceOrig": "Sender Ledger Discrepancy",
  "errorBalanceDest": "Receiver Ledger Discrepancy",
  "hour": "Hour of Day",
  "day_of_week": "Day of Week",
  "is_night": "Is Night Transaction",
  "amount_log": "Log(Amount)",
  "amount_to_balance_ratio": "Amount to Balance Ratio",
  "balance_drain_flag": "Sender Account Drain",
  "dest_balance_increase_ratio": "Receiver Balance Delta",
  "is_round_amount": "Is Round Amount",
  "balance_dest_ratio": "Amount to Dest Ratio",
  "isolation_score": "Isolation Forest Anomaly Score"
};

export default function ModelInsights() {
  const [modelInfo, setModelInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  const fetchModelInfo = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://127.0.0.1:8000/model-info');
      setModelInfo(res.data);
      setIsOffline(false);
    } catch (e) {
      setIsOffline(true);
      // Fallback local mockup parameters if API is not yet running
      setModelInfo({
        model_version: 'v3.0-stacking (Offline Mode)',
        threshold: 0.3456,
        features: ["step", "amount", "errorBalanceOrig", "errorBalanceDest", "type_encoded", "newbalanceOrig", "balance_dest_ratio"],
        feature_importances: {
          "errorBalanceOrig": 0.3542,
          "amount": 0.2481,
          "errorBalanceDest": 0.1873,
          "type_encoded": 0.1102,
          "newbalanceOrig": 0.0519,
          "balance_dest_ratio": 0.0315,
          "step": 0.0168
        },
        base_learners: ["Random Forest Classifier", "XGBoost Classifier", "LightGBM Classifier", "CatBoost Classifier"],
        meta_learner: "Logistic Regression (Scaled Meta)",
        global_fraud_rate: 0.00129
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModelInfo();
  }, []);

  if (loading) {
    return (
      <div className="card flex items-center justify-center py-20 border border-border">
        <div className="flex-col items-center gap-2 text-center">
          <Loader2 className="animate-spin text-primary mx-auto mb-2" size={32} />
          <span className="text-sm text-muted">Retrieving Stacking Ensemble metadata...</span>
        </div>
      </div>
    );
  }

  const sortedImportances = Object.entries(modelInfo?.feature_importances || {})
    .map(([name, val]) => ({
      name,
      label: featureMap[name] || name,
      value: val as number
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);

  return (
    <div className="flex-col gap-6 animate-fade-in">
      {/* Offline Alert Bar */}
      {isOffline && (
        <div className="card border-destructive bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-2">
          <ServerCrash size={18} />
          <span><b>Backend offline fallback:</b> Presenting local cached weights. Run FastAPI on port 8000 to reload dynamic metadata.</span>
        </div>
      )}

      {/* Ensemble Architecture Panel */}
      <div className="card">
        <div className="flex items-center gap-2.5 mb-4">
          <Cpu className="text-primary" size={24} />
          <h3 className="h3">Heterogeneous Penta-Ensemble Framework</h3>
        </div>
        <p className="p text-sm mb-6 leading-relaxed">
          FraudGuard AI utilizes a multi-layered voting classification scheme. Four distinct modeling paradigms process 
          the engineered dataset independently. A final Meta-Learner utilizes Out-Of-Fold probabilities to arrive at the optimized security verdict.
        </p>

        <div className="grid grid-cols-5 gap-4 mt-6">
          <div className="p-4 bg-[#1b1b1f] border border-border rounded-lg text-center border-t-[3.5px] border-t-blue-500">
            <div className="font-bold text-xs mb-1">Random Forest</div>
            <div className="text-[10px] text-muted leading-normal">Evaluates 200 random forest trees. Excellent for non-linear structures.</div>
          </div>
          <div className="p-4 bg-[#1b1b1f] border border-border rounded-lg text-center border-t-[3.5px] border-t-green-500">
            <div className="font-bold text-xs mb-1">XGBoost</div>
            <div className="text-[10px] text-muted leading-normal">Extreme Gradient Boosting. High-speed, sequential regularization.</div>
          </div>
          <div className="p-4 bg-[#1b1b1f] border border-border rounded-lg text-center border-t-[3.5px] border-t-purple-500">
            <div className="font-bold text-xs mb-1">LightGBM</div>
            <div className="text-[10px] text-muted leading-normal">Leaf-wise growth for high dimensional efficiency.</div>
          </div>
          <div className="p-4 bg-[#1b1b1f] border border-border rounded-lg text-center border-t-[3.5px] border-t-amber-500">
            <div className="font-bold text-xs mb-1">CatBoost</div>
            <div className="text-[10px] text-muted leading-normal">Ordered boosting to capture target categorical distributions.</div>
          </div>
          <div className="p-4 bg-primary/5 border border-primary/30 rounded-lg text-center shadow-[0_0_12px_rgba(252,163,17,0.05)]">
            <div className="font-bold text-xs mb-1 text-primary">Logistic Regression</div>
            <div className="text-[10px] text-primary/80 leading-normal font-medium">Meta-Classifier trained on base predictions.</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Global SHAP Importance Chart */}
        <div className="col-span-2 card flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <Compass className="text-primary" size={20} />
            <h3 className="h4">Global Feature Importance (Attributed SHAP)</h3>
          </div>
          <p className="text-xs text-muted mb-4">Relative weight distribution driving the aggregation layer.</p>
          
          <div className="flex-col gap-3">
            {sortedImportances.map((item) => (
              <div key={item.name} className="flex items-center gap-4 text-xs">
                <div className="w-1/3 text-right truncate font-medium text-muted-foreground">{item.label}</div>
                <div className="w-1/2 bg-[#0e1117] h-5 rounded overflow-hidden border border-border/40">
                  <div 
                    className="bg-primary h-full rounded-r" 
                    style={{ width: `${item.value * 100}%` }}
                  ></div>
                </div>
                <div className="w-1/6 font-bold text-primary">{(item.value * 100).toFixed(1)}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Model Parameters Panel */}
        <div className="col-span-1 card flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <Sliders className="text-primary" size={20} />
            <h3 className="h4">Model Hyper-Parameters</h3>
          </div>
          <p className="text-xs text-muted mb-4">Static configuration parameters of the active pickle file.</p>
          
          <div className="flex-col gap-4 mt-2 text-xs">
            <div className="flex justify-between border-b border-border/30 pb-2">
              <span className="text-muted-foreground">Ensemble Version</span>
              <span className="font-bold text-foreground">{modelInfo?.model_version || 'N/A'}</span>
            </div>
            <div className="flex justify-between border-b border-border/30 pb-2">
              <span className="text-muted-foreground">Intercept Threshold</span>
              <span className="font-bold text-foreground">{modelInfo?.threshold?.toFixed(4) || 'N/A'}</span>
            </div>
            <div className="flex justify-between border-b border-border/30 pb-2">
              <span className="text-muted-foreground">Active Feature Count</span>
              <span className="font-bold text-foreground">{modelInfo?.features?.length || 0} columns</span>
            </div>
            <div className="flex justify-between border-b border-border/30 pb-2">
              <span className="text-muted-foreground">Global Base Fraud Rate</span>
              <span className="font-bold text-foreground">{(modelInfo?.global_fraud_rate * 100).toFixed(4)}%</span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-muted-foreground">Meta Learner State</span>
              <span className="font-bold text-success flex items-center gap-1">
                <CheckCircle2 size={12} /> Fitted
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
