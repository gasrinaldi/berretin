"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

type SplashProps = {
  onEnter: () => void;
};

export function Splash({ onEnter }: SplashProps) {
  const portAudioRef = useRef<HTMLAudioElement | null>(null);
  const crowdAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioFrameRef = useRef<number | null>(null);
  const audioStartedRef = useRef(false);
  const mutedRef = useRef(false);
  const enteringRef = useRef(false);
  const [isMuted, setIsMuted] = useState(false);
  const startAudioRef = useRef<() => Promise<void>>(async () => undefined);
  const reduceMotion = useReducedMotion();

  const fadeAudio = useCallback((targetPort: number, targetCrowd: number, duration: number, onComplete?: () => void) => {
    if (audioFrameRef.current !== null) window.cancelAnimationFrame(audioFrameRef.current);
    const portAudio = portAudioRef.current;
    const crowdAudio = crowdAudioRef.current;
    if (!portAudio || !crowdAudio) return;
    const startPort = portAudio.volume;
    const startCrowd = crowdAudio.volume;
    const startedAt = performance.now();
    const animateVolume = (timestamp: number) => {
      const progress = Math.min((timestamp - startedAt) / duration, 1);
      const eased = progress * progress * (3 - 2 * progress);
      portAudio.volume = startPort + (targetPort - startPort) * eased;
      crowdAudio.volume = startCrowd + (targetCrowd - startCrowd) * eased;
      if (progress < 1) {
        audioFrameRef.current = window.requestAnimationFrame(animateVolume);
      } else {
        audioFrameRef.current = null;
        onComplete?.();
      }
    };
    audioFrameRef.current = window.requestAnimationFrame(animateVolume);
  }, []);

  const startAudio = useCallback(async () => {
    if (audioStartedRef.current || mutedRef.current) return;
    const portAudio = portAudioRef.current;
    const crowdAudio = crowdAudioRef.current;
    if (!portAudio || !crowdAudio) return;
    audioStartedRef.current = true;
    portAudio.volume = 0;
    crowdAudio.volume = 0;
    try {
      portAudio.currentTime = 0;
      crowdAudio.currentTime = 0;
      await Promise.all([portAudio.play(), crowdAudio.play()]);
      fadeAudio(0.7, 0.45, 1500);
    } catch {
      audioStartedRef.current = false;
      portAudio.pause();
      crowdAudio.pause();
    }
  }, [fadeAudio]);

  const stopAudio = () => {
    const portAudio = portAudioRef.current;
    const crowdAudio = crowdAudioRef.current;
    if (!portAudio || !crowdAudio || !audioStartedRef.current) return;
    fadeAudio(0, 0, 450, () => {
      portAudio.pause();
      crowdAudio.pause();
      portAudio.currentTime = 0;
      crowdAudio.currentTime = 0;
      audioStartedRef.current = false;
    });
  };

  const toggleMute = () => {
    const nextMuted = !mutedRef.current;
    mutedRef.current = nextMuted;
    setIsMuted(nextMuted);
    if (!nextMuted) {
      if (audioStartedRef.current) {
        fadeAudio(0.7, 0.45, 700);
      } else {
        void startAudio();
      }
    } else if (audioStartedRef.current) {
      fadeAudio(0, 0, 350);
    }
  };

  const enterDictionary = () => {
    if (enteringRef.current) return;
    enteringRef.current = true;
    stopAudio();
    onEnter();
  };

  useEffect(() => {
    startAudioRef.current = startAudio;
  }, [startAudio]);

  useEffect(() => {
    const handleFirstInteraction = () => {
      void startAudioRef.current();
      window.removeEventListener("mousemove", handleFirstInteraction);
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("touchstart", handleFirstInteraction);
    };
    window.addEventListener("mousemove", handleFirstInteraction, { passive: true, once: true });
    window.addEventListener("click", handleFirstInteraction, { passive: true, once: true });
    window.addEventListener("touchstart", handleFirstInteraction, { passive: true, once: true });
    return () => {
      window.removeEventListener("mousemove", handleFirstInteraction);
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("touchstart", handleFirstInteraction);
      if (audioFrameRef.current !== null) window.cancelAnimationFrame(audioFrameRef.current);
    };
  }, []);

  return (
    <motion.section
      className="splash"
      aria-label="Presentación de Berretín"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.5, ease: "easeInOut" }}
    >
      <div className="splash-layers" aria-hidden="true">
        <Image src="/splash/splash-simple.jpg" alt="" fill priority sizes="100vw" className="splash-image" />
      </div>
      <div className="splash-vignette" aria-hidden="true" />
      <div className="splash-corner-shadow" aria-hidden="true" />
      <div className="splash-content">
        <p className="splash-eyebrow">un mapa navegable del lunfardo porteño</p>
        <Image className="splash-logo" src="/splash/logo.png" alt="Berretín" width={560} height={139} priority sizes="(max-width: 640px) 78vw, 560px" style={{ width: "clamp(280px, 55vw, 560px)", height: "auto" }} />
        <p className="splash-subtitle">como llegaron las palabras: en barco, por el puerto, en la boca de miles que se quedaron con el idioma nuevo</p>
        <button className="splash-enter" type="button" onClick={enterDictionary}>
          entrar al diccionario <span aria-hidden="true">→</span>
        </button>
      </div>
      <audio ref={portAudioRef} src="/sounds/puerto-ambiente.mp3" loop preload="auto" aria-hidden="true" />
      <audio ref={crowdAudioRef} src="/sounds/gente-murmullo.mp3" loop preload="auto" aria-hidden="true" />
      <button className="splash-audio-toggle" type="button" onClick={toggleMute} aria-label={isMuted ? "Activar sonido ambiente" : "Silenciar sonido ambiente"} aria-pressed={isMuted}>
        {isMuted ? <span aria-hidden="true">×</span> : <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4Z" /><path d="M17 9.5a4 4 0 0 1 0 5M19.5 7a7.5 7.5 0 0 1 0 10" /></svg>}
      </button>
    </motion.section>
  );
}
