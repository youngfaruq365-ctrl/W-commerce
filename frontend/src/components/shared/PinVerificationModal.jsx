import React, { useState } from 'react';
import { Key, Lock, CheckCircle, ArrowRight, ShieldCheck, Mail } from 'lucide-react';
import { toast } from 'react-hot-toast';

const PinVerificationModal = ({
  isOpen,
  onClose,
  onSuccess, // (pin) => void
  store // useSellerStore or useWalletStore
}) => {
  const [mode, setMode] = useState('VERIFY'); // VERIFY, SET, FORGOT, RESET
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    store.getState().clearError?.();
    onClose();
  };

  const handleVerify = () => {
    if (pin.length < 4) return toast.error('PIN must be at least 4 digits');
    store.getState().clearError?.();
    onSuccess(pin);
  };

  const handleSetPin = async () => {
    if (newPin.length < 4) return toast.error('PIN must be at least 4 digits');
    if (newPin !== confirmPin) return toast.error('PINs do not match');
    setLoading(true);
    store.getState().clearError?.();
    try {
      await store.getState().setWithdrawPin(newPin);
      toast.success('Withdrawal PIN set successfully');
      setMode('VERIFY');
      setPin(newPin);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to set PIN';
      toast.error(msg);
      if (msg.toLowerCase().includes('already set')) {
        setMode('RESET');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPin = async () => {
    setLoading(true);
    store.getState().clearError?.();
    try {
      const res = await store.getState().forgotWithdrawPin();
      toast.success(res?.message || 'OTP sent to your email');
      if (res?.devOtp) {
        setOtp(res.devOtp);
        toast(`OTP autofilled: ${res.devOtp}`, { icon: '🔑' });
      }
      setMode('RESET');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send OTP';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPin = async () => {
    if (newPin.length < 4) return toast.error('New PIN must be at least 4 digits');
    if (newPin !== confirmPin) return toast.error('PINs do not match');
    if (!otp) return toast.error('Please enter the OTP');
    setLoading(true);
    store.getState().clearError?.();
    try {
      await store.getState().resetWithdrawPin(otp, newPin);
      toast.success('Withdrawal PIN reset successfully');
      setMode('VERIFY');
      setPin(newPin);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="modal-panel bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 transition-colors"
        >
          ✕
        </button>

        {mode === 'VERIFY' && (
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-black text-white rounded-full flex items-center justify-center mb-4">
              <ShieldCheck size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-black">Enter PIN</h2>
            <p className="text-sm text-gray-500 mb-6">Please enter your withdrawal PIN to authorize this transaction.</p>
            
            <input 
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              style={{ color: '#000000', backgroundColor: '#ffffff' }}
              className="w-full text-center text-3xl tracking-[1em] py-4 border-2 border-gray-300 rounded-xl focus:border-black focus:ring-0 outline-none transition-colors mb-4 text-black bg-white placeholder:text-gray-400 font-bold"
              autoFocus
            />

            <button 
              onClick={handleVerify}
              disabled={loading || pin.length < 4}
              className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              Verify <ArrowRight size={20} />
            </button>
            <div className="mt-4 flex flex-col gap-2">
              <button onClick={() => setMode('SET')} className="text-sm text-gray-600 hover:text-black transition-colors cursor-pointer">
                Haven't set a PIN yet? Set one here.
              </button>
              <button onClick={handleForgotPin} className="text-sm font-semibold text-black hover:underline transition-colors cursor-pointer">
                Forgot PIN?
              </button>
            </div>
          </div>
        )}

        {mode === 'SET' && (
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-black text-white rounded-full flex items-center justify-center mb-4">
              <Lock size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-black">Set Withdrawal PIN</h2>
            <p className="text-sm text-gray-600 mb-6 font-medium">Create a secure PIN to authorize future withdrawals.</p>
            
            <input 
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="New PIN (4-6 digits)"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              style={{ color: '#000000', backgroundColor: '#ffffff' }}
              className="w-full text-center text-xl tracking-[0.5em] py-3 border-2 border-gray-300 rounded-xl focus:border-black focus:ring-0 outline-none transition-colors mb-3 text-black bg-white placeholder:text-gray-400 font-bold"
            />
            <input 
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="Confirm PIN"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              style={{ color: '#000000', backgroundColor: '#ffffff' }}
              className="w-full text-center text-xl tracking-[0.5em] py-3 border-2 border-gray-300 rounded-xl focus:border-black focus:ring-0 outline-none transition-colors mb-6 text-black bg-white placeholder:text-gray-400 font-bold"
            />

            <button 
              onClick={handleSetPin}
              disabled={loading || newPin.length < 4}
              className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? 'Setting...' : 'Set PIN'} <CheckCircle size={20} />
            </button>
            <button onClick={() => setMode('VERIFY')} className="mt-4 text-sm font-semibold text-gray-600 hover:text-black transition-colors cursor-pointer">
              Back to Verify
            </button>
          </div>
        )}

        {mode === 'RESET' && (
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-black text-white rounded-full flex items-center justify-center mb-4">
              <Mail size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-black">Reset PIN</h2>
            <p className="text-sm text-gray-600 mb-6 font-medium">Enter the OTP sent to your email and your new PIN.</p>
            
            <input 
              type="text"
              placeholder="Enter 6-digit OTP"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              style={{ color: '#000000', backgroundColor: '#ffffff' }}
              className="w-full text-center text-xl tracking-[0.5em] py-3 border-2 border-gray-300 rounded-xl focus:border-black focus:ring-0 outline-none transition-colors mb-3 text-black bg-white placeholder:text-gray-400 font-bold"
            />
            <input 
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="New PIN (4-6 digits)"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              style={{ color: '#000000', backgroundColor: '#ffffff' }}
              className="w-full text-center text-xl tracking-[0.5em] py-3 border-2 border-gray-300 rounded-xl focus:border-black focus:ring-0 outline-none transition-colors mb-3 text-black bg-white placeholder:text-gray-400 font-bold"
            />
            <input 
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="Confirm New PIN"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              style={{ color: '#000000', backgroundColor: '#ffffff' }}
              className="w-full text-center text-xl tracking-[0.5em] py-3 border-2 border-gray-300 rounded-xl focus:border-black focus:ring-0 outline-none transition-colors mb-6 text-black bg-white placeholder:text-gray-400 font-bold"
            />

            <button 
              onClick={handleResetPin}
              disabled={loading || newPin.length < 4 || otp.length < 6}
              className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? 'Resetting...' : 'Reset PIN'} <CheckCircle size={20} />
            </button>
            <div className="mt-4 flex items-center justify-between">
              <button 
                type="button" 
                onClick={handleForgotPin} 
                disabled={loading}
                className="text-sm font-semibold text-gray-600 hover:text-black underline cursor-pointer disabled:opacity-50"
              >
                Resend OTP
              </button>
              <button onClick={() => setMode('VERIFY')} className="text-sm text-gray-500 hover:text-black transition-colors cursor-pointer">
                Back to Verify
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default PinVerificationModal;
