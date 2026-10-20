import React, { useState } from 'react';
import { apiClient as axios } from '@/utils/apiClient';
import { Download, CheckCircle, ArrowRight, ArrowLeft, Sparkles, Package, AlertCircle, Users, Settings, Star, Link, Truck, Megaphone, Zap, DollarSign } from 'lucide-react';

const ExportOrdersStudio = ({ onSuccess }) => {
  const [step, setStep] = useState('details');
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dateRange, setDateRange] = useState('Last 30 Days');
  const [exportFormat, setExportFormat] = useState('CSV');
  const [csvData, setCsvData] = useState('');

  const startProcess = async () => {
    setStep('processing');
    setIsSubmitting(true);
    setProgress(10);
    setProgressText('Initializing...');
    
    try {
      setTimeout(() => { setProgress(40); setProgressText('Verifying data...'); }, 500);
      setTimeout(() => { setProgress(75); setProgressText('Compiling your data...'); }, 1000);

      const res = await axios.post('/api/v1/seller-studio/export-orders', { dateRange, format: exportFormat });
      if (res.data?.csvContent) {
        setCsvData(res.data.csvContent);
      }
      
      setProgress(100);
      setIsSubmitting(false);
      setStep('success');
    } catch (e) {
      setIsSubmitting(false);
      setProgressText('Failed.');
      setStep('format');
    }
  };

  const handleDownloadFile = () => {
    const content = csvData || 'Order ID,Date,Buyer,Email,Status,Total Amount\n';
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-export-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    if (onSuccess) onSuccess();
  };

  return (
    <div className="flex-1 flex flex-col relative w-full h-full max-w-4xl mx-auto">
      
      {/* STEPPER HEADER */}
      {step !== 'processing' && step !== 'success' && (
        <div className="flex justify-center items-center mb-8 pb-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 ${step === 'details' ? 'text-[#00b873] font-bold' : 'text-[#00b873]'}`}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white bg-[#00b873]">1</div>
              Details
            </div>
            <div className={`w-8 h-px ${['format', 'quantity', 'evidence', 'mapping', 'notifications', 'reason', 'auth', 'cargo', 'budget', 'settings', 'schedule', 'destination'].includes(step) ? 'bg-[#00b873]' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center gap-2 ${['format', 'quantity', 'evidence', 'mapping', 'notifications', 'reason', 'auth', 'cargo', 'budget', 'settings', 'schedule', 'destination'].includes(step) ? 'text-[#00b873] font-bold' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white ${['format', 'quantity', 'evidence', 'mapping', 'notifications', 'reason', 'auth', 'cargo', 'budget', 'settings', 'schedule', 'destination'].includes(step) ? 'bg-[#00b873]' : 'bg-gray-200'}`}>2</div>
              Format
            </div>
          </div>
        </div>
      )}

      {/* 1. DETAILS STEP */}
      {step === 'details' && (
        <div className="animate-in slide-in-from-right duration-300 flex-1 flex flex-col w-full mx-auto max-w-2xl">
          <div className="text-center mb-6">
            <img src="/assets/images/studio/intro-store-main.png" alt="Studio Icon" className="w-full max-w-[200px] mx-auto mb-4 object-contain h-[150px]" onError={(e) => { e.target.style.display='none'; }} />
            <h2 className="text-2xl font-extrabold text-black">Export Orders</h2>
            <p className="text-[var(--text-muted)]">Export your order data to CSV or PDF.</p>
          </div>
          <div className="space-y-4 flex-1">
            
      <div>
        <label className="block text-sm font-bold text-gray-800 mb-1">Date Range</label>
        <select
          value={dateRange}
          onChange={e => setDateRange(e.target.value)}
          className="w-full bg-gray-50 border border-[var(--border-color)] rounded-xl p-3 text-black focus:border-[#00b873] outline-none"
        >
          <option value="Last 7 Days">Last 7 Days</option>
          <option value="Last 30 Days">Last 30 Days</option>
          <option value="All Time">All Time</option>
        </select>
      </div>
    
          </div>
          <button onClick={() => setStep('format')} className="w-full bg-[#00b873] text-white font-bold py-3 rounded-xl hover:bg-[#009960] transition-colors mt-6 flex justify-center items-center gap-2">
            Next: Choose Format <ArrowRight size={18}/>
          </button>
        </div>
      )}

      {/* 2. MIDDLE STEP */}
      {step === 'format' && (
        <div className="animate-in slide-in-from-right duration-300 flex-1 flex flex-col w-full mx-auto max-w-2xl">
          <div className="flex items-center mb-6">
            <button onClick={() => setStep('details')} className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft size={24} /></button>
            <div>
              <h2 className="text-2xl font-extrabold text-black">Format</h2>
              <p className="text-[var(--text-muted)]">Complete the remaining details.</p>
            </div>
          </div>
          <div className="space-y-6 flex-1">
            
      <div>
        <label className="block text-sm font-bold text-gray-800 mb-3">Export Format</label>
        <div className="grid grid-cols-2 gap-4">
          <div
            onClick={() => setExportFormat('CSV')}
            className={`cursor-pointer border-2 rounded-xl p-4 text-center transition-colors ${exportFormat === 'CSV' ? 'border-[#00b873] bg-[#00b873]/10' : 'border-gray-200'}`}
          >
            <span className={`font-bold ${exportFormat === 'CSV' ? 'text-[#00b873]' : 'text-gray-600'}`}>CSV (Excel)</span>
          </div>
          <div
            onClick={() => setExportFormat('PDF')}
            className={`cursor-pointer border-2 rounded-xl p-4 text-center transition-colors ${exportFormat === 'PDF' ? 'border-[#00b873] bg-[#00b873]/10' : 'border-gray-200'}`}
          >
            <span className={`font-bold ${exportFormat === 'PDF' ? 'text-[#00b873]' : 'text-gray-600'}`}>PDF Report</span>
          </div>
        </div>
      </div>
    
          </div>
          <button onClick={startProcess} disabled={isSubmitting} className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-colors mt-6 shadow-xl hover:shadow-2xl flex justify-center items-center gap-2 text-lg">
            Generate Export <Sparkles size={20}/>
          </button>
        </div>
      )}

      {/* 3. PROCESSING STEP */}
      {step === 'processing' && (
        <div className="flex flex-col items-center justify-center flex-1 py-12 animate-in fade-in zoom-in duration-500">
          <div className="relative w-48 h-48 mb-8">
            <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
              <circle
                cx="50" cy="50" r="48"
                fill="none"
                stroke="#00b873"
                strokeWidth="4"
                strokeDasharray={`${progress * 3}, 300`}
                strokeLinecap="round"
                className="transform -rotate-90 origin-center transition-all duration-500 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-black">
              <img src="/assets/images/studio/payment-rocket.png" alt="Processing" className="w-16 h-16 object-contain animate-bounce mb-2" onError={(e) => { e.target.style.display='none'; }} />
              <span className="text-3xl font-bold">{progress}%</span>
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-black mb-2 animate-pulse">Compiling your data...</h3>
          <p className="text-[var(--text-muted)] text-lg">{progressText}</p>
        </div>
      )}

      {/* 4. SUCCESS STEP */}
      {step === 'success' && (
        <div className="flex flex-col items-center justify-center flex-1 py-12 animate-in slide-in-from-bottom duration-500">
          <img src="/assets/images/studio/success-celebration.png" alt="Success" className="w-full max-w-[280px] mx-auto mb-4 object-contain h-[200px]" onError={(e) => { e.target.style.display='none'; }} />
          <h2 className="text-3xl font-extrabold text-black mb-2">Success!</h2>
          <p className="text-[var(--text-muted)] text-lg mb-8 max-w-md text-center">
            Your orders have been exported successfully.
          </p>
          <div className="flex gap-4 w-full max-w-[400px]">
            <button 
              onClick={handleDownloadFile} 
              className="flex-1 bg-[#00b873] hover:bg-[#009960] text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:-translate-y-1"
            >
              Download File
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportOrdersStudio;
