'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Transaction, SocAction } from '@/app/page';
import { AlertTriangle, CheckCircle2, ArrowRight, Play, Square, Info, ShieldAlert, HeartHandshake, Eye, Search as SearchIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

export default function Dashboard({ 
  history, 
  addTransaction, 
  socActions, 
  addSocAction 
}: { 
  history: Transaction[], 
  addTransaction: (t: Transaction) => void,
  socActions: SocAction[],
  addSocAction: (action: SocAction) => void
}) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<any>(null);
  const [hoveredLink, setHoveredLink] = useState<any>(null);
  const [graphSearch, setGraphSearch] = useState('');
  
  // Draggable Node State
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [customPositions, setCustomPositions] = useState<{ [key: string]: { x: number, y: number } }>({});
  
  // Case Notes State
  const [analystNote, setAnalystNote] = useState('');

  // Simulation Calibration Cockpit States
  const [simThreshold, setSimThreshold] = useState(0.50);
  const [fraudInjectRate, setFraudInjectRate] = useState(0.20);
  const [minAmount, setMinAmount] = useState(500);
  const [maxAmount, setMaxAmount] = useState(250000);

  const simParamsRef = useRef({ simThreshold, fraudInjectRate, minAmount, maxAmount });

  useEffect(() => {
    simParamsRef.current = { simThreshold, fraudInjectRate, minAmount, maxAmount };
  }, [simThreshold, fraudInjectRate, minAmount, maxAmount]);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const simulationInterval = useRef<NodeJS.Timeout | null>(null);

  // Compute live metrics
  const totalScans = history.length;
  const fraudDetected = history.filter(t => t.status === 'Fraud').length;
  const fraudValue = history.filter(t => t.status === 'Fraud').reduce((acc, t) => acc + t.amount, 0);
  const avgRisk = totalScans > 0 ? history.reduce((acc, t) => acc + t.riskScore, 0) / totalScans : 0;

  // Live Threat Simulation Step Generator
  const runSimulationStep = async () => {
    const { simThreshold, fraudInjectRate, minAmount, maxAmount } = simParamsRef.current;
    const isFraud = Math.random() < fraudInjectRate; 
    let amount = 0;
    let typeVal = 3; 
    let typeStr = "PAYMENT";
    let oldbalanceorig = 0;
    let newbalanceorig = 0;
    let oldbalancedest = 0;
    let newbalancedest = 0;

    const senderId = "C" + Math.floor(1000000 + Math.random() * 9000000);
    const receiverId = (Math.random() < 0.4 ? "M" : "C") + Math.floor(1000000 + Math.random() * 9000000);

    if (isFraud) {
      amount = parseFloat((minAmount + Math.random() * (maxAmount - minAmount)).toFixed(2));
      typeVal = Math.random() < 0.5 ? 1 : 4; 
      typeStr = typeVal === 1 ? "CASH_OUT" : "TRANSFER";
      oldbalanceorig = amount;
      newbalanceorig = 0;
      oldbalancedest = parseFloat((Math.random() * 10000).toFixed(2));
      newbalancedest = oldbalancedest;
    } else {
      typeVal = Math.floor(Math.random() * 5);
      const types = ["CASH_IN", "CASH_OUT", "DEBIT", "PAYMENT", "TRANSFER"];
      typeStr = types[typeVal];
      amount = parseFloat((5 + Math.random() * Math.min(maxAmount, 2000)).toFixed(2));
      oldbalanceorig = parseFloat((amount + 50 + Math.random() * 8000).toFixed(2));
      newbalanceorig = typeStr === "CASH_IN" ? oldbalanceorig + amount : oldbalanceorig - amount;
      oldbalancedest = parseFloat((100 + Math.random() * 15000).toFixed(2));
      newbalancedest = oldbalancedest + amount;
    }

    try {
      const res = await axios.post(`http://127.0.0.1:8000/predict?custom_threshold=${simThreshold}`, {
        step: 1 + Math.floor(Math.random() * 700),
        types: typeVal,
        amount: amount,
        oldbalanceorig: oldbalanceorig,
        newbalanceorig: newbalanceorig,
        oldbalancedest: oldbalancedest,
        newbalancedest: newbalancedest,
        isflaggedfraud: amount >= 200000 ? 1 : 0
      });

      addTransaction({
        id: Math.random().toString(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        source: senderId,
        destination: receiverId,
        amount: amount,
        riskScore: res.data.probability,
        status: res.data.result === 'Fraudulent' ? 'Fraud' : 'Safe'
      });
    } catch (e) {
      console.error("Simulation failed to predict", e);
    }
  };

  // Toggle Live Simulation Interval
  useEffect(() => {
    if (isSimulating) {
      runSimulationStep();
      simulationInterval.current = setInterval(runSimulationStep, 4000);
    } else {
      if (simulationInterval.current) {
        clearInterval(simulationInterval.current);
      }
    }
    return () => {
      if (simulationInterval.current) {
        clearInterval(simulationInterval.current);
      }
    };
  }, [isSimulating]);

  // Extract unique nodes and build circular layout coordinates (merged with custom positions)
  const recentTransactions = history.slice(0, 10);
  const uniqueNodesList = Array.from(new Set(
    recentTransactions.flatMap(tx => [tx.source, tx.destination])
  ));

  const nodes = uniqueNodesList.map((id, index) => {
    const isMerchant = id.startsWith('M');
    const isFraud = recentTransactions.some(tx => tx.status === 'Fraud' && (tx.source === id || tx.destination === id));
    
    // Check if dragged position is cached
    if (customPositions[id]) {
      return {
        id,
        x: customPositions[id].x,
        y: customPositions[id].y,
        isMerchant,
        isFraud
      };
    }

    const angle = (index / uniqueNodesList.length) * 2 * Math.PI;
    const radius = 95 + (index % 2) * 15; 
    const x = 230 + radius * Math.cos(angle);
    const y = 135 + radius * Math.sin(angle);
    
    return { id, x, y, isMerchant, isFraud };
  });

  const links = recentTransactions.map(tx => {
    const sourceNode = nodes.find(n => n.id === tx.source);
    const destNode = nodes.find(n => n.id === tx.destination);
    return {
      id: tx.id,
      source: sourceNode,
      target: destNode,
      amount: tx.amount,
      riskScore: tx.riskScore,
      status: tx.status
    };
  }).filter(l => l.source && l.target);

  // Graph Search Filters
  const isSearchActive = graphSearch.trim().length > 0;
  const isNodeMatch = (nodeId: string) => {
    return nodeId.toLowerCase().includes(graphSearch.toLowerCase());
  };

  // Drag Handlers
  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setDraggedNodeId(nodeId);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!draggedNodeId || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    
    // Contain boundaries inside SVG container (460x270 viewport scale)
    const x = Math.max(12, Math.min(e.clientX - rect.left, 448));
    const y = Math.max(12, Math.min(e.clientY - rect.top, 258));
    
    setCustomPositions(prev => ({
      ...prev,
      [draggedNodeId]: { x, y }
    }));
  };

  const handleMouseUp = () => {
    setDraggedNodeId(null);
  };

  // SOC Analyst logs actions with custom case notes
  const triggerSocAction = (accountId: string, type: 'freeze' | 'audit' | 'whitelist') => {
    const detailsMap = {
      freeze: `Quarantined assets and restricted transfers on account ${accountId} (Ensemble audit flag).`,
      audit: `Initiated security validation and transaction ledger audit on account ${accountId}.`,
      whitelist: `Whitelisted account ${accountId} and approved all pending/future transactions.`
    };

    addSocAction({
      id: 'soc-' + Date.now(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      accountId,
      actionType: type,
      details: detailsMap[type],
      notes: analystNote.trim() || undefined
    });
    
    setAnalystNote('');
    setHoveredNode(null); 
  };

  return (
    <div className="flex-col gap-6 animate-fade-in text-foreground">
      {/* Top Simulation Cockpit & Calibrator */}
      <div className="card flex-col gap-4 border border-border bg-card p-6">
        <div className="flex justify-between items-center border-b border-border/40 pb-4">
          <div className="flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full ${isSimulating ? 'bg-destructive animate-pulse' : 'bg-muted-foreground'}`}></span>
            <div>
              <h3 className="font-semibold text-lg">AI Threat Simulation Cockpit</h3>
              <p className="text-xs text-muted">Sandbox environment to test and tune ensemble thresholds against fraud storms.</p>
            </div>
          </div>
          <button 
            onClick={() => setIsSimulating(!isSimulating)}
            className={`btn ${isSimulating ? 'btn-outline border-destructive text-destructive' : 'btn-primary'} flex items-center gap-2 h-10 px-5 font-semibold text-sm`}
          >
            {isSimulating ? (
              <>
                <Square size={16} /> Stop Simulation
              </>
            ) : (
              <>
                <Play size={16} /> Start Threat Stream
              </>
            )}
          </button>
        </div>

        {/* Calibration Inputs Row */}
        <div className="grid grid-cols-4 gap-6 text-xs mt-2">
          {/* Threshold Tuning */}
          <div className="flex-col gap-2">
            <div className="flex justify-between font-bold text-muted-foreground">
              <span>Decision Threshold</span>
              <span className="text-primary font-bold">{simThreshold.toFixed(2)}</span>
            </div>
            <input 
              type="range" 
              min="0.05" 
              max="0.95" 
              step="0.05" 
              className="w-full accent-primary h-1 bg-input rounded-lg appearance-none cursor-pointer"
              value={simThreshold} 
              onChange={e => setSimThreshold(+e.target.value)} 
            />
            <p className="text-[10px] text-muted-foreground/80">Lower values catch more alerts (increases false positives).</p>
          </div>

          {/* Fraud Inject rate */}
          <div className="flex-col gap-2">
            <div className="flex justify-between font-bold text-muted-foreground">
              <span>Fraud Base Rate</span>
              <span className="text-destructive font-bold">{(fraudInjectRate * 100).toFixed(0)}%</span>
            </div>
            <input 
              type="range" 
              min="0.05" 
              max="0.95" 
              step="0.05" 
              className="w-full accent-destructive h-1 bg-input rounded-lg appearance-none cursor-pointer"
              value={fraudInjectRate} 
              onChange={e => setFraudInjectRate(+e.target.value)} 
            />
            <p className="text-[10px] text-muted-foreground/80">Inject frequency of synthetic anomalies into stream.</p>
          </div>

          {/* Min Amount Bounds */}
          <div className="flex-col gap-1.5">
            <label className="font-bold text-muted-foreground">Min Transaction size ($)</label>
            <input 
              type="number" 
              className="input h-8 text-xs font-semibold px-2 bg-background border border-border/80" 
              value={minAmount} 
              onChange={e => setMinAmount(Math.max(5, +e.target.value))} 
            />
          </div>

          {/* Max Amount Bounds */}
          <div className="flex-col gap-1.5">
            <label className="font-bold text-muted-foreground">Max Transaction size ($)</label>
            <input 
              type="number" 
              className="input h-8 text-xs font-semibold px-2 bg-background border border-border/80" 
              value={maxAmount} 
              onChange={e => setMaxAmount(Math.max(minAmount + 500, +e.target.value))} 
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className="card metric-card shadow-glow-orange">
          <span className="metric-title">Total Scans</span>
          <span className="metric-value">{totalScans}</span>
          <span className="metric-delta positive">+{totalScans} (Session)</span>
        </div>
        <div className={`card metric-card ${fraudDetected > 0 ? 'border-destructive/40 shadow-glow-red' : ''}`}>
          <span className="metric-title">Fraud Detected</span>
          <span className={`metric-value ${fraudDetected > 0 ? 'text-destructive' : ''}`}>{fraudDetected}</span>
          <span className={`metric-delta ${fraudDetected > 0 ? 'negative animate-pulse' : 'neutral'}`}>
            {fraudDetected > 0 ? '🚨 CRITICAL INTERCEPT' : 'Normal'}
          </span>
        </div>
        <div className="card metric-card">
          <span className="metric-title">Blocked Volume</span>
          <span className="metric-value">${fraudValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          <span className="metric-delta text-primary">Saved Value</span>
        </div>
        <div className="card metric-card">
          <span className="metric-title">Avg Risk Level</span>
          <span className="metric-value">{(avgRisk * 100).toFixed(1)}%</span>
          <span className="metric-delta neutral">Network Avg</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 flex-col gap-6">
           {/* SVG Interactive network card */}
           <div className="card relative flex-col gap-4" style={{ minHeight: '380px' }}>
              <div className="flex justify-between items-center mb-1">
                <div>
                  <h3 className="h4 mb-0.5">Live Transaction Network Graph</h3>
                  <p className="text-xs text-muted">circular layout. click-and-drag nodes to rearrange paths dynamically.</p>
                </div>
                
                {/* Search Account Highlighter input */}
                <div className="relative">
                  <SearchIcon className="absolute left-2.5 top-2 text-muted-foreground" size={13} />
                  <input 
                    type="text" 
                    placeholder="Highlight account..." 
                    className="input pl-8 h-8 w-44 text-xs"
                    value={graphSearch}
                    onChange={e => setGraphSearch(e.target.value)}
                  />
                </div>
              </div>
              
              {history.length >= 1 ? (
                <div className="relative border border-border rounded-lg bg-[#0a0a0c] overflow-hidden" style={{ height: '280px' }}>
                  <svg 
                    ref={svgRef}
                    width="100%" 
                    height="100%" 
                    viewBox="0 0 460 270" 
                    preserveAspectRatio="xMidYMid meet"
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  >
                    <defs>
                      <marker id="arrow-safe" viewBox="0 0 10 10" refX="17" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--success)" />
                      </marker>
                      <marker id="arrow-fraud" viewBox="0 0 10 10" refX="17" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--destructive)" />
                      </marker>
                    </defs>
                    
                    {/* Graph Links */}
                    {links.map((link: any, idx) => {
                      const isSourceMatch = isSearchActive && isNodeMatch(link.source.id);
                      const isTargetMatch = isSearchActive && isNodeMatch(link.target.id);
                      const isDimmed = isSearchActive && !isSourceMatch && !isTargetMatch;

                      return (
                        <path
                          key={link.id + '-' + idx}
                          d={`M ${link.source.x} ${link.source.y} Q ${(link.source.x + link.target.x)/2 + (idx%2 === 0 ? 15 : -15)} ${(link.source.y + link.target.y)/2 + (idx%2 === 0 ? 15 : -15)} ${link.target.x} ${link.target.y}`}
                          fill="none"
                          stroke={link.status === 'Fraud' ? 'var(--destructive)' : 'var(--success)'}
                          strokeWidth={link.status === 'Fraud' ? 2 : 1}
                          strokeDasharray={link.status === 'Fraud' ? '4 4' : 'none'}
                          markerEnd={`url(#arrow-${link.status === 'Fraud' ? 'fraud' : 'safe'})`}
                          opacity={hoveredLink === link.id ? 1.0 : (isDimmed ? 0.08 : 0.4)}
                          onMouseEnter={() => setHoveredLink(link.id)}
                          onMouseLeave={() => setHoveredLink(null)}
                          style={{ cursor: 'pointer', transition: 'opacity 0.3s ease' }}
                        />
                      );
                    })}

                    {/* Graph Nodes */}
                    {nodes.map((node) => {
                      const isMatch = isSearchActive && isNodeMatch(node.id);
                      const isDimmed = isSearchActive && !isMatch;

                      return (
                        <g
                          key={node.id}
                          transform={`translate(${node.x}, ${node.y})`}
                          onMouseEnter={() => setHoveredNode(node)}
                          onMouseLeave={() => {
                            if (draggedNodeId === null) {
                              setHoveredNode(null);
                            }
                          }}
                          onMouseDown={(e) => handleMouseDown(e, node.id)}
                          style={{ 
                            cursor: draggedNodeId === node.id ? 'grabbing' : 'grab', 
                            transition: draggedNodeId === node.id 
                              ? 'opacity 0.3s ease' 
                              : 'transform 0.5s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.3s ease' 
                          }}
                          className={isDimmed ? 'node-dimmed' : ''}
                        >
                          {node.isFraud && (
                            <circle
                              r="11"
                              fill="none"
                              stroke="var(--destructive)"
                              strokeWidth="1.5"
                              className="pulse-fraud-glow"
                              style={{ transformOrigin: 'center' }}
                            />
                          )}
                          <circle
                            r={node.isMerchant ? 7 : 5.5}
                            fill={node.isFraud ? 'var(--destructive)' : (node.isMerchant ? '#a855f7' : '#3b82f6')}
                            stroke={isMatch ? 'var(--primary)' : 'var(--background)'}
                            strokeWidth={isMatch ? 2.5 : 1.5}
                            className={isMatch ? 'node-highlighted' : ''}
                          />
                          <text
                            y="15"
                            textAnchor="middle"
                            fill={isMatch ? 'var(--primary)' : 'var(--muted-foreground)'}
                            fontSize="8"
                            fontWeight={isMatch ? '700' : '600'}
                          >
                            {node.id.substring(0, 5)}..
                          </text>
                        </g>
                      );
                    })}
                  </svg>

                  {/* Intercept Overlay popover with audit case notes */}
                  <AnimatePresence>
                    {hoveredNode && draggedNodeId === null && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="tooltip-modal shadow-glow-orange"
                        style={{ top: '12px', right: '12px', minWidth: '230px', pointerEvents: 'auto' }}
                        onMouseEnter={() => setHoveredNode(hoveredNode)} // keeps popover open on hover
                      >
                        <div className="font-bold text-xs text-primary mb-1 flex items-center gap-1">
                          <Info size={12} /> {hoveredNode.id}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Type: <b className="text-foreground">{hoveredNode.isMerchant ? 'Merchant (M)' : 'Customer (C)'}</b>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          Threat Profile: <b className={hoveredNode.isFraud ? 'text-destructive animate-pulse' : 'text-success'}>
                            {hoveredNode.isFraud ? '🚨 ANOMALOUS HIGH RISK' : '✅ VERIFIED SECURE'}
                          </b>
                        </div>
                        
                        {/* Audit notes and Action controls */}
                        <div className="flex-col gap-1.5 mt-3">
                          <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5 border-b border-border/40 pb-1">
                            Override Intercept Audit
                          </div>
                          
                          <textarea 
                            placeholder="Add case audit notes..."
                            className="input text-[9px] p-1.5 h-12 w-full mt-1 leading-normal resize-none bg-background text-foreground"
                            value={analystNote}
                            onChange={e => setAnalystNote(e.target.value)}
                          />

                          <div className="flex gap-1.5 mt-1.5">
                            <button 
                              onClick={() => triggerSocAction(hoveredNode.id, 'freeze')}
                              className="btn btn-outline border-destructive/40 text-destructive hover:bg-destructive/10 text-[9px] h-6 px-2 flex-1 font-bold"
                            >
                              Freeze
                            </button>
                            <button 
                              onClick={() => triggerSocAction(hoveredNode.id, 'audit')}
                              className="btn btn-outline border-primary/40 text-primary hover:bg-primary/10 text-[9px] h-6 px-2 flex-1 font-bold"
                            >
                              Audit
                            </button>
                            <button 
                              onClick={() => triggerSocAction(hoveredNode.id, 'whitelist')}
                              className="btn btn-outline border-success/40 text-success hover:bg-success/10 text-[9px] h-6 px-2 flex-1 font-bold"
                            >
                              Trust
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 border border-border rounded-lg bg-[#0a0a0c]">
                  <span className="text-sm text-muted">Generate transactions or perform scans to build the network graph.</span>
                </div>
              )}
           </div>
        </div>

        {/* Right side: Threat feed + Analyst Case log notes */}
        <div className="col-span-1 flex-col gap-6">
          {/* Live threat feed */}
          <div className="card flex-col">
            <h3 className="h4 mb-3.5 flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isSimulating ? 'bg-destructive animate-pulse' : 'bg-success'}`}></span>
              Live Threat Feed
            </h3>
            <div className="flex-col gap-2 overflow-y-auto pr-1" style={{ height: '160px', overflowY: 'auto' }}>
              <AnimatePresence initial={false}>
                {history.map((tx, idx) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, x: -30, height: 0 }}
                    animate={{ opacity: 1, x: 0, height: 'auto' }}
                    exit={{ opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    key={tx.id} 
                    className="p-2.5 rounded-lg flex-col gap-1 mb-2 bg-[#1b1b1f]/60 hover:bg-[#1b1b1f] border border-border/30 transition-colors"
                    style={{ 
                      borderLeft: `3.5px solid ${tx.status === 'Fraud' ? 'var(--destructive)' : 'var(--success)'}` 
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-muted">{tx.timestamp}</span>
                      {tx.status === 'Fraud' ? (
                        <span className="text-[9px] font-bold text-destructive flex items-center gap-1"><AlertTriangle size={9}/> FRAUD</span>
                      ) : (
                        <span className="text-[9px] font-bold text-success flex items-center gap-1"><CheckCircle2 size={9}/> SAFE</span>
                      )}
                    </div>
                    <div className="text-[10px] font-semibold flex items-center gap-1 mt-0.5">
                      {tx.source.substring(0, 8)} <ArrowRight size={8} className="text-muted" /> {tx.destination.substring(0, 8)}
                    </div>
                    <div className="flex justify-between mt-0.5 items-center">
                      <span className="text-[10px] font-bold text-primary">${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      <span className="text-[9px] text-muted">Risk: {(tx.riskScore * 100).toFixed(1)}%</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {history.length === 0 && <span className="text-sm text-muted">Waiting for transactions...</span>}
            </div>
          </div>

          {/* Analyst Case SOC Log */}
          <div className="card flex-col">
            <h3 className="h4 mb-3.5 flex items-center gap-2 text-primary">
              <ShieldAlert size={18} />
              Analyst SOC Log
            </h3>
            
            <div className="soc-log-feed" style={{ height: '160px' }}>
              <AnimatePresence initial={false}>
                {socActions.map((action) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={action.id}
                    className={`soc-log-item ${action.actionType}`}
                  >
                    <div className="flex justify-between items-center border-b border-border/30 pb-1">
                      <span className="font-bold text-foreground text-[10px]">{action.accountId}</span>
                      <span className={`soc-badge soc-badge-${action.actionType}`}>
                        {action.actionType === 'freeze' ? 'Quarantined' : action.actionType === 'audit' ? 'Auditing' : 'Trusted'}
                      </span>
                    </div>
                    <p className="text-[9.5px] text-muted-foreground leading-normal mt-1">{action.details}</p>
                    
                    {/* Render custom analyst auditing notes */}
                    {action.notes && (
                      <div className="mt-1 border-t border-border/20 pt-1 text-[9px] italic text-primary/80 leading-normal">
                        Note: {action.notes}
                      </div>
                    )}
                    
                    <span className="text-[8px] text-muted-foreground/60 mt-1 text-right">{action.timestamp}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
              {socActions.length === 0 && (
                <div className="text-center py-6 text-muted-foreground text-xs font-semibold">
                  No analyst intercepts logged.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
