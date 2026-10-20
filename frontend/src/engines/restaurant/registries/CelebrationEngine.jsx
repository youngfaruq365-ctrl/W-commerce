import React from 'react';
import confetti from 'canvas-confetti';

export const triggerCelebration = (level, style = 'default') => {
  const duration = level * 1000;
  const animationEnd = Date.now() + duration;

  // Level 1: ₦6-₦8 (Small lightweight particle burst)
  if (level === 1) {
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
    return;
  }

  // Level 2: ₦9-₦12 (Confetti + subtle scale animation)
  if (level === 2) {
    confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
    return;
  }

  // Level 3: ₦15 (Confetti + particles + success card)
  if (level === 3) {
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
    const randomInRange = (min, max) => Math.random() * (max - min) + min;
    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      const particleCount = 50 * (timeLeft / duration);
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
    }, 250);
    return;
  }

  // Level 4: ₦19 (Multi-stage celebration with branded particles)
  if (level === 4) {
    const end = Date.now() + (3 * 1000);
    const colors = ['#000000', '#ffffff'];
    (function frame() {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors: colors });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors: colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    }());
    return;
  }

  // Level 5: ₦25 (Premium cinematic celebration)
  if (level === 5) {
    const defaults = { spread: 360, ticks: 100, gravity: 0.5, decay: 0.94, startVelocity: 30, colors: ['#FFEAA7', '#FFD700', '#FFFFFF', '#000000'] };
    function shoot() {
      confetti({ ...defaults, particleCount: 60, scalar: 1.2, shapes: ['star'] });
      confetti({ ...defaults, particleCount: 20, scalar: 0.75, shapes: ['circle'] });
    }
    setTimeout(shoot, 0);
    setTimeout(shoot, 300);
    setTimeout(shoot, 600);
    return;
  }
};
