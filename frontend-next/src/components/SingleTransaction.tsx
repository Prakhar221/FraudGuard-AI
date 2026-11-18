'use client';

import React, { useState } from 'react';
import { Transaction } from '@/app/page';
import axios from 'axios';
import { Search, Loader2, AlertTriangle, CheckCircle2, Cpu, ShieldAlert, Download, CheckSquare } from 'lucide-react';
import { motion } from 'framer-motion';

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

export default function SingleTransaction({ addTransaction }: { addTransaction: (t: Transaction) => void }) {
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [result, setResult] = useState<any>(null);
  const [shapData, setShapData] = useState<any[]>([]);
  const [modelType, setModelType] = useState('stacking');

  const [formData, setFormData] = useState({
    sender: '', oldbalanceorg: 0, newbalanceorg: 0,
    receiver: '', oldbalancedest: 0, newbalancedest: 0,
    amount: 0, types: 3, step: 12, isflaggedfraud: 0
  });

  const handleDemo = (type: 'fraud' | 'safe') => {
    if (type === 'fraud') {
      setFormData({
        sender: 'C6271823', oldbalanceorg: 245000, newbalanceorg: 0,
        receiver: 'C721638', oldbalancedest: 0, newbalancedest: 0,
        amount: 245000, types: 1, step: 206, isflaggedfraud: 1
      });
    } else {
      setFormData({
        sender: 'C1239821', oldbalanceorg: 8000, newbalanceorg: 7550,
        receiver: 'M928371', oldbalancedest: 300, newbalancedest: 750,
        amount: 450, types: 3, step: 12, isflaggedfraud: 0
      });
    }
    setResult(null);
    setShapData([]);
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setResult(null);
    setShapData([]);
    
    const payload = {
      step: formData.step,
      types: formData.types,
      amount: formData.amount,
      oldbalanceorig: formData.oldbalanceorg,
      newbalanceorig: formData.newbalanceorg,
      oldbalancedest: formData.oldbalancedest,
      newbalancedest: formData.newbalancedest,
      isflaggedfraud: formData.amount >= 200000 ? 1 : 0
    };

    try {
      setLoadingStep(`🔌 Routing query to ${modelType} stack...`);
      await new Promise(r => setTimeout(r, 450));
      
      setLoadingStep(`🧠 Executing forward classification pass...`);
      const predictPromise = axios.post(`http://127.0.0.1:8000/predict?model_type=${modelType}`, payload);
      const explainPromise = axios.post(`http://127.0.0.1:8000/explain?model_type=${modelType}`, payload);
      
      const [predRes, expRes] = await Promise.all([predictPromise, explainPromise]);
      
      setLoadingStep('📊 Rendering local SHAP attributions...');
      await new Promise(r => setTimeout(r, 300));

      setResult(predRes.data);

      if (expRes.data && !expRes.data.error) {
        const values = expRes.data.shap_values;
        const names = expRes.data.feature_names;
        const dataList = names.map((name: string, i: number) => ({
          name,
          label: featureMap[name] || name,
          impact: values[i]
        })).sort((a: any, b: any) => Math.abs(b.impact) - Math.abs(a.impact));
        
        setShapData(dataList.slice(0, 8)); // Top 8 features
      }

      // Add to session feed
      addTransaction({
        id: Math.random().toString(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        source: formData.sender || 'Unknown',
        destination: formData.receiver || 'Unknown',
        amount: formData.amount,
        riskScore: predRes.data.probability,
        status: predRes.data.result === 'Fraudulent' ? 'Fraud' : 'Safe'
      });
    } catch (e) {
      alert('Error connecting to backend API. Please make sure the FastAPI server is running on Port 8000.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const maxShapImpact = Math.max(...shapData.map(d => Math.abs(d.impact)), 0.001);

  return (
    <div className="flex-col gap-6 animate-fade-in">
      <div className="flex justify-between items-center bg-card p-4 rounded-lg border border-border">
        <div className="flex gap-4">
          <button className="btn btn-outline border-destructive text-destructive font-semibold" onClick={() => handleDemo('fraud')}>
            🚨 Load Fraud Example
          </button>
          <button className="btn btn-outline border-success text-success font-semibold" onClick={() => handleDemo('safe')}>
            ✅ Load Safe Example
          </button>
        </div>

        <div className="flex items-center gap-3">
          <Cpu className="text-primary" size={18} />
          <span className="text-xs font-semibold text-muted-foreground">Select Evaluator Model:</span>
          <select 
            className="input w-48 bg-input text-foreground font-semibold"
            value={modelType}
            onChange={e => { setModelType(e.target.value); setResult(null); setShapData([]); }}
          >
            <option value="stacking">Stacking Ensemble (Meta)</option>
            <option value="rf">Random Forest Classifier</option>
            <option value="xgb">XGBoost Classifier</option>
            <option value="lgbm">LightGBM Classifier</option>
            <option value="catboost">CatBoost Classifier</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card flex-col gap-4">
          <h3 className="h4 text-primary flex items-center gap-2">📤 Source Account</h3>
          <div>
            <label className="label">Account ID</label>
            <input className="input" value={formData.sender} onChange={e => setFormData({...formData, sender: e.target.value})} placeholder="e.g. C12345678" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Current Balance ($)</label>
              <input type="number" className="input" value={formData.oldbalanceorg} onChange={e => setFormData({...formData, oldbalanceorg: +e.target.value})} />
            </div>
            <div>
              <label className="label">Post-Txn Balance ($)</label>
              <input type="number" className="input" value={formData.newbalanceorg} onChange={e => setFormData({...formData, newbalanceorg: +e.target.value})} />
            </div>
          </div>
        </div>

        <div className="card flex-col gap-4">
          <h3 className="h4 text-primary flex items-center gap-2">📥 Destination Account</h3>
          <div>
            <label className="label">Recipient ID</label>
            <input className="input" value={formData.receiver} onChange={e => setFormData({...formData, receiver: e.target.value})} placeholder="e.g. M12345678" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Balance Before ($)</label>
              <input type="number" className="input" value={formData.oldbalancedest} onChange={e => setFormData({...formData, oldbalancedest: +e.target.value})} />
            </div>
            <div>
              <label className="label">Balance After ($)</label>
              <input type="number" className="input" value={formData.newbalancedest} onChange={e => setFormData({...formData, newbalancedest: +e.target.value})} />
            </div>
          </div>
        </div>
      </div>

      <div className="card flex-col gap-4">
        <h3 className="h4 text-primary">💸 Transaction Details</h3>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <label className="label">Amount ($)</label>
            <input type="number" className="input" value={formData.amount} onChange={e => setFormData({...formData, amount: +e.target.value})} />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input text-foreground bg-input" value={formData.types} onChange={e => setFormData({...formData, types: +e.target.value})}>
              <option value={0}>Cash In</option>
              <option value={1}>Cash Out</option>
              <option value={2}>Debit</option>
              <option value={3}>Payment</option>
              <option value={4}>Transfer</option>
            </select>
          </div>
          <div>
            <label className="label">Processing Time (Hours)</label>
            <input type="number" className="input" value={formData.step} onChange={e => setFormData({...formData, step: +e.target.value})} />
          </div>
        </div>
      </div>

      <button className="btn btn-primary w-full py-4 text-base font-bold mt-2 h-12" onClick={handleAnalyze} disabled={loading || !formData.sender || !formData.receiver}>
        {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : <Search className="mr-2" size={18} />} 
        {loading ? 'RUNNING SECURITY AUDIT...' : 'ANALYZE TRANSACTION'}
      </button>

      {/* Connection Loader */}
      {loading && (
        <div className="card bg-muted/40 border border-border flex items-center justify-center p-6 mt-2">
          <div className="flex-col items-center gap-2 text-center">
            <Loader2 className="animate-spin text-primary mx-auto mb-2" size={32} />
            <span className="text-sm font-semibold text-foreground">{loadingStep}</span>
          </div>
        </div>
      )}

      {/* Results panel */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="mt-2 flex-col gap-6 animate-fade-in">
          <div className="flex justify-between items-center">
            <h3 className="h3">Security Audit Report</h3>
            <button 
              onClick={() => {
                const typesName = ["Cash In", "Cash Out", "Debit", "Payment", "Transfer"];
                const typeStr = typesName[formData.types] || "Unknown";
                let rulesText = "None";
                if (result.triggered_rules && result.triggered_rules.length > 0) {
                  rulesText = result.triggered_rules.map((r: any) => `- [${r.name}] (Severity: ${r.severity})\n    Description: ${r.description}`).join("\n");
                }
                const brief = `======================================================================
FRAUDGUARD AI - SECURITIES & COMPLIANCE INVESTIGATOR CASE BRIEF
======================================================================
Report Generated : ${new Date().toLocaleString()}
Investigation ID : FG-CASE-${Math.floor(100000 + Math.random() * 900000)}
Verdict Status   : ${result.final_verdict || (result.result === 'Fraudulent' ? 'High Risk' : 'Cleared')}

TRANSACTION METRICS
-------------------
Source Account      : ${formData.sender}
Destination Account : ${formData.receiver}
Transaction Amount  : $${formData.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
Transaction Type    : ${typeStr}
Processing Time     : Step ${formData.step} (${formData.step % 24}:00 Hours)

MODEL RISK METRICS
------------------
Classifier Model    : ${result.model_used || "Stacking Ensemble"}
Model Risk Score    : ${(result.probability * 100).toFixed(2)}%
Execution Latency   : ${result.latency_ms ? result.latency_ms.toFixed(1) : 'N/A'} ms

COMPLIANCE & HEURISTIC FIREWALL
-------------------------------
Unified Risk Verdict: ${result.final_verdict || "N/A"}
Triggered Rules     : ${result.triggered_rules ? result.triggered_rules.length : 0}
${rulesText}

CLASSIFIED FRAUD TYPOLOGY
-------------------------
Classified Pattern  : ${result.fraud_typology || "None"}
Recommended Action  : ${result.recommended_action || "None"}

SHAP FEATURE CONTRIBUTIONS
--------------------------
${shapData.map(d => `- ${d.label}: ${d.impact > 0 ? '+' : ''}${d.impact.toFixed(4)}`).join("\n")}

RECOMMENDED ACTION CHECKLIST
----------------------------
[ ] Flag account ${formData.sender} for suspicious activity.
[ ] Hold/Freeze transaction funds ($${formData.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}).
[ ] Send multi-factor verification prompt to customer device.
[ ] Initiate KYC re-verification on account ${formData.receiver}.
[ ] File regulatory SAR/STR report if fraud consensus is unanimous.

Investigator Signature: ___________________________
Audit Approved By     : ___________________________ Date: _________________
======================================================================`;
                const blob = new Blob([brief], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `case_brief_${formData.sender}_${Date.now()}.txt`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="btn btn-outline border-primary text-primary hover:bg-primary hover:text-black flex items-center gap-2"
            >
              <Download size={16} /> Export Case Brief (.txt)
            </button>
          </div>
          
          <div className="grid grid-cols-4 gap-6">
             <div className={`card ${result.result === 'Fraudulent' ? 'border-destructive/40 shadow-glow-red' : 'border-success/40 shadow-glow-green'}`}>
               <span className="text-muted text-xs uppercase font-bold tracking-wider">Classification Verdict</span>
               <div className={`h2 mt-2 font-bold flex items-center gap-2 ${result.result === 'Fraudulent' ? 'text-destructive' : 'text-success'}`}>
                 {result.result === 'Fraudulent' ? (
                   <>
                     <AlertTriangle size={20} /> FRAUD ALERT
                   </>
                 ) : (
                   <>
                     <CheckCircle2 size={20} /> SECURE
                   </>
                 )}
               </div>
             </div>
             <div className="card">
               <span className="text-muted text-xs uppercase font-bold tracking-wider">Fraud Probability</span>
               <div className="h2 mt-2 font-bold">{(result.probability * 100).toFixed(2)}%</div>
             </div>
             <div className="card">
               <span className="text-muted text-xs uppercase font-bold tracking-wider">Unified Verdict</span>
               <div className="text-sm font-bold text-primary mt-3 truncate">{result.final_verdict || "N/A"}</div>
             </div>
             <div className="card">
               <span className="text-muted text-xs uppercase font-bold tracking-wider">Audit Execution Time</span>
               <div className="h2 mt-2 font-bold text-foreground">
                 {result.latency_ms ? `${result.latency_ms.toFixed(1)} ms` : 'N/A'}
               </div>
             </div>
          </div>

          {/* Typology Classification Result Card */}
          {result.fraud_typology && result.fraud_typology !== 'None' && (
            <div className="card border-primary/30 bg-primary/5 p-5 flex-col gap-3">
              <div className="flex items-center gap-2 text-primary font-bold">
                <ShieldAlert size={20} />
                <span>Detected Typology: {result.fraud_typology}</span>
              </div>
              <p className="text-sm text-foreground/90">{result.recommended_action}</p>
            </div>
          )}

          {/* Triggered Firewall Rules */}
          {result.triggered_rules && result.triggered_rules.length > 0 && (
            <div className="card border-destructive/30 bg-destructive/5 p-5 flex-col gap-3">
              <span className="font-bold text-destructive flex items-center gap-2">
                <AlertTriangle size={18} /> Violated Firewall Compliance Rules ({result.triggered_rules.length})
              </span>
              <div className="flex-col gap-2 mt-2">
                {result.triggered_rules.map((rule: any) => (
                  <div key={rule.id} className="p-3 bg-background rounded border border-border flex justify-between items-start gap-4">
                    <div>
                      <span className="font-semibold text-foreground text-sm">{rule.name}</span>
                      <p className="text-xs text-muted-foreground mt-1">{rule.description}</p>
                    </div>
                    <span className={`badge ${rule.severity === 'Critical' ? 'badge-destructive' : 'badge-warning'}`}>
                      {rule.severity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.result === 'Fraudulent' ? (
            <div className="card border-destructive bg-destructive/10 p-4 text-sm text-destructive flex-col gap-1">
              <span className="font-bold">🚨 FRAUD THREAT ALERT</span>
              <span>This transaction is flagged as high risk by the selected estimator. Immediate review and account freeze is suggested.</span>
            </div>
          ) : (
            <div className="card border-success bg-success/10 p-4 text-sm text-success flex-col gap-1">
              <span className="font-bold">✅ SECURE STATUS CLEARED</span>
              <span>The selected model classifies this event as clean and safe to execute.</span>
            </div>
          )}

          {/* Investigator Checklist */}
          {result.result === 'Fraudulent' && (
            <div className="card flex-col gap-3">
              <span className="font-bold text-foreground flex items-center gap-2">
                <CheckSquare size={18} /> Investigator Actions Checklist
              </span>
              <div className="flex-col gap-2 mt-1">
                <label className="flex items-center gap-3 text-xs text-muted-foreground cursor-pointer p-2 hover:bg-muted/20 rounded">
                  <input type="checkbox" className="rounded border-border text-primary focus:ring-primary" />
                  <span>Freeze sender account credentials ({formData.sender})</span>
                </label>
                <label className="flex items-center gap-3 text-xs text-muted-foreground cursor-pointer p-2 hover:bg-muted/20 rounded">
                  <input type="checkbox" className="rounded border-border text-primary focus:ring-primary" />
                  <span>Reverse pending transaction of ${formData.amount.toLocaleString()}</span>
                </label>
                <label className="flex items-center gap-3 text-xs text-muted-foreground cursor-pointer p-2 hover:bg-muted/20 rounded">
                  <input type="checkbox" className="rounded border-border text-primary focus:ring-primary" />
                  <span>Audit receiver node ({formData.receiver}) for potential mule activity</span>
                </label>
                <label className="flex items-center gap-3 text-xs text-muted-foreground cursor-pointer p-2 hover:bg-muted/20 rounded">
                  <input type="checkbox" className="rounded border-border text-primary focus:ring-primary" />
                  <span>Submit regulatory Suspicious Activity Report (SAR) file</span>
                </label>
              </div>
            </div>
          )}

          {/* Local attribution */}
          {shapData.length > 0 && (
            <div className="card flex-col gap-4">
              <h4 className="h4 flex items-center gap-2">
                🤖 Local SHAP Explanations ({result.model_used || "Stacking"})
              </h4>
              <p className="text-xs text-muted">
                Attribution parameters showing features which increased risk (Red) vs decreased risk (Orange).
              </p>
              
              <div className="flex-col gap-3 mt-4">
                {shapData.map((item) => {
                  const isPositive = item.impact > 0;
                  const percentage = Math.min((Math.abs(item.impact) / maxShapImpact) * 45, 45);
                  const leftVal = isPositive ? 50 : 50 - percentage;
                  const widthVal = percentage;

                  return (
                    <div key={item.name} className="flex items-center gap-4 text-xs">
                      <div className="w-1/3 text-right truncate font-medium text-muted-foreground">{item.label}</div>
                      <div className="w-1/2 bg-[#0e1117] h-5 rounded relative overflow-hidden flex items-center border border-border/40">
                        <div className="absolute left-1/2 top-0 bottom-0 w-[1.5px] bg-border z-10" />
                        <div
                           className={`absolute h-full ${isPositive ? 'bg-destructive/80' : 'bg-primary/80'}`}
                          style={{
                            left: `${leftVal}%`,
                            width: `${widthVal}%`
                          }}
                        />
                      </div>
                      <div className={`w-1/6 font-bold text-left ${isPositive ? 'text-destructive' : 'text-primary'}`}>
                        {isPositive ? '+' : ''}{item.impact.toFixed(3)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
