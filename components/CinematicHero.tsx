"use client";

import { motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { SearchBar } from "@/components/SearchBar";

type CinematicHeroProps = {
  query: string;
  onQueryChange: (value: string) => void;
};

// Rango de desplazamiento por capa, en px, tal como lo pide el spec:
// fondo 2–3px, multitud 4–5px, primer plano 7–9px.
const BACK_RANGE = 2.5;
const MID_RANGE = 4.5;
const FRONT_RANGE = 8;

export function CinematicHero({ query, onQueryChange }: CinematicHeroProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [canParallax] = useState(() => typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches);
  const [isMuted, setIsMuted] = useState(false);

  const portAudioRef = useRef<HTMLAudioElement | null>(null);
  const crowdAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioStartedRef = useRef(false);
  const mutedRef = useRef(false);
  const audioFrameRef = useRef<number | null>(null);

  // Puntero crudo (-1..1 en cada eje) y su versión suavizada con spring:
  // easing profesional al moverse y retorno lento al soltar el mouse.
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 55, damping: 18, mass: 0.7 });
  const smoothY = useSpring(pointerY, { stiffness: 55, damping: 18, mass: 0.7 });

  // Progreso de scroll dentro del recorrido corto de la sección sticky.
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const scrollSpring = useSpring(scrollYProgress, { stiffness: 100, damping: 30, mass: 0.4 });
  const scrollProgress = reduceMotion ? scrollYProgress : scrollSpring;

  // La intensidad del parallax de mouse cae a 0 en la primera mitad del scroll.
  const parallaxDamp = useTransform(scrollProgress, [0, 0.5], [1, 0], { clamp: true });
  const dampedX = useTransform([smoothX, parallaxDamp], (values) => (values[0] as number) * (values[1] as number));
  const dampedY = useTransform([smoothY, parallaxDamp], (values) => (values[0] as number) * (values[1] as number));

  // Sentido contrario al cursor en las tres capas, cada una con su rango.
  const backX = useTransform(dampedX, (v) => -v * BACK_RANGE);
  const backY = useTransform(dampedY, (v) => -v * BACK_RANGE);
  const midX = useTransform(dampedX, (v) => -v * MID_RANGE);
  const midY = useTransform(dampedY, (v) => -v * MID_RANGE);
  const frontX = useTransform(dampedX, (v) => -v * FRONT_RANGE);
  const frontY = useTransform(dampedY, (v) => -v * FRONT_RANGE);

  // Avance de cámara al hacer scroll: leve zoom + traslado hacia arriba.
  // Con reduced-motion se anula (rango constante) y queda solo el crossfade.
  const cameraScale = useTransform(scrollProgress, [0, 1], reduceMotion ? [1, 1] : [1, 1.12]);
  const backScale = useTransform(cameraScale, (s) => s * 1.05);
  const midScale = useTransform(cameraScale, (s) => s * 1.06);
  const frontScale = useTransform(cameraScale, (s) => s * 1.08);
  const cameraY = useTransform(scrollProgress, [0, 1], reduceMotion ? [0, 0] : [0, -34]);

  // Logo, tagline, buscador y cue se elevan y desvanecen en el primer 55%.
  const contentOpacity = useTransform(scrollProgress, [0, 0.55], [1, 0], { clamp: true });
  const contentY = useTransform(scrollProgress, [0, 0.55], [0, -44], { clamp: true });

  // La escena se funde con el fondo oscuro del diccionario hacia el final.
  const blendOpacity = useTransform(scrollProgress, [0.3, 0.95], [0, 1], { clamp: true });

  // El sonido ambiente acompaña el fundido: baja con la escena y se detiene
  // del todo antes de que el control de mute se vaya de la vista al scrollear.
  useMotionValueEvent(scrollProgress, "change", (latest) => {
    if (!audioStartedRef.current || mutedRef.current) return;
    const portAudio = portAudioRef.current;
    const crowdAudio = crowdAudioRef.current;
    if (!portAudio || !crowdAudio) return;
    const fade = Math.max(0, 1 - latest / 0.9);
    portAudio.volume = 0.7 * fade;
    crowdAudio.volume = 0.45 * fade;
    if (fade === 0 && !portAudio.paused) {
      portAudio.pause();
      crowdAudio.pause();
    } else if (fade > 0 && portAudio.paused) {
      void Promise.all([portAudio.play(), crowdAudio.play()]).catch(() => undefined);
    }
  });

  useEffect(() => {
    if (!canParallax || reduceMotion) return;
    const sticky = stickyRef.current;
    if (!sticky) return;

    const handleMove = (event: PointerEvent) => {
      const bounds = sticky.getBoundingClientRect();
      const nx = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
      const ny = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
      pointerX.set(nx);
      pointerY.set(ny);
    };
    const handleLeave = () => {
      pointerX.set(0);
      pointerY.set(0);
    };

    sticky.addEventListener("pointermove", handleMove, { passive: true });
    sticky.addEventListener("pointerleave", handleLeave, { passive: true });
    return () => {
      sticky.removeEventListener("pointermove", handleMove);
      sticky.removeEventListener("pointerleave", handleLeave);
    };
  }, [canParallax, reduceMotion, pointerX, pointerY]);

  const fadeAudio = (targetPort: number, targetCrowd: number, duration: number, onComplete?: () => void) => {
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
  };

  const startAudio = async () => {
    if (audioStartedRef.current || mutedRef.current) return;
    const portAudio = portAudioRef.current;
    const crowdAudio = crowdAudioRef.current;
    if (!portAudio || !crowdAudio) return;
    audioStartedRef.current = true;
    portAudio.volume = 0;
    crowdAudio.volume = 0;
    try {
      await Promise.all([portAudio.play(), crowdAudio.play()]);
      fadeAudio(0.7, 0.45, 1500);
    } catch {
      audioStartedRef.current = false;
      portAudio.pause();
      crowdAudio.pause();
    }
  };

  useEffect(() => {
    const handleFirstInteraction = () => {
      void startAudio();
      window.removeEventListener("pointerdown", handleFirstInteraction);
      window.removeEventListener("touchstart", handleFirstInteraction);
      window.removeEventListener("scroll", handleFirstInteraction);
    };
    window.addEventListener("pointerdown", handleFirstInteraction, { passive: true, once: true });
    window.addEventListener("touchstart", handleFirstInteraction, { passive: true, once: true });
    window.addEventListener("scroll", handleFirstInteraction, { passive: true, once: true });
    return () => {
      window.removeEventListener("pointerdown", handleFirstInteraction);
      window.removeEventListener("touchstart", handleFirstInteraction);
      window.removeEventListener("scroll", handleFirstInteraction);
      if (audioFrameRef.current !== null) window.cancelAnimationFrame(audioFrameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    document.getElementById("content")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  };

  return (
    <section ref={sectionRef} className="cinehero">
      <div ref={stickyRef} className="cinehero-sticky">
        <motion.div className="cinehero-layers" aria-hidden="true">
          <motion.img
            className="cinehero-layer cinehero-layer-back"
            src="/splash/fondo.jpg"
            alt=""
            width={1672}
            height={941}
            style={{ x: backX, y: backY, scale: backScale }}
          />
          <motion.img
            className="cinehero-layer cinehero-layer-mid"
            src="/splash/plano-medio.png"
            alt=""
            width={1672}
            height={941}
            style={{ x: midX, y: midY, scale: midScale }}
          />
          <motion.img
            className="cinehero-layer cinehero-layer-front"
            src="/splash/primer-plano.png"
            alt=""
            width={1672}
            height={941}
            style={{ x: frontX, y: frontY, scale: frontScale }}
          />
        </motion.div>

        <motion.div className="cinehero-camera" aria-hidden="true" style={{ y: cameraY }} />
        <div className="cinehero-vignette" aria-hidden="true" />
        <div className="cinehero-corner-shadow" aria-hidden="true" />
        <motion.div className="cinehero-blend" aria-hidden="true" style={{ opacity: blendOpacity }} />

        <motion.div className="cinehero-content" style={{ opacity: contentOpacity, y: contentY }}>
          <p className="cinehero-eyebrow">lunfardo porteño</p>
          <Image
            className="cinehero-logo"
            src="/splash/logo.png"
            alt="Berretín"
            width={560}
            height={139}
            priority
            sizes="(max-width: 640px) 78vw, 560px"
            style={{ width: "clamp(240px, 46vw, 480px)", height: "auto" }}
          />
          <p className="cinehero-tagline">diccionario de la calle argentina</p>
          <SearchBar id="hero-search" className="cinehero-search" value={query} onChange={onQueryChange} onSubmit={enterDictionary} />
        </motion.div>

        <motion.button
          className="cinehero-cue"
          type="button"
          onClick={enterDictionary}
          style={{ opacity: contentOpacity }}
        >
          deslizá para entrar <span aria-hidden="true">↓</span>
        </motion.button>

        <audio ref={portAudioRef} src="/sounds/puerto-ambiente.mp3" loop preload="auto" aria-hidden="true" />
        <audio ref={crowdAudioRef} src="/sounds/gente-murmullo.mp3" loop preload="auto" aria-hidden="true" />
        <button
          className="cinehero-audio-toggle"
          type="button"
          onClick={toggleMute}
          aria-label={isMuted ? "Activar sonido ambiente" : "Silenciar sonido ambiente"}
          aria-pressed={isMuted}
        >
          {isMuted ? (
            <span aria-hidden="true">×</span>
          ) : (
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M4 9v6h4l5 4V5L8 9H4Z" />
              <path d="M17 9.5a4 4 0 0 1 0 5M19.5 7a7.5 7.5 0 0 1 0 10" />
            </svg>
          )}
        </button>
      </div>
    </section>
  );
}
