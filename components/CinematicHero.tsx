"use client";

import { motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Dictionary } from "@/components/Dictionary";
import { SearchBar } from "@/components/SearchBar";

type CinematicHeroProps = {
  query: string;
  onQueryChange: (value: string) => void;
};

// Rango de parallax por capa (px en los extremos del viewport). El eje Y
// se atenúa un poco respecto del X, tal como lo pide el spec ("un poco
// más fuerte en X"). La placa maestra completa (safety net) no se mueve
// con el mouse: por eso no tiene rango propio, solo el zoom de cámara.
const RANGE_BACK = 5;
const RANGE_PORT = 9;
const RANGE_CROWD = 15;
const RANGE_TANGUERO = 20;
const RANGE_YOUTHS = 26;
const RANGE_CONTENT = 3;
const Y_DAMP = 0.7;

const BASE_OVERSCAN = 1.06;

// Cuánto scroll extra (además de los 100svh sticky) dura todo el recorrido
// de la bienvenida. Más corto bajo reduced-motion, como pide el spec.
const REVEAL_VH_FULL = 150;
const REVEAL_VH_REDUCED = 55;

export function CinematicHero({ query, onQueryChange }: CinematicHeroProps) {
  const shellRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [canParallax] = useState(() => typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches);
  const [isMuted, setIsMuted] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);

  const portAudioRef = useRef<HTMLAudioElement | null>(null);
  const crowdAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioStartedRef = useRef(false);
  const mutedRef = useRef(false);
  const audioFrameRef = useRef<number | null>(null);

  // Puntero crudo (-1..1) suavizado con spring: easing inmediato pero
  // prolijo, y retorno natural al centro al salir el mouse.
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 90, damping: 16, mass: 0.5 });
  const smoothY = useSpring(pointerY, { stiffness: 90, damping: 16, mass: 0.5 });

  // Progreso de scroll a lo largo de todo el recorrido (sticky + reveal).
  const { scrollYProgress } = useScroll({ target: shellRef, offset: ["start start", "end end"] });
  const scrollSpring = useSpring(scrollYProgress, { stiffness: 100, damping: 30, mass: 0.4 });
  const scrollProgress = reduceMotion ? scrollYProgress : scrollSpring;

  // 0–20%: parallax a pleno. Cae progresivamente hasta apagarse en 50%.
  const parallaxDamp = useTransform(scrollProgress, [0, 0.2, 0.5], [1, 1, 0], { clamp: true });
  const dampedX = useTransform([smoothX, parallaxDamp], (values) => (values[0] as number) * (values[1] as number));
  const dampedY = useTransform([smoothY, parallaxDamp], (values) => (values[0] as number) * (values[1] as number));

  const backX = useTransform(dampedX, (v) => -v * RANGE_BACK);
  const backY = useTransform(dampedY, (v) => -v * RANGE_BACK * Y_DAMP);
  const portX = useTransform(dampedX, (v) => -v * RANGE_PORT);
  const portY = useTransform(dampedY, (v) => -v * RANGE_PORT * Y_DAMP);
  const crowdX = useTransform(dampedX, (v) => -v * RANGE_CROWD);
  const crowdY = useTransform(dampedY, (v) => -v * RANGE_CROWD * Y_DAMP);
  const tangueroX = useTransform(dampedX, (v) => -v * RANGE_TANGUERO);
  const tangueroY = useTransform(dampedY, (v) => -v * RANGE_TANGUERO * Y_DAMP);
  const youthsX = useTransform(dampedX, (v) => -v * RANGE_YOUTHS);
  const youthsY = useTransform(dampedY, (v) => -v * RANGE_YOUTHS * Y_DAMP);
  const contentParallaxX = useTransform(dampedX, (v) => -v * RANGE_CONTENT);
  const contentParallaxY = useTransform(dampedY, (v) => -v * RANGE_CONTENT * Y_DAMP);

  // Avance de cámara: zoom leve y uniforme en las 6 capas entre 20% y 55%.
  // Bajo reduced-motion queda anulado (rango constante).
  const cameraScale = useTransform(scrollProgress, [0.2, 0.55], reduceMotion ? [1, 1] : [1, 1.08], { clamp: true });
  const backScale = useTransform(cameraScale, (s) => s * BASE_OVERSCAN);
  const masterScale = useTransform(cameraScale, (s) => s * BASE_OVERSCAN);
  const portScale = useTransform(cameraScale, (s) => s * BASE_OVERSCAN * 1.01);
  const crowdScale = useTransform(cameraScale, (s) => s * BASE_OVERSCAN * 1.015);
  const tangueroScale = useTransform(cameraScale, (s) => s * BASE_OVERSCAN * 1.02);
  const youthsScale = useTransform(cameraScale, (s) => s * BASE_OVERSCAN * 1.025);

  // Logo, tagline, buscador y cue se elevan y desvanecen entre 20% y 55%.
  const contentOpacity = useTransform(scrollProgress, [0.2, 0.55], [1, 0], { clamp: true });
  const contentLiftY = useTransform(scrollProgress, [0.2, 0.55], reduceMotion ? [0, 0] : [0, -40], { clamp: true });
  const contentY = useTransform([contentLiftY, contentParallaxY], (values) => (values[0] as number) + (values[1] as number));

  // El diccionario real asciende como cortina entre 35% y 100%.
  const curtainY = useTransform(scrollProgress, [0.35, 1], ["100%", "0%"], { clamp: true });

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

  // El diccionario queda "revelado" (flujo normal, ya no fixed) apenas el
  // scroll cruza el final del recorrido, y vuelve a la cortina si se
  // retrocede. Histéresis chica para evitar parpadeo cerca del límite.
  useMotionValueEvent(scrollProgress, "change", (latest) => {
    setIsRevealed((prev) => {
      if (!prev && latest >= 0.995) return true;
      if (prev && latest < 0.97) return false;
      return prev;
    });
  });

  // El sonido ambiente se apaga a medida que el diccionario cubre el hero
  // (35%–100%), no antes: así no queda sonando sin control tras el scroll.
  useMotionValueEvent(scrollProgress, "change", (latest) => {
    if (!audioStartedRef.current || mutedRef.current) return;
    const portAudio = portAudioRef.current;
    const crowdAudio = crowdAudioRef.current;
    if (!portAudio || !crowdAudio) return;
    const fade = latest <= 0.35 ? 1 : Math.max(0, 1 - (latest - 0.35) / 0.65);
    portAudio.volume = 0.7 * fade;
    crowdAudio.volume = 0.45 * fade;
    if (fade === 0 && !portAudio.paused) {
      portAudio.pause();
      crowdAudio.pause();
    } else if (fade > 0 && portAudio.paused) {
      void Promise.all([portAudio.play(), crowdAudio.play()]).catch(() => undefined);
    }
  });

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
    shellRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "end" });
  };

  return (
    <section
      ref={shellRef}
      className="cinehero-shell"
      style={{ height: `calc(100svh + ${reduceMotion ? REVEAL_VH_REDUCED : REVEAL_VH_FULL}vh)` }}
    >
      <div ref={stickyRef} className="cinehero-sticky" style={{ visibility: isRevealed ? "hidden" : "visible" }}>
        <div className="cinehero-layers" aria-hidden="true">
          <motion.img
            className="cinehero-plate"
            src="/splash/puerto-fondo-limpio.png"
            alt=""
            width={1672}
            height={941}
            style={{ x: backX, y: backY, scale: backScale }}
          />
          <motion.img
            className="cinehero-plate"
            src="/splash/escena-maestra.png"
            alt=""
            width={1672}
            height={941}
            style={{ scale: masterScale }}
          />
          <motion.img
            className="cinehero-plate cinehero-mask-port"
            src="/splash/escena-maestra.png"
            alt=""
            width={1672}
            height={941}
            style={{ x: portX, y: portY, scale: portScale }}
          />
          <motion.img
            className="cinehero-plate cinehero-mask-crowd"
            src="/splash/escena-maestra.png"
            alt=""
            width={1672}
            height={941}
            style={{ x: crowdX, y: crowdY, scale: crowdScale }}
          />
          <motion.img
            className="cinehero-plate cinehero-mask-tanguero"
            src="/splash/escena-maestra.png"
            alt=""
            width={1672}
            height={941}
            style={{ x: tangueroX, y: tangueroY, scale: tangueroScale }}
          />
          <motion.img
            className="cinehero-plate cinehero-mask-youths"
            src="/splash/escena-maestra.png"
            alt=""
            width={1672}
            height={941}
            style={{ x: youthsX, y: youthsY, scale: youthsScale }}
          />
        </div>

        <div className="cinehero-vignette" aria-hidden="true" />
        <div className="cinehero-corner-shadow" aria-hidden="true" />

        <motion.div className="cinehero-content" style={{ opacity: contentOpacity, x: contentParallaxX, y: contentY }}>
          <p className="cinehero-eyebrow">lunfardo porteño</p>
          <Image
            className="cinehero-logo"
            src="/splash/logo-berretin.png"
            alt="Berretín"
            width={2048}
            height={509}
            priority
            sizes="(max-width: 640px) 78vw, 480px"
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

      <motion.div className="cinehero-curtain" data-revealed={isRevealed ? "true" : "false"} style={{ y: curtainY }}>
        <div className="wrap">
          <header className="dictionary-intro">
            <p className="tagline">diccionario navegable del lunfardo porteño — palabras y expresiones, de dónde vienen y cómo se usan hoy</p>
          </header>
          <Dictionary query={query} onQueryChange={onQueryChange} />
        </div>
      </motion.div>
    </section>
  );
}
