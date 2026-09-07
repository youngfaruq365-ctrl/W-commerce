import React, { useState } from 'react';
import axios from 'axios';
import { Megaphone, CheckCircle, ArrowRight, ArrowLeft, Sparkles, Download, Package, AlertCircle, Users, Settings, Star, Link, Truck, Zap, DollarSign } from 'lucide-react';

const AdminLiveTxStudio = ({ onSuccess }) => {
  const [step, setStep] = useState('details');
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startProcess = async () => {
    setStep('processing');
    setIsSubmitting(true);
    setProgress(10);
    setProgressText('Initializing...');
    
    try {
      const res = await axios.post('/api/v1/admin/livetx/action', {});
      setProgress(100);
      setProgressText('Complete');
      setIsSubmitting(false);
      setStep('success');
    } catch (err) {
      setProgressText('Failed. Try again.');
      setTimeout(() => {
        setIsSubmitting(false);
        setStep('details');
      }, 1500);
    }
  };

  return (
    <div className="flex-1 flex flex-col relative w-full h-full max-w-4xl mx-auto">
      
      {step !== 'processing' && step !== 'success' && (
        <div className="flex justify-center items-center mb-8 pb-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 ${step === 'details' ? 'text-[#00b873] font-bold' : 'text-[#00b873]'}`}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white bg-[#00b873]">1</div>
              Action
            </div>
            <div className={`w-8 h-px ${['format', 'quantity', 'evidence', 'mapping', 'notifications', 'reason', 'auth', 'cargo', 'budget', 'settings', 'schedule', 'destination'].includes(step) ? 'bg-[#00b873]' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center gap-2 ${['format', 'quantity', 'evidence', 'mapping', 'notifications', 'reason', 'auth', 'cargo', 'budget', 'settings', 'schedule', 'destination'].includes(step) ? 'text-[#00b873] font-bold' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white ${['format', 'quantity', 'evidence', 'mapping', 'notifications', 'reason', 'auth', 'cargo', 'budget', 'settings', 'schedule', 'destination'].includes(step) ? 'bg-[#00b873]' : 'bg-gray-200'}`}>2</div>
              Confirm
            </div>
          </div>
        </div>
      )}

      {step === 'details' && (
        <div className="animate-in slide-in-from-right duration-300 flex-1 flex flex-col w-full mx-auto max-w-2xl text-center">
          <img src="/assets/images/studio/theme-preview-1.png" alt="Studio Icon" className="w-full max-w-[200px] mx-auto mb-4 object-contain h-[150px]" onError={(e) => { e.target.style.display='none'; }} />
          <h2 className="text-2xl font-extrabold text-black">Monitor Network</h2>
          <p className="text-[var(--text-muted)] mt-2">Monitor live blockchain and system transactions.</p>
          
          <div className="mt-8 space-y-4 text-left">
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1">Additional Details</label>
              <textarea className="w-full bg-gray-50 border border-[var(--border-color)] rounded-xl p-3 text-black focus:border-[#00b873] outline-none h-32" placeholder="Provide any necessary information here..."></textarea>
            </div>
          </div>
          
          <button onClick={() => setStep('format')} className="w-full bg-[#00b873] text-white font-bold py-3 rounded-xl hover:bg-[#009960] transition-colors mt-6 flex justify-center items-center gap-2">
            Next Step <ArrowRight size={18}/>
          </button>
        </div>
      )}

      {step === 'format' && (
        <div className="animate-in slide-in-from-right duration-300 flex-1 flex flex-col w-full mx-auto max-w-2xl">
          <div className="flex items-center mb-6">
            <button onClick={() => setStep('details')} className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft size={24} /></button>
            <div>
              <h2 className="text-2xl font-extrabold text-black">Confirmation</h2>
              <p className="text-[var(--text-muted)]">Please review and confirm your action.</p>
            </div>
          </div>
          <div className="space-y-6 flex-1">
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
              <p className="text-gray-600">You are about to initiate the <strong>Monitor Network</strong> process. This action is securely logged and processed via our backend infrastructure.</p>
            </div>
          </div>
          <button onClick={startProcess} disabled={isSubmitting} className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-colors mt-6 shadow-xl hover:shadow-2xl flex justify-center items-center gap-2 text-lg">
            Halt Network <Sparkles size={20}/>
          </button>
        </div>
      )}

      {step === 'processing' && (
        <div className="flex flex-col items-center justify-center flex-1 py-12 animate-in fade-in zoom-in duration-500">
          <div className="relative w-48 h-48 mb-8">
            <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="48" fill="none" stroke="#00b873" strokeWidth="4" strokeDasharray={`${progress * 3}, 300`} strokeLinecap="round" className="transform -rotate-90 origin-center transition-all duration-500 ease-out" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-black">
              <img src="/assets/images/studio/payment-rocket.png" alt="Processing" className="w-16 h-16 object-contain animate-bounce mb-2" onError={(e) => { e.target.style.display='none'; }} />
              <span className="text-3xl font-bold">{progress}%</span>
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-black mb-2 animate-pulse">Processing...</h3>
          <p className="text-[var(--text-muted)] text-lg">{progressText}</p>
        </div>
      )}

      {step === 'success' && (
        <div className="flex flex-col items-center justify-center flex-1 py-12 animate-in slide-in-from-bottom duration-500">
          <img src="/assets/images/studio/success-celebration.png" alt="Success" className="w-full max-w-[280px] mx-auto mb-4 object-contain h-[200px]" onError={(e) => { e.target.style.display='none'; }} />
          <h2 className="text-3xl font-extrabold text-black mb-2">Success!</h2>
          <p className="text-[var(--text-muted)] text-lg mb-8 max-w-md text-center">
            Your action has been completed successfully.
          </p>
          <div className="flex gap-4 w-full max-w-[400px]">
            <button onClick={() => { if (onSuccess) onSuccess(); }} className="flex-1 bg-[#00b873] hover:bg-[#009960] text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:-translate-y-1">
              Return to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLiveTxStudio;
