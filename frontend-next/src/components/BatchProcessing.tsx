'use client';

import React, { useState } from 'react';
import { Transaction } from '@/app/page';
import { UploadCloud, Loader2, CheckCircle2, Search as SearchIcon, Download, SlidersHorizontal, AlertTriangle } from 'lucide-react';
import axios from 'axios';

export default function BatchProcessing({ addTransaction }: { addTransaction: (t: Transaction) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ total: number, fraud: number } | null>(null);
  const [allResults, setAllResults] = useState<any[]>([]);

  // Filtering and Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Safe' | 'Fraud'>('All');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setResult(null);
      setAllResults([]);
      setCurrentPage(1);
    }
  };

  const handleProcess = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setAllResults([]);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await axios.post('http://127.0.0.1:8000/batch-predict', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const data = res.data;
      if (data.error) {
        alert("Error: " + data.error);
        return;
      }
      
      setResult({ total: data.total, fraud: data.fraud_detected });
      setAllResults(data.results);
      
      // Feed first 10 transactions to the dashboard live stream
      const preview = data.results.slice(0, 10);
      preview.forEach((item: any) => {
        addTransaction({
          id: Math.random().toString(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          source: item.source,
          destination: item.destination,
          amount: item.amount,
          riskScore: item.probability,
          status: item.result === 'Fraudulent' ? 'Fraud' : 'Safe'
        });
      });
      
    } catch (e) {
      alert("Failed to connect to API or process batch. Please ensure the FastAPI backend is running.");
    } finally {
      setLoading(false);
    }
  };

  // Generate Sample Template CSV
  const downloadTemplate = () => {
    const headers = "step,type,amount,nameOrig,oldbalanceOrg,newbalanceOrig,nameDest,oldbalanceDest,newbalanceDest\n";
    const sampleRows = [
      "206,TRANSFER,245000.0,C6271823,245000.0,0.0,C721638,0.0,0.0",
      "12,PAYMENT,450.0,C1239821,8000.0,7550.0,M928371,300.0,750.0",
      "45,CASH_OUT,120000.0,C9872615,120000.0,0.0,C129381,0.0,120000.0",
      "180,PAYMENT,85.5,C7162534,400.0,314.5,M192837,0.0,0.0",
      "300,TRANSFER,500000.0,C2918273,500000.0,0.0,C9281726,0.0,0.0",
      "78,DEBIT,800.0,C9283712,4500.0,3700.0,C1028372,250.0,1050.0",
      "102,CASH_IN,15000.0,C1827362,1200.0,16200.0,C1237162,100000.0,85000.0"
    ].join("\n");
    
    const blob = new Blob([headers + sampleRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "fraudguard_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate and Export Analyzed Report CSV
  const downloadReport = () => {
    if (allResults.length === 0) return;
    const headers = "Transaction Index,Source,Destination,Amount,Risk Score,Verdict\n";
    const rows = allResults.map(item => 
      `${item.index},${item.source},${item.destination},${item.amount},${(item.probability * 100).toFixed(2)}%,${item.result === 'Fraudulent' ? 'FRAUD' : 'SAFE'}`
    ).join("\n");
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `fraudguard_batch_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter Logic
  const filteredItems = allResults.filter(item => {
    const matchesSearch = item.source.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.destination.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || 
                          (statusFilter === 'Safe' && item.result === 'Not Fraudulent') ||
                          (statusFilter === 'Fraud' && item.result === 'Fraudulent');
    return matchesSearch && matchesStatus;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = filteredItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="flex-col gap-6 animate-fade-in">
      {/* Upload Drag & Drop card */}
      <div className="card text-center py-12 flex-col items-center justify-center border-dashed border-2 border-border/80 bg-card">
        <UploadCloud size={56} className="text-muted-foreground mb-4" />
        <h3 className="h3 mb-1">Analyze Bulk Batches</h3>
        <p className="p text-sm mb-6 max-w-md">Upload transaction files in CSV format to trigger the ensemble model on multiple events at once.</p>
        
        <input type="file" id="csv-upload" className="hidden" accept=".csv" onChange={handleUpload} />
        <label htmlFor="csv-upload" className="btn btn-primary cursor-pointer font-bold">Select CSV File</label>

        {file && !result && !loading && (
          <div className="mt-4 p-3 bg-secondary rounded-lg border border-border/60 text-xs font-semibold">
            📂 {file.name} ({(file.size / 1024).toFixed(1)} KB) Selected
          </div>
        )}
        
        {loading && (
          <div className="mt-4 p-3 bg-secondary rounded-lg flex items-center justify-center gap-2 text-xs font-semibold">
             <Loader2 className="animate-spin text-primary" size={16} /> Parsing transaction rows...
          </div>
        )}
        
        {result && (
          <div className="mt-4 p-4 border border-success/30 rounded-lg flex-col gap-1.5 bg-success/5 max-w-lg">
             <div className="flex items-center justify-center gap-1.5 text-success font-bold text-base">
                <CheckCircle2 size={20} /> Batch Evaluated Successfully
             </div>
             <p className="text-xs text-muted-foreground leading-normal">
               Scanned <b>{result.total.toLocaleString()}</b> transactions. Flagged <span className="text-destructive font-bold">{result.fraud}</span> anomalies. A preview has been added to your Command Center.
             </p>
          </div>
        )}
      </div>

      {/* CSV template download & Execute button */}
      <div className="flex justify-between items-center mt-2">
        <button onClick={downloadTemplate} className="btn btn-outline border-primary/40 text-primary hover:border-primary text-xs font-semibold flex items-center gap-1.5">
          <Download size={14} /> Download template.csv
        </button>
        <button 
          className="btn btn-primary font-bold px-6" 
          disabled={!file || loading} 
          onClick={handleProcess}
        >
          {loading ? 'Processing...' : '🚀 Execute Prediction Stacks'}
        </button>
      </div>

      {/* Paginated Results Table */}
      {allResults.length > 0 && (
        <div className="card flex-col gap-4 mt-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="h4 flex items-center gap-2">🔍 Audit Results Explorer</h3>
            <button onClick={downloadReport} className="btn btn-outline text-xs font-semibold flex items-center gap-1.5">
              <Download size={14} /> Export CSV Report
            </button>
          </div>

          {/* Search/Filter Toolbar */}
          <div className="flex gap-4 items-center mb-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
              <input 
                type="text" 
                placeholder="Search Account ID..." 
                className="input pl-9" 
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={14} className="text-muted-foreground" />
              <select 
                className="input w-36 bg-input text-foreground"
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}
              >
                <option value="All">All Verdicts</option>
                <option value="Safe">Legitimate</option>
                <option value="Fraud">Fraud Alert</option>
              </select>
            </div>
          </div>

          {/* Core Table rendering */}
          {filteredItems.length > 0 ? (
            <>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Index</th>
                      <th>Source ID</th>
                      <th>Recipient ID</th>
                      <th>Amount</th>
                      <th>Risk Score</th>
                      <th>Classification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedItems.map((item) => {
                      const isFraud = item.result === 'Fraudulent';
                      return (
                        <tr key={item.index} className={isFraud ? 'table-row-fraud' : ''}>
                          <td><b>#{item.index + 1}</b></td>
                          <td className="font-medium">{item.source}</td>
                          <td className="font-medium">{item.destination}</td>
                          <td className="font-bold text-primary">${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                          <td className={isFraud ? 'text-destructive font-bold' : 'text-success font-semibold'}>
                            {(item.probability * 100).toFixed(1)}%
                          </td>
                          <td>
                            <span className={`badge ${isFraud ? 'badge-destructive animate-pulse' : 'badge-success'}`}>
                              {isFraud ? 'FRAUD ALERT' : 'Legitimate'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination controls */}
              <div className="pagination">
                <span className="text-xs text-muted-foreground">
                  Showing <b>{(currentPage - 1) * ITEMS_PER_PAGE + 1}</b> to <b>{Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length)}</b> of <b>{filteredItems.length}</b> matches
                </span>
                <div className="flex gap-2">
                  <button 
                    className="btn btn-outline h-8 text-xs" 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  <button 
                    className="btn btn-outline h-8 text-xs" 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-col items-center justify-center text-center p-8 border border-border/30 bg-muted/10 rounded-lg mt-2">
              <AlertTriangle className="text-muted-foreground mx-auto mb-2" size={24} />
              <span className="text-xs text-muted-foreground">No records matched the filter query.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
