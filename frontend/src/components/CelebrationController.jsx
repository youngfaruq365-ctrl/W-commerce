import confetti from 'canvas-confetti';

// --- Centralized Celebration Engine ---

export const celebrate = (intensity = 'standard', e = null) => {
  // If user prefers reduced motion, don't show confetti
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  // Calculate origin if event is provided
  let origin = { x: 0.5, y: 0.5 };
  if (e && e.clientX && e.clientY) {
    origin = {
      x: e.clientX / window.innerWidth,
      y: e.clientY / window.innerHeight
    };
  }

  switch (intensity) {
    case 'subtle':
      confetti({
        particleCount: 30,
        spread: 40,
        origin,
        colors: ['#facc15', '#ffffff'],
        disableForReducedMotion: true
      });
      break;

    case 'standard':
      confetti({
        particleCount: 100,
        spread: 70,
        origin,
        colors: ['#facc15', '#d97706', '#ffffff', '#000000'],
        disableForReducedMotion: true
      });
      break;

    case 'major':
      const duration = 2000;
      const end = Date.now() + duration;

      (function frame() {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#facc15', '#d97706']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#facc15', '#d97706']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      }());
      break;

    case 'cinematic':
      const cinematicDuration = 4000;
      const cinematicEnd = Date.now() + cinematicDuration;
      
      (function frame() {
        confetti({
          particleCount: 10,
          startVelocity: 30,
          spread: 360,
          ticks: 60,
          origin: {
            x: Math.random(), // Animation origin - intentionally dynamic per frame
            y: Math.random() - 0.2
          },
          colors: ['#facc15', '#d97706', '#ffffff', '#000000', '#f3f4f6']
        });

        if (Date.now() < cinematicEnd) {
          requestAnimationFrame(frame);
        }
      }());
      break;

    default:
      break;
  }
};
