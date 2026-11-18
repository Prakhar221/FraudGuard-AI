'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Loader2, ServerCrash, Shield, AlertOctagon, CheckSquare, Plus, ToggleLeft, ToggleRight, Sparkles, HelpCircle } from 'lucide-react';

const API_URL = 'http://127.0.0.1:8000';

type FirewallRule = {
  id: string;
  name: string;
  description: string;
  condition: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  active: boolean;
  violations_count: number;
};

export default function FirewallRules() {
  const [rules, setRules] = useState<FirewallRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State for new custom rule
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    condition: '',
    severity: 'Medium' as 'Critical' | 'High' | 'Medium' | 'Low'
  });

  const fetchRules = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/rules`);
      setRules(res.data);
      setIsOffline(false);
    } catch (e) {
      setIsOffline(true);
      // Fallback mockup rules in offline mode
      setRules([
        {
          id: 'rule_high_amount_night',
          name: 'High-Value Night Check (Offline)',
          description: 'Flags transactions > $50,000 executed between 12 AM and 6 AM.',
          condition: 'amount > 50000 and is_night == 1',
          severity: 'High',
          active: true,
          violations_count: 3
        },
        {
          id: 'rule_account_drain',
          name: 'Account Drain Detection (Offline)',
          description: 'Flags transactions that drain more than 99% of the source balance.',
          condition: 'newbalanceorig == 0 and oldbalanceorig > 10000 and amount > 10000',
          severity: 'Critical',
          active: true,
          violations_count: 5
        },
        {
          id: 'rule_empty_recipient',
          name: 'New/Empty Recipient Routing (Offline)',
          description: 'Flags large transfers (> $100,000) to recipient accounts with $0 initial balance.',
          condition: 'oldbalancedest == 0 and amount > 100000',
          severity: 'Medium',
          active: true,
          violations_count: 0
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (ruleId: string) => {
    if (isOffline) {
      // Toggle locally for demo UI purposes when offline
      setRules(prev => prev.map(r => r.id === ruleId ? { ...r, active: !r.active } : r));
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/rules/toggle`, { id: ruleId });
      if (res.data.status === 'success') {
        setRules(prev => prev.map(r => r.id === ruleId ? { ...r, active: res.data.active } : r));
      }
    } catch (e: any) {
      setErrorMessage(e.response?.data?.detail || 'Failed to toggle rule.');
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!newRule.name || !newRule.condition || !newRule.description) {
      setErrorMessage('Please fill out all custom rule fields.');
      return;
    }

    if (isOffline) {
      // Add rule locally in offline mode
      const simulatedRule: FirewallRule = {
        id: `rule_custom_${rules.length + 1}`,
        name: newRule.name,
        description: newRule.description,
        condition: newRule.condition,
        severity: newRule.severity,
        active: true,
        violations_count: 0
      };
      setRules(prev => [...prev, simulatedRule]);
      setSuccessMessage('Custom rule added successfully (Local Mock Mode).');
      setNewRule({ name: '', description: '', condition: '', severity: 'Medium' });
      setTimeout(() => setSuccessMessage(null), 4000);
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/rules/add`, newRule);
      if (res.data.status === 'success') {
        setRules(prev => [...prev, res.data.rule]);
        setSuccessMessage('Custom firewall rule compiled and deployed successfully!');
        setNewRule({ name: '', description: '', condition: '', severity: 'Medium' });
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (e: any) {
      setErrorMessage(e.response?.data?.detail || 'Failed to compile custom rule. Please check condition syntax.');
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  if (loading) {
    return (
      <div className="card flex items-center justify-center py-20 border border-border">
        <div className="flex-col items-center gap-2 text-center">
          <Loader2 className="animate-spin text-primary mx-auto mb-2" size={32} />
          <span className="text-sm text-muted">Loading compliance firewall rules...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-col gap-6 animate-fade-in">
      {isOffline && (
        <div className="card border-destructive bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-2">
          <ServerCrash size={18} />
          <span><b>Backend offline fallback:</b> Operating in simulator mode. Run FastAPI on port 8000 to enable live rule updates.</span>
        </div>
      )}

      {errorMessage && (
        <div className="card border-destructive bg-destructive/15 p-4 text-sm text-destructive font-semibold">
          ⚠️ {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="card border-success bg-success/15 p-4 text-sm text-success font-semibold flex items-center gap-2">
          <Sparkles size={16} /> {successMessage}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Rules List Panel */}
        <div className="col-span-2 flex-col gap-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="h3 flex items-center gap-2 text-foreground">
              <Shield className="text-primary" size={22} />
              Active Firewall Compliance Rules
            </h3>
            <span className="text-xs text-muted-foreground font-semibold bg-muted/60 px-3 py-1 rounded border border-border">
              Total Installed: {rules.length}
            </span>
          </div>

          <div className="flex-col gap-4">
            {rules.map((rule) => (
              <div 
                key={rule.id} 
                className={`card flex justify-between items-center gap-4 ${rule.active ? 'border-border' : 'border-border/30 opacity-60 bg-secondary/20'}`}
              >
                <div className="flex-col gap-1 w-3/4">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-foreground text-base">{rule.name}</span>
                    <span className={`badge ${
                      rule.severity === 'Critical' ? 'badge-destructive' : 
                      rule.severity === 'High' ? 'badge-warning' : 
                      rule.severity === 'Medium' ? 'badge-primary' : 'bg-muted'
                    }`}>
                      {rule.severity}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{rule.description}</p>
                  <div className="mt-3 p-2 bg-background/50 border border-border rounded font-mono text-xs text-primary max-w-full overflow-x-auto">
                    Condition: <span className="text-foreground">{rule.condition}</span>
                  </div>
                </div>

                <div className="flex-col items-end gap-2 text-right">
                  <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => handleToggle(rule.id)}>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {rule.active ? 'Active' : 'Disabled'}
                    </span>
                    {rule.active ? (
                      <ToggleRight className="text-primary" size={32} />
                    ) : (
                      <ToggleLeft className="text-muted-foreground" size={32} />
                    )}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Triggers: <b className="text-foreground">{rule.violations_count}</b>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Creation Form & Reference Panel */}
        <div className="flex-col gap-6">
          {/* Custom Rule Composer */}
          <div className="card flex-col gap-4">
            <h3 className="h4 text-primary flex items-center gap-2">
              <Plus size={20} />
              Rule Composer
            </h3>
            <p className="text-xs text-muted">
              Add a new heuristic rule. Conditions are compiled dynamically.
            </p>

            <form onSubmit={handleAddRule} className="flex-col gap-4 mt-2">
              <div>
                <label className="label">Rule Name</label>
                <input 
                  className="input" 
                  value={newRule.name} 
                  onChange={e => setNewRule({ ...newRule, name: e.target.value })} 
                  placeholder="e.g. Night Structuring Check" 
                />
              </div>

              <div>
                <label className="label">Description</label>
                <textarea 
                  className="input h-16 py-2" 
                  value={newRule.description} 
                  onChange={e => setNewRule({ ...newRule, description: e.target.value })} 
                  placeholder="Describe compliance action..." 
                />
              </div>

              <div>
                <label className="label">Condition Expression</label>
                <input 
                  className="input font-mono text-xs text-primary" 
                  value={newRule.condition} 
                  onChange={e => setNewRule({ ...newRule, condition: e.target.value })} 
                  placeholder="amount > 10000 and is_night == 1" 
                />
              </div>

              <div>
                <label className="label">Risk Severity</label>
                <select 
                  className="input text-foreground bg-input"
                  value={newRule.severity}
                  onChange={e => setNewRule({ ...newRule, severity: e.target.value as any })}
                >
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <button type="submit" className="btn btn-primary w-full font-bold mt-2">
                Deploy Rule
              </button>
            </form>
          </div>

          {/* Condition Variables Reference Guide */}
          <div className="card flex-col gap-3 bg-secondary/10">
            <span className="font-semibold text-foreground text-sm flex items-center gap-2">
              <HelpCircle size={16} /> Expression Variable Guide
            </span>
            <p className="text-xs text-muted-foreground">
              You can construct logic conditions using Python expressions. Valid variables include:
            </p>
            <div className="flex-col gap-2 mt-1 text-xs font-mono">
              <div className="flex justify-between border-b border-border py-1">
                <span className="text-primary font-bold">amount</span>
                <span className="text-muted-foreground">float (Transaction Amount)</span>
              </div>
              <div className="flex justify-between border-b border-border py-1">
                <span className="text-primary font-bold">is_night</span>
                <span className="text-muted-foreground">int (1 if midnight-6am, else 0)</span>
              </div>
              <div className="flex justify-between border-b border-border py-1">
                <span className="text-primary font-bold">newbalanceorig</span>
                <span className="text-muted-foreground">float (Post-Txn Sender Bal)</span>
              </div>
              <div className="flex justify-between border-b border-border py-1">
                <span className="text-primary font-bold">oldbalanceorig</span>
                <span className="text-muted-foreground">float (Pre-Txn Sender Bal)</span>
              </div>
              <div className="flex justify-between border-b border-border py-1">
                <span className="text-primary font-bold">oldbalancedest</span>
                <span className="text-muted-foreground">float (Pre-Txn Recipient Bal)</span>
              </div>
              <div className="flex justify-between border-b border-border py-1">
                <span className="text-primary font-bold">newbalancedest</span>
                <span className="text-muted-foreground">float (Post-Txn Recipient Bal)</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-primary font-bold">types</span>
                <span className="text-muted-foreground">int (CashIn=0, CashOut=1, Debit=2...)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
