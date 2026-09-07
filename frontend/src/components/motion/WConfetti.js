import confetti from 'canvas-confetti';

export const fireSuccessConfetti = () => {
  const defaults = {
    spread: 360,
    ticks: 100,
    gravity: 0,
    decay: 0.94,
    startVelocity: 30,
    colors: ['#10b981', '#f59e0b', '#ffffff', '#3b82f6', '#8b5cf6']
  };

  const shoot = () => {
    // First burst - immediate pop
    confetti({
      ...defaults,
      particleCount: 50,
      scalar: 1.2,
      shapes: ['circle', 'square']
    });

    // Second burst - sides
    setTimeout(() => {
      confetti({
        ...defaults,
        particleCount: 80,
        angle: 60,
        spread: 80,
        origin: { x: 0, y: 0.5 },
        colors: ['#10b981', '#ffffff']
      });
      confetti({
        ...defaults,
        particleCount: 80,
        angle: 120,
        spread: 80,
        origin: { x: 1, y: 0.5 },
        colors: ['#f59e0b', '#ffffff']
      });
    }, 250);

    // Third subtle burst
    setTimeout(() => {
      confetti({
        ...defaults,
        particleCount: 40,
        scalar: 0.8,
        shapes: ['circle'],
        gravity: 0.5, // gentle fall
        origin: { x: 0.5, y: 0.4 }
      });
    }, 500);
  };

  shoot();
};

export const fireMiniConfetti = () => {
  confetti({
    particleCount: 40,
    spread: 60,
    origin: { y: 0.6 },
    colors: ['#10b981', '#ffffff', '#f59e0b'],
    disableForReducedMotion: true
  });
};
