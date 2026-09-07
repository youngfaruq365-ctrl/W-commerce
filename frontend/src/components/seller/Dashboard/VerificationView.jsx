import React from 'react';
import VerificationForm from '../VerificationForm';

const VerificationView = ({ showNotification }) => {
  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-in-out]">
      <h1 className="text-3xl font-extrabold text-black mb-6">Identity & Trust Engine</h1>
      <VerificationForm showNotification={showNotification} />
    </div>
  );
};

export default VerificationView;
