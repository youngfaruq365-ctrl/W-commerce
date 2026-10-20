import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../../utils/apiClient';
import toast from 'react-hot-toast';
import { useCartStore } from '../../store/cartStore';

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);
  const clearCart = useCartStore(state => state.clearCart);

  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref');
    
    if (!reference) {
      toast.error('Invalid payment reference');
      navigate('/cart', { replace: true });
      return;
    }

    const verify = async () => {
      try {
        const res = await apiClient.get(`/api/v1/payment/verify/${reference}`);
        if (res.data.success || res.data.status === 'success') {
          toast.success('Payment successful! Order confirmed.');
          clearCart(); // clear local cart state
          navigate('/buyer/dashboard', { replace: true });
        } else {
          toast.error('Payment verification failed');
          navigate('/cart', { replace: true });
        }
      } catch (err) {
        console.error('Verification error:', err);
        toast.error('Error verifying payment. Please check your orders.');
        navigate('/buyer/dashboard', { replace: true });
      } finally {
        setVerifying(false);
      }
    };

    verify();
  }, [searchParams, navigate, clearCart]);

  if (verifying) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-primary)]">
        <div className="w-12 h-12 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-bold text-[var(--text-main)]">Verifying your payment...</h2>
        <p className="text-[var(--text-muted)] mt-2">Please do not close this window.</p>
      </div>
    );
  }

  return null;
};

export default PaymentCallback;
