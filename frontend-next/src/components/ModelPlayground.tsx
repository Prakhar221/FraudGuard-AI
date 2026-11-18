'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { Play, Loader2, AlertTriangle, CheckCircle2, ShieldCheck, ZapOff, Sparkles, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ModelPlayground() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [consensus, setConsensus] = useState<{ status: string, message: string, color: string } | null>(null);

  const [formData, setFormData] = useState({
    sender: '', oldbalanceorg: 0, newbalanceorg: 0,
    receiver: '', oldbalancedest: 0, newbalancedest: 0,
    amount: 0, types: 3, step: 12
  });

  const handleDemo = (type: 'fraud' | 'safe' | 'ambiguous') => {
    if (type === 'fraud') {
      setFormData({
        sender: 'C6271823', oldbalanceorg: 245000, newbalanceorg: 0,
        receiver: 'C721638', oldbalancedest: 0, newbalancedest: 0,
        amount: 245000, types: 1, step: 206
      });
    } else if (type === 'safe') {
      setFormData({
        sender: 'C1239821', oldbalanceorg: 8000, newbalanceorg: 7550,
        receiver: 'M928371', oldbalancedest: 300, newbalancedest: 750,
        amount: 450, types: 3, step: 12
      });
    } else {
      // Ambiguous case: moderately large cash out, partial balance drain
      setFormData({
        sender: 'C1089271', oldbalanceorg: 65000, newbalanceorg: 15000,
        receiver: 'C8276122', oldbalancedest: 12000, newbalancedest: 62000,
        amount: 50000, types: 1, step: 42
      });
    }
    setResults(null);
    setConsensus(null);
  };

  const handleBenchmark = async () => {
    setLoading(true);
    setResults(null);
    setConsensus(null);

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

    const models = [
      { id: 'stacking', name: 'Stacking Ensemble' },
      { id: 'rf', name: 'Random Forest' },
      { id: 'xgb', name: 'XGBoost' },
      { id: 'lgbm', name: 'LightGBM' },
      { id: 'catboost', name: 'CatBoost' }
    ];

    try {
      const promises = models.map(async (m) => {
        const start = performance.now();
        const res = await axios.post(`http://127.0.0.1:8000/predict?model_type=${m.id}`, payload);
        const duration = performance.now() - start;
        return {
          id: m.id,
          displayName: m.name,
          result: res.data.result,
          probability: res.data.probability,
          serverLatency: res.data.latency_ms || 1.2,
          networkLatency: duration
        };
      });

      const responseList = await Promise.all(promises);
      setResults(responseList);

      // Analyze consensus
      const fraudVotes = responseList.filter(r => r.result === 'Fraudulent').length;
      const totalModels = responseList.length;

      if (fraudVotes === totalModels) {
        setConsensus({
          status: 'UNANIMOUS FRAUD',
          message: 'All 5 classifiers agree this transaction is fraudulent. Immediate interception triggered.',
          color: 'var(--destructive)'
        });
      } else if (fraudVotes === 0) {
        setConsensus({
          status: 'UNANIMOUS SECURE',
          message: 'All 5 classifiers agree this transaction is legitimate. Cleared for processing.',
          color: 'var(--success)'
        });
      } else {
        setConsensus({
          status: 'STACKING DISCREPANCY',
          message: `Model split: ${fraudVotes} flagged Fraud, ${totalModels - fraudVotes} cleared Safe. Stacking Ensemble meta-learner output takes precedence.`,
          color: 'var(--primary)'
        });
      }

    } catch (e) {
      alert("Verification query failed. Check that the FastAPI backend server is active on Port 8000.");
    } finally {
      setLoading(false);
    }
  };

  const maxServerLatency = results ? Math.max(...results.map(r => r.serverLatency), 1) : 1;

  return (
    <div className="flex-col gap-6 animate-fade-in">
      <div className="flex gap-4 bg-card p-4 rounded-lg border border-border justify-between items-center">
        <div className="flex gap-3">
          <button className="btn btn-outline border-destructive text-destructive font-semibold text-xs" onClick={() => handleDemo('fraud')}>
            🚨 Load Fraud Example
          </button>
          <button className="btn btn-outline border-success text-success font-semibold text-xs" onClick={() => handleDemo('safe')}>
            ✅ Load Legitimate Example
          </button>
          <button className="btn btn-outline border-primary/50 text-primary font-semibold text-xs" onClick={() => handleDemo('ambiguous')}>
            ⚡ Load Ambiguous Example
          </button>
        </div>

        <button 
          className="btn btn-primary font-bold flex items-center gap-1.5 h-10 px-5 text-sm"
          onClick={handleBenchmark}
          disabled={loading || !formData.sender || !formData.receiver}
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
          {loading ? 'Evaluating Models...' : 'Compare Estimators'}
        </button>
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

      {loading && (
        <div className="card flex items-center justify-center p-12 bg-muted/20 border border-border">
          <div className="text-center flex-col gap-2">
            <Loader2 className="animate-spin text-primary mx-auto mb-2" size={32} />
            <span className="text-sm font-semibold">Running concurrent inference stacks on GPU/CPU...</span>
          </div>
        </div>
      )}

      {results && consensus && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="flex-col gap-6 animate-fade-in">
          {/* Consensus Banner Card */}
          <div 
            className="card flex items-center gap-4 p-4 border" 
            style={{ 
              borderColor: consensus.color,
              backgroundColor: `${consensus.color}15`
            }}
          >
            {consensus.status.includes('FRAUD') ? (
              <ShieldAlert className="text-destructive animate-pulse" size={32} />
            ) : consensus.status.includes('SECURE') ? (
              <ShieldCheck className="text-success" size={32} />
            ) : (
              <Sparkles className="text-primary" size={32} />
            )}
            <div>
              <h4 className="font-bold text-sm tracking-wide" style={{ color: consensus.color }}>
                {consensus.status}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">{consensus.message}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Probability Comparison Panel */}
            <div className="card flex-col gap-4">
              <h3 className="h4 flex items-center gap-2">📊 Anomaly Probabilities</h3>
              <p className="text-xs text-muted mb-2">Calculated fraud score for each classification paradigm.</p>
              
              <div className="flex-col gap-3">
                {results.map((r) => {
                  const isFraud = r.result === 'Fraudulent';
                  return (
                    <div key={r.id} className="flex-col gap-1 text-xs">
                      <div className="flex justify-between font-medium">
                        <span className="text-muted-foreground">{r.displayName}</span>
                        <span className={isFraud ? 'text-destructive font-bold' : 'text-success font-bold'}>
                          {(r.probability * 100).toFixed(1)}% ({isFraud ? 'FRAUD' : 'SAFE'})
                        </span>
                      </div>
                      <div className="w-full bg-[#0e1117] h-4 rounded overflow-hidden border border-border/30">
                        <div 
                          className="h-full rounded-r transition-all duration-500"
                          style={{ 
                            width: `${r.probability * 100}%`,
                            backgroundColor: isFraud ? 'var(--destructive)' : 'var(--success)'
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Inference Latency Benchmark Panel */}
            <div className="card flex-col gap-4">
              <h3 className="h4 flex items-center gap-2">⚡ Inference Latency (CPU)</h3>
              <p className="text-xs text-muted mb-2">Algorithm response benchmark in milliseconds. Highlights speed/accuracy trade-off.</p>
              
              <div className="flex-col gap-3">
                {results.map((r) => {
                  const barWidth = Math.max((r.serverLatency / maxServerLatency) * 100, 3);
                  return (
                    <div key={r.id} className="flex-col gap-1 text-xs">
                      <div className="flex justify-between font-medium">
                        <span className="text-muted-foreground">{r.displayName}</span>
                        <span className="font-bold text-foreground">{r.serverLatency.toFixed(2)} ms</span>
                      </div>
                      <div className="w-full bg-[#0e1117] h-4 rounded overflow-hidden border border-border/30 flex items-center">
                        <div 
                          className="h-full bg-primary/80 rounded-r transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
