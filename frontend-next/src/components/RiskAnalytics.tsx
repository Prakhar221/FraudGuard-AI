'use client';

import React from 'react';
import { Transaction } from '@/app/page';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';
import { ShieldCheck, ShieldAlert, BarChart3, TrendingUp, HelpCircle } from 'lucide-react';

export default function RiskAnalytics({ history }: { history: Transaction[] }) {
  const totalScans = history.length;
  const fraudDetected = history.filter(t => t.status === 'Fraud').length;
  const blockedVolume = history.filter(t => t.status === 'Fraud').reduce((acc, t) => acc + t.amount, 0);
  const safeVolume = history.filter(t => t.status === 'Safe').reduce((acc, t) => acc + t.amount, 0);

  // 1. Prepare area chart data (risk scores sequence)
  const areaData = [...history].reverse().map((tx, idx) => ({
    name: `TX-${idx + 1}`,
    amount: tx.amount,
    risk: parseFloat((tx.riskScore * 100).toFixed(1)),
    id: tx.source
  }));

  // 2. Prepare volume stats by type (Inferred from account IDs and amount ranges)
  const getVolumeStats = () => {
    const map: { [key: string]: { name: string, Cleared: number, Blocked: number } } = {
      'PAYMENT': { name: 'Payment', Cleared: 0, Blocked: 0 },
      'TRANSFER': { name: 'Transfer', Cleared: 0, Blocked: 0 },
      'CASH_OUT': { name: 'Cash Out', Cleared: 0, Blocked: 0 },
      'CASH_IN': { name: 'Cash In', Cleared: 0, Blocked: 0 },
      'DEBIT': { name: 'Debit', Cleared: 0, Blocked: 0 }
    };

    history.forEach(tx => {
      let resolvedType = 'TRANSFER';
      if (tx.destination.startsWith('M')) {
        resolvedType = 'PAYMENT';
      } else if (tx.status === 'Fraud') {
        resolvedType = 'CASH_OUT';
      } else if (tx.amount < 500) {
        resolvedType = 'DEBIT';
      } else if (tx.amount > 500 && tx.amount < 5000) {
        resolvedType = 'CASH_IN';
      }

      if (tx.status === 'Fraud') {
        map[resolvedType].Blocked = parseFloat((map[resolvedType].Blocked + tx.amount).toFixed(2));
      } else {
        map[resolvedType].Cleared = parseFloat((map[resolvedType].Cleared + tx.amount).toFixed(2));
      }
    });

    return Object.values(map);
  };

  const volumeData = getVolumeStats();

  // 3. Prepare Pie Chart verdict ratios
  const safeCount = history.filter(t => t.status === 'Safe').length;
  const fraudCount = history.filter(t => t.status === 'Fraud').length;
  
  const pieData = [
    { name: 'Legitimate', value: safeCount || 1, color: '#22c55e' }, // Fallback to 1 to show complete chart if empty
    { name: 'Fraud Intercepted', value: fraudCount, color: '#ef4444' }
  ].filter(d => d.value > 0);

  // Custom tooltips
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#151518] p-3 border border-border rounded-lg text-xs flex-col gap-1 shadow-lg">
          <span className="font-semibold text-primary">{payload[0].payload.id || payload[0].payload.name}</span>
          <span className="text-foreground">Risk probability: <b>{payload[0].value}%</b></span>
          <span className="text-muted-foreground">Amount: <b>${payload[0].payload.amount?.toLocaleString()}</b></span>
        </div>
      );
    }
    return null;
  };

  const VolumeTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#151518] p-3 border border-border rounded-lg text-xs flex-col gap-1 shadow-lg">
          <span className="font-bold text-foreground mb-1">{payload[0].payload.name} Volume</span>
          <span className="text-success">Cleared: <b>${payload[0].value?.toLocaleString()}</b></span>
          {payload[1] && <span className="text-destructive">Blocked: <b>${payload[1].value?.toLocaleString()}</b></span>}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex-col gap-6 animate-fade-in">
      {/* Metrics Row */}
      <div className="grid grid-cols-4 gap-6">
        <div className="card metric-card shadow-glow-orange">
          <span className="metric-title">Volume Blocked (USD)</span>
          <span className="metric-value font-bold text-destructive">${blockedVolume.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
          <span className="metric-delta negative">🚨 Assets Secured</span>
        </div>
        <div className="card metric-card shadow-glow-green">
          <span className="metric-title">Volume Cleared (USD)</span>
          <span className="metric-value font-bold text-success">${safeVolume.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
          <span className="metric-delta positive">✅ Liquid Flowing</span>
        </div>
        <div className="card metric-card">
          <span className="metric-title">Safe vs Anomaly Ratio</span>
          <span className="metric-value font-bold text-primary">
            {totalScans > 0 ? `${((safeCount / totalScans) * 100).toFixed(0)}:${((fraudCount / totalScans) * 100).toFixed(0)}` : 'N/A'}
          </span>
          <span className="metric-delta neutral">Distribution Split</span>
        </div>
        <div className="card metric-card">
          <span className="metric-title">Inference Intercept Rate</span>
          <span className="metric-value font-bold">
            {totalScans > 0 ? `${((fraudCount / totalScans) * 100).toFixed(1)}%` : '0.0%'}
          </span>
          <span className="metric-delta neutral">Network Anomaly Rate</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Risk Trend Chart */}
        <div className="col-span-2 card flex-col gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-primary" size={18} />
            <h3 className="h4">Session Anomaly Probability Drift</h3>
          </div>
          
          <div style={{ width: '100%', height: '240px' }}>
            {history.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fca311" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#fca311" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={10} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={10} domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="risk" stroke="#fca311" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRisk)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted text-sm">
                No active transaction history to plot risk trends.
              </div>
            )}
          </div>
        </div>

        {/* Verdict split Pie Chart */}
        <div className="col-span-1 card flex-col gap-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="text-primary" size={18} />
            <h3 className="h4">Audit Verdict Distribution</h3>
          </div>

          <div className="flex items-center justify-center" style={{ width: '100%', height: '180px' }}>
            {history.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} Scans`, 'Audits']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted text-sm">
                No scan data.
              </div>
            )}
          </div>
          
          <div className="flex justify-center gap-6 text-[10px] font-bold uppercase mt-2">
            <div className="flex items-center gap-1.5 text-success">
              <span className="w-2.5 h-2.5 rounded-full bg-success"></span> Legitimate ({safeCount})
            </div>
            <div className="flex items-center gap-1.5 text-destructive">
              <span className="w-2.5 h-2.5 rounded-full bg-destructive"></span> Fraud Intercepted ({fraudCount})
            </div>
          </div>
        </div>
      </div>

      {/* Blocked vs Cleared Volume Bar Chart */}
      <div className="card flex-col gap-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="text-primary" size={18} />
          <h3 className="h4">Volume Flow by Transaction Profile</h3>
        </div>

        <div style={{ width: '100%', height: '240px' }}>
          {history.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={10} />
                <YAxis stroke="var(--muted-foreground)" fontSize={10} />
                <Tooltip content={<VolumeTooltip />} />
                <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 600 }} />
                <Bar dataKey="Cleared" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Blocked" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted text-sm">
              Waiting for transaction volumes to benchmark.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
