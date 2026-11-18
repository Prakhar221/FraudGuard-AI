'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import FirewallRules from '@/components/FirewallRules';
import Dashboard from '@/components/Dashboard';
import SingleTransaction from '@/components/SingleTransaction';
import BatchProcessing from '@/components/BatchProcessing';
import ModelInsights from '@/components/ModelInsights';
import ModelPlayground from '@/components/ModelPlayground';
import RiskAnalytics from '@/components/RiskAnalytics';
import { motion, AnimatePresence } from 'framer-motion';

export type Transaction = {
  id: string;
  timestamp: string;
  source: string;
  destination: string;
  amount: number;
  riskScore: number;
  status: 'Safe' | 'Fraud';
};

export type SocAction = {
  id: string;
  timestamp: string;
  accountId: string;
  actionType: 'freeze' | 'audit' | 'whitelist';
  details: string;
  notes?: string; // Optional case notes entered by analyst
};

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Initial dummy history
  const [history, setHistory] = useState<Transaction[]>([
    { id: '1', timestamp: '10:45:12 AM', source: 'C1239821', destination: 'M928371', amount: 450.00, riskScore: 0.02, status: 'Safe' },
    { id: '2', timestamp: '10:44:12 AM', source: 'C9827312', destination: 'M128371', amount: 12500.00, riskScore: 0.15, status: 'Safe' },
    { id: '3', timestamp: '10:43:12 AM', source: 'C6271823', destination: 'C721638', amount: 250000.00, riskScore: 0.89, status: 'Fraud' },
  ]);

  // Analyst Action Logs State
  const [socActions, setSocActions] = useState<SocAction[]>([
    { 
      id: 'soc-1', 
      timestamp: '10:43:45 AM', 
      accountId: 'C6271823', 
      actionType: 'freeze', 
      details: 'Source frozen due to Stacking consensus threat trigger.',
      notes: 'Standard cash-out transfer patterns observed. Draining initial balance to zero.' 
    }
  ]);

  const addTransaction = (txn: Transaction) => {
    setHistory(prev => [txn, ...prev]);
  };

  const addSocAction = (action: SocAction) => {
    setSocActions(prev => [action, ...prev]);
  };

  return (
    <div className="dashboard-layout">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="main-content">
        <header className="mb-8">
          <h1 className="h1 gradient-text">
            {activeTab === 'dashboard' && 'Command Center'}
            {activeTab === 'single' && 'Secure Transaction Analysis'}
            {activeTab === 'rules' && 'Compliance Firewall Rules'}
            {activeTab === 'playground' && 'Model Comparator Playground'}
            {activeTab === 'batch' && 'Batch Transaction Processor'}
            {activeTab === 'insights' && 'Project Architecture & Insights'}
            {activeTab === 'analytics' && 'Dynamic Risk Analytics'}
          </h1>
          <p className="p mt-2">
            {activeTab === 'dashboard' && 'Live network monitoring, network graph visualizer, and analyst actions feed.'}
            {activeTab === 'single' && 'Audit individual payments and visualize SHAP attributes on custom estimators.'}
            {activeTab === 'rules' && 'Deploy dynamic heuristic rules alongside machine learning engines.'}
            {activeTab === 'playground' && 'Benchmark ensemble models side-by-side to track consensus drift and speed latency.'}
            {activeTab === 'batch' && 'Upload transaction files to compile risk report sheets.'}
            {activeTab === 'insights' && 'Inspect parameters, model configuration, and global feature metrics.'}
            {activeTab === 'analytics' && 'Perform statistical analysis on transaction risk distributions and blocked volume.'}
          </p>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="h-full"
          >
            {activeTab === 'dashboard' && (
              <Dashboard 
                history={history} 
                addTransaction={addTransaction} 
                socActions={socActions} 
                addSocAction={addSocAction}
              />
            )}
            {activeTab === 'single' && <SingleTransaction addTransaction={addTransaction} />}
            {activeTab === 'rules' && <FirewallRules />}
            {activeTab === 'playground' && <ModelPlayground />}
            {activeTab === 'batch' && <BatchProcessing addTransaction={addTransaction} />}
            {activeTab === 'insights' && <ModelInsights />}
            {activeTab === 'analytics' && <RiskAnalytics history={history} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
