/**
 * SoundManager
 * Handles preloading and playing small UI audio feedback files.
 * Respects user preferences (can be muted globally).
 */

class SoundManager {
  constructor() {
    this.sounds = {};
    this.muted = localStorage.getItem('wcommerce-muted') === 'true';
    this.initialized = false;
  }

  // Only init sounds on first user interaction to bypass browser autoplay blocks
  init() {
    if (this.initialized) return;
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Define available sounds (paths relative to public folder)
    const soundList = [
      { name: 'success', url: '/sounds/success.mp3' },
      { name: 'error', url: '/sounds/error.mp3' },
      { name: 'notification', url: '/sounds/notification.mp3' },
      { name: 'cash', url: '/sounds/cash.mp3' } // For sales/checkouts
    ];

    soundList.forEach(sound => {
      const audio = new Audio(sound.url);
      audio.preload = 'auto';
      // Set very low volume for UI sounds
      audio.volume = 0.2; 
      this.sounds[sound.name] = audio;
    });

    this.initialized = true;
  }

  play(soundName) {
    if (this.muted || !this.sounds[soundName]) return;
    
    // Clone node to allow overlapping plays of the same sound
    const soundClone = this.sounds[soundName].cloneNode();
    soundClone.volume = this.sounds[soundName].volume;
    
    soundClone.play().catch(e => {
      // Ignore autoplay prevention errors
      console.warn(`Could not play sound ${soundName}:`, e);
    });
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('wcommerce-muted', this.muted);
    return this.muted;
  }
}

export const soundManager = new SoundManager();

// React hook for easy access
import { useState, useEffect } from 'react';

export const useSound = () => {
  const [isMuted, setIsMuted] = useState(soundManager.muted);

  useEffect(() => {
    // Attempt initialization (might fail if no user interaction yet)
    try {
      soundManager.init();
    } catch(e) {}
  }, []);

  const playSound = (name) => {
    // Force init if not already (user just interacted)
    soundManager.init();
    soundManager.play(name);
  };

  const toggleSound = () => {
    const newMutedState = soundManager.toggleMute();
    setIsMuted(newMutedState);
  };

  return { playSound, isMuted, toggleSound };
};
