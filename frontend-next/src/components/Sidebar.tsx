'use client';

import React, { useEffect, useState } from 'react';
import { Shield, Activity, List, PieChart, FileUp, Zap, ServerCrash, Cpu, TrendingUp } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000';

export default function Sidebar({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: string) => void }) {
  const [health, setHealth] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(true);

  const fetchStats = async () => {
    try {
      const [hRes, sRes] = await Promise.all([
        axios.get(`${API_URL}/health`),
        axios.get(`${API_URL}/stats`)
      ]);
      setHealth(hRes.data);
      setStats(sRes.data);
      setIsOnline(true);
    } catch (e) {
      setIsOnline(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="sidebar">
      <div className="flex items-center gap-2 mb-8">
        <Shield size={32} className="text-primary" />
        <span className="h3">FraudGuard AI</span>
      </div>

      <div className="flex-col gap-2 mb-8">
        <button onClick={() => setActiveTab('dashboard')} className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}>
          <Activity size={20} /> Command Center
        </button>
        <button onClick={() => setActiveTab('single')} className={`nav-link ${activeTab === 'single' ? 'active' : ''}`}>
          <Zap size={20} /> Single Transaction
        </button>
        <button onClick={() => setActiveTab('rules')} className={`nav-link ${activeTab === 'rules' ? 'active' : ''}`}>
          <Shield size={20} /> Firewall Rules
        </button>
        <button onClick={() => setActiveTab('playground')} className={`nav-link ${activeTab === 'playground' ? 'active' : ''}`}>
          <Cpu size={20} /> Model Playground
        </button>
        <button onClick={() => setActiveTab('batch')} className={`nav-link ${activeTab === 'batch' ? 'active' : ''}`}>
          <FileUp size={20} /> Batch Processing
        </button>
        <button onClick={() => setActiveTab('insights')} className={`nav-link ${activeTab === 'insights' ? 'active' : ''}`}>
          <PieChart size={20} /> Model Insights
        </button>
        <button onClick={() => setActiveTab('analytics')} className={`nav-link ${activeTab === 'analytics' ? 'active' : ''}`}>
          <TrendingUp size={20} /> Risk Analytics
        </button>
      </div>

      <div className="mt-auto">
        <div className="mb-4">
          <span className="text-xs font-semibold uppercase text-muted">System Status</span>
          <div className="flex items-center gap-2 mt-2">
            {isOnline ? (
              <span className="badge badge-success">Online</span>
            ) : (
              <span className="badge badge-destructive"><ServerCrash size={14} className="mr-1" /> Offline</span>
            )}
          </div>
        </div>

        {isOnline && stats && health && (
          <div className="glass-card flex-col gap-2 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Uptime</span>
              <span className="font-semibold text-primary">{health.uptime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Scanned</span>
              <span className="font-semibold">{stats.total_predictions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Fraud Blocked</span>
              <span className="font-semibold text-destructive">{stats.fraud_count}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Threat Rate</span>
              <span className={`font-semibold ${stats.fraud_rate_pct > 15 ? 'text-destructive' : 'text-primary'}`}>
                {stats.fraud_rate_pct}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
