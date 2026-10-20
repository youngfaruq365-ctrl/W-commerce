import React, { useState } from 'react';
import { Link, CheckCircle, ArrowRight, ArrowLeft, Sparkles, Download, Package, AlertCircle, Users, Settings, Star, Truck, Megaphone, Zap, DollarSign } from 'lucide-react';
import { apiClient as axios } from '@/utils/apiClient';
import toast from 'react-hot-toast';

const ConnectIntegrationStudio = ({ onSuccess }) => {
  const [step, setStep] = useState('details');
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [platform, setPlatform] = useState('Shopify');
  const [apiKey, setApiKey] = useState('');

  const startProcess = async () => {
    if (!platform || !apiKey) return toast.error('Platform and API Key are required');
    setStep('processing');
    setIsSubmitting(true);
    setProgress(10);
    setProgressText('Initializing...');
    
    setTimeout(() => { setProgress(40); setProgressText('Verifying data...'); }, 800);
    setTimeout(() => { setProgress(75); setProgressText('Establishing connection...'); }, 1600);

    try {
      await axios.post('/api/v1/seller/integration', { platform, apiKey }, { withCredentials: true });
      setTimeout(() => {
        setIsSubmitting(false);
        setProgress(100);
        setStep('success');
      }, 2400);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to connect integration');
      setIsSubmitting(false);
      setStep('auth');
    }
  };

  return (
    <div className="flex-1 flex flex-col relative w-full h-full max-w-4xl mx-auto">
      
      {/* STEPPER HEADER */}
      {step !== 'processing' && step !== 'success' && (
        <div className="flex justify-center items-center mb-8 pb-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 ${step === 'details' ? 'text-[#00b873] font-bold' : 'text-[#00b873]'}`}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white bg-[#00b873]">1</div>
              Select App
            </div>
            <div className={`w-8 h-px ${['format', 'quantity', 'evidence', 'mapping', 'notifications', 'reason', 'auth', 'cargo', 'budget', 'settings', 'schedule', 'destination'].includes(step) ? 'bg-[#00b873]' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center gap-2 ${['format', 'quantity', 'evidence', 'mapping', 'notifications', 'reason', 'auth', 'cargo', 'budget', 'settings', 'schedule', 'destination'].includes(step) ? 'text-[#00b873] font-bold' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white ${['format', 'quantity', 'evidence', 'mapping', 'notifications', 'reason', 'auth', 'cargo', 'budget', 'settings', 'schedule', 'destination'].includes(step) ? 'bg-[#00b873]' : 'bg-gray-200'}`}>2</div>
              Auth
            </div>
          </div>
        </div>
      )}

      {/* 1. DETAILS STEP */}
      {step === 'details' && (
        <div className="animate-in slide-in-from-right duration-300 flex-1 flex flex-col w-full mx-auto max-w-2xl">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-extrabold text-black">Connect App</h2>
            <p className="text-[var(--text-muted)]">Integrate external CRM or accounting tools.</p>
          </div>
          <div className="space-y-4 flex-1">
            
      <div>
        <label className="block text-sm font-bold text-gray-800 mb-3">Choose Platform</label>
        <div className="grid grid-cols-2 gap-4">
          <div onClick={() => setPlatform('Shopify')} className={`cursor-pointer border-2 ${platform === 'Shopify' ? 'border-[#00b873] bg-[#00b873]/10' : 'border-gray-200'} rounded-xl p-4 text-center`}>
            <span className={`font-bold ${platform === 'Shopify' ? 'text-[#00b873]' : 'text-gray-600'}`}>Shopify</span>
          </div>
          <div onClick={() => setPlatform('QuickBooks')} className={`cursor-pointer border-2 ${platform === 'QuickBooks' ? 'border-[#00b873] bg-[#00b873]/10' : 'border-gray-200'} rounded-xl p-4 text-center`}>
            <span className={`font-bold ${platform === 'QuickBooks' ? 'text-[#00b873]' : 'text-gray-600'}`}>QuickBooks</span>
          </div>
        </div>
      </div>
    
          </div>
          <button onClick={() => setStep('auth')} className="w-full bg-[#00b873] text-white font-bold py-3 rounded-xl hover:bg-[#009960] transition-colors mt-6 flex justify-center items-center gap-2">
            Next: Authentication <ArrowRight size={18}/>
          </button>
        </div>
      )}

      {/* 2. MIDDLE STEP */}
      {step === 'auth' && (
        <div className="animate-in slide-in-from-right duration-300 flex-1 flex flex-col w-full mx-auto max-w-2xl">
          <div className="flex items-center mb-6">
            <button onClick={() => setStep('details')} className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft size={24} /></button>
            <div>
              <h2 className="text-2xl font-extrabold text-black">Auth</h2>
              <p className="text-[var(--text-muted)]">Complete the remaining details.</p>
            </div>
          </div>
          <div className="space-y-6 flex-1">
            
      <div>
        <label className="block text-sm font-bold text-gray-800 mb-1">API Key</label>
        <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} type="password" placeholder="****************" className="w-full bg-gray-50 border border-[var(--border-color)] rounded-xl p-3 text-black focus:border-[#00b873] outline-none" />
      </div>
    
          </div>
          <button onClick={startProcess} disabled={isSubmitting} className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-colors mt-6 shadow-xl hover:shadow-2xl flex justify-center items-center gap-2 text-lg">
            Connect App <Sparkles size={20}/>
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
              <Link size={40} className="text-[#00b873] mb-2 animate-bounce" />
              <span className="text-3xl font-bold">{progress}%</span>
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-black mb-2 animate-pulse">Establishing connection...</h3>
          <p className="text-[var(--text-muted)] text-lg">{progressText}</p>
        </div>
      )}

      {/* 4. SUCCESS STEP */}
      {step === 'success' && (
        <div className="flex flex-col items-center justify-center flex-1 py-12 animate-in slide-in-from-bottom duration-500">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(0,255,0,0.2)]">
            <CheckCircle size={48} className="text-[#00b873]" />
          </div>
          <h2 className="text-3xl font-extrabold text-black mb-2">Success!</h2>
          <p className="text-[var(--text-muted)] text-lg mb-8 max-w-md text-center">
            Integration successfully connected.
          </p>
          <div className="flex gap-4 w-full max-w-[400px]">
            <button 
              onClick={() => { if (onSuccess) onSuccess(); }} 
              className="flex-1 bg-[#00b873] hover:bg-[#009960] text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:-translate-y-1"
            >
              Manage Integrations
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectIntegrationStudio;
