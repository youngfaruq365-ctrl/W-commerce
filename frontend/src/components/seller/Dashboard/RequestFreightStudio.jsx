import React, { useState } from 'react';
import { Truck, CheckCircle, ArrowRight, ArrowLeft, Sparkles, Download, Package, AlertCircle, Users, Settings, Star, Link, Megaphone, Zap, DollarSign } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const RequestFreightStudio = ({ onSuccess }) => {
  const [step, setStep] = useState('details');
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('Lagos Central Hub');
  const [weight, setWeight] = useState('');
  const [volume, setVolume] = useState('');

  const startProcess = async () => {
    setStep('processing');
    setIsSubmitting(true);
    setProgress(10);
    setProgressText('Initializing...');
    
    try {
      setProgress(40);
      setProgressText('Verifying data...');
      
      const response = await axios.post('/api/v1/seller-studio/freight', {
        origin,
        destination,
        weight: Number(weight),
        volume: Number(volume)
      }, { withCredentials: true });
      
      setProgress(75);
      setProgressText('Calculating freight quote...');
      
      if (response.data.success) {
        setProgress(100);
        setStep('success');
        return;
      } else {
        throw new Error(response.data.message || 'Error requesting freight quote');
      }
    } catch (err) {
      setStep('cargo');
      toast.error(err.response?.data?.message || err.message || 'Error requesting freight quote');
    } finally {
      setIsSubmitting(false);
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
              Route
            </div>
            <div className={`w-8 h-px ${['format', 'quantity', 'evidence', 'mapping', 'notifications', 'reason', 'auth', 'cargo', 'budget', 'settings', 'schedule', 'destination'].includes(step) ? 'bg-[#00b873]' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center gap-2 ${['format', 'quantity', 'evidence', 'mapping', 'notifications', 'reason', 'auth', 'cargo', 'budget', 'settings', 'schedule', 'destination'].includes(step) ? 'text-[#00b873] font-bold' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white ${['format', 'quantity', 'evidence', 'mapping', 'notifications', 'reason', 'auth', 'cargo', 'budget', 'settings', 'schedule', 'destination'].includes(step) ? 'bg-[#00b873]' : 'bg-gray-200'}`}>2</div>
              Cargo
            </div>
          </div>
        </div>
      )}

      {/* 1. DETAILS STEP */}
      {step === 'details' && (
        <div className="animate-in slide-in-from-right duration-300 flex-1 flex flex-col w-full mx-auto max-w-2xl">
          <div className="text-center mb-6">
            <img src="/assets/images/studio/theme-preview-1.png" alt="Studio Icon" className="w-full max-w-[200px] mx-auto mb-4 object-contain h-[150px]" onError={(e) => { e.target.style.display='none'; }} />
            
            <div className="text-left mt-6">
              <label className="block text-sm font-semibold mb-2">Origin Port/Address</label>
              <input type="text" value={origin} onChange={e => setOrigin(e.target.value)} className="w-full p-4 border-2 border-gray-200 rounded-xl mb-6 text-lg font-bold" placeholder="e.g. Shenzhen, China" />
              
              <button onClick={() => setStep('cargo')} disabled={!origin} className="w-full bg-[#00b873] text-white font-bold py-4 rounded-xl hover:bg-[#009960] transition-colors shadow-lg hover:-translate-y-1">
                Continue to Cargo Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. CARGO STEP */}
      {step === 'cargo' && (
        <div className="animate-in slide-in-from-right duration-300 flex-1 flex flex-col w-full mx-auto max-w-2xl">
          <div className="flex items-center mb-6">
            <button onClick={() => setStep('details')} className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft size={24} /></button>
            <div>
              <h2 className="text-2xl font-extrabold text-black">Cargo Specifications</h2>
              <p className="text-[var(--text-muted)]">Provide weight and volume for your cargo.</p>
            </div>
          </div>
          <div className="space-y-6 flex-1">
            <div>
              <label className="block text-sm font-semibold mb-2">Total Weight (kg)</label>
              <input type="number" value={weight} onChange={e => setWeight(e.target.value)} className="w-full p-4 border-2 border-gray-200 rounded-xl mb-6 text-xl font-bold" placeholder="500" />
              
              <label className="block text-sm font-semibold mb-2 mt-4">Total Volume (CBM)</label>
              <input type="number" value={volume} onChange={e => setVolume(e.target.value)} className="w-full p-4 border-2 border-gray-200 rounded-xl mb-6 text-xl font-bold" placeholder="2.5" />
            </div>
          </div>
          <button onClick={startProcess} disabled={isSubmitting || !weight || !volume} className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-colors mt-6 shadow-xl hover:shadow-2xl flex justify-center items-center gap-2 text-lg">
            Request Freight Quote <Sparkles size={20}/>
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
          <h3 className="text-2xl font-extrabold text-black mb-2 animate-pulse">Calculating freight quote...</h3>
          <p className="text-[var(--text-muted)] text-lg">{progressText}</p>
        </div>
      )}

      {/* 4. SUCCESS STEP */}
      {step === 'success' && (
        <div className="flex flex-col items-center justify-center flex-1 py-12 animate-in slide-in-from-bottom duration-500">
          <img src="/assets/images/studio/success-celebration.png" alt="Success" className="w-full max-w-[280px] mx-auto mb-4 object-contain h-[200px]" onError={(e) => { e.target.style.display='none'; }} />
          <h2 className="text-3xl font-extrabold text-black mb-2">Success!</h2>
          <p className="text-[var(--text-muted)] text-lg mb-8 max-w-md text-center">
            Your freight request has been submitted for review.
          </p>
          <div className="flex gap-4 w-full max-w-[400px]">
            <button 
              onClick={() => { if (onSuccess) onSuccess(); }} 
              className="flex-1 bg-[#00b873] hover:bg-[#009960] text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:-translate-y-1"
            >
              View Logistics
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestFreightStudio;
