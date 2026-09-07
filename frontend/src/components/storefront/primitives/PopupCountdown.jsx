import React, { useState, useEffect } from 'react';

const PopupCountdown = ({ endDate, theme }) => {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    // Mock countdown logic for the template preview
    const target = new Date().getTime() + (24 * 60 * 60 * 1000); // 24 hours from now
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = target - now;
      
      setTimeLeft({
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [endDate]);

  const NumberBox = ({ num, label }) => (
    <div className="flex flex-col items-center">
      <div 
        className="w-16 h-16 rounded flex items-center justify-center text-2xl font-bold shadow-inner"
        style={{ backgroundColor: 'rgba(0,0,0,0.2)', color: theme?.text || 'inherit' }}
      >
        {num.toString().padStart(2, '0')}
      </div>
      <span className="text-[10px] uppercase tracking-wider mt-1 opacity-70">{label}</span>
    </div>
  );

  return (
    <div className="flex justify-center gap-4 my-6">
      <NumberBox num={timeLeft.hours} label="Hours" />
      <div className="text-2xl font-bold mt-4" style={{ color: theme?.accent || 'inherit' }}>:</div>
      <NumberBox num={timeLeft.minutes} label="Mins" />
      <div className="text-2xl font-bold mt-4" style={{ color: theme?.accent || 'inherit' }}>:</div>
      <NumberBox num={timeLeft.seconds} label="Secs" />
    </div>
  );
};

export default PopupCountdown;
