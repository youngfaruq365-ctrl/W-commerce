import { useState, useRef, useCallback, useEffect } from "react";

const STORAGE_KEY = "feed_audio_muted";

// Single shared audio element across all feed cards (TikTok architecture)
let globalAudio = null;
let globalListeners = new Set();

function getGlobalAudio() {
  if (!globalAudio && typeof window !== "undefined") {
    globalAudio = new Audio();
    globalAudio.loop = true;
    globalAudio.volume = 0.7;
    globalAudio.preload = "metadata";
  }
  return globalAudio;
}

export function useFeedAudio() {
  const [isMuted, setIsMuted] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === null ? true : stored === "true"; // default muted
    } catch {
      return true;
    }
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(null);
  const currentUrlRef = useRef(null);

  // Sync state across all hook instances
  useEffect(() => {
    const listener = ({ muted, playing, url }) => {
      setIsMuted(muted);
      setIsPlaying(playing);
      setCurrentUrl(url);
    };
    globalListeners.add(listener);
    return () => globalListeners.delete(listener);
  }, []);

  const broadcast = useCallback((muted, playing, url) => {
    globalListeners.forEach(fn => fn({ muted, playing, url }));
  }, []);

  const playAudio = useCallback((url) => {
    if (!url) return;
    const audio = getGlobalAudio();
    if (!audio) return;
    if (currentUrlRef.current !== url) {
      audio.src = url;
      currentUrlRef.current = url;
    }
    const storedMuted = (() => {
      try { return localStorage.getItem(STORAGE_KEY) === "true"; } catch { return true; }
    })();
    audio.muted = storedMuted;
    audio.play().catch(() => {});
    setCurrentUrl(url);
    setIsPlaying(true);
    broadcast(storedMuted, true, url);
  }, [broadcast]);

  const pauseAudio = useCallback(() => {
    const audio = getGlobalAudio();
    if (!audio) return;
    audio.pause();
    setIsPlaying(false);
    broadcast(audio.muted, false, currentUrlRef.current);
  }, [broadcast]);

  const toggleMute = useCallback(() => {
    const audio = getGlobalAudio();
    if (!audio) return;
    const newMuted = !audio.muted;
    audio.muted = newMuted;
    try { localStorage.setItem(STORAGE_KEY, String(newMuted)); } catch {}
    setIsMuted(newMuted);
    broadcast(newMuted, isPlaying, currentUrlRef.current);
  }, [broadcast, isPlaying]);

  return { playAudio, pauseAudio, toggleMute, isMuted, isPlaying, currentUrl };
}
