import React, { useEffect, useRef, useState } from 'react';

export const VoiceCallVisualizer = ({ stream }) => {
  const visualizerBarsRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const sourceRef = useRef(null);

  useEffect(() => {
    if (!stream) {
      // If no stream, just do a gentle random pulse
      const interval = setInterval(() => {
        for (let i = 0; i < 20; i++) {
          if (visualizerBarsRef.current[i]) {
            visualizerBarsRef.current[i].style.height = `25%`;
            visualizerBarsRef.current[i].style.transition = 'height 0.3s ease';
          }
        }
      }, 300);
      return () => clearInterval(interval);
    }

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }

      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 64; // Gives us 32 frequency bins, we need 20

      // Disconnect previous if exists
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }

      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current);

      const updateVisualizer = () => {
        if (!analyserRef.current) return;
        
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        // We have 32 bins, take the first 20 for our bars
        for (let i = 0; i < 20; i++) {
          if (visualizerBarsRef.current[i]) {
            // Value is 0 to 255. Map to 15% to 100% height
            const val = Math.max(15, (dataArray[i] / 255) * 100);
            visualizerBarsRef.current[i].style.height = `${val}%`;
            visualizerBarsRef.current[i].style.transition = 'none'; // Instant update for stream
          }
        }

        animationFrameRef.current = requestAnimationFrame(updateVisualizer);
      };

      updateVisualizer();

    } catch (err) {
      // ignore
    }

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [stream]);

  return (
    <div className="w-full max-w-xs h-16 flex items-center justify-center gap-1">
      {[...Array(20)].map((_, i) => (
        <div 
          key={i} 
          ref={el => visualizerBarsRef.current[i] = el}
          className="w-1.5 bg-[var(--accent-gray)] rounded-full shadow-[0_0_10px_var(--accent-gray-dim)]" 
          style={{ height: '15%' }}
        />
      ))}
    </div>
  );
};

export default VoiceCallVisualizer;
