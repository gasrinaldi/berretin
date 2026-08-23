"use client";

import { motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Dictionary } from "@/components/Dictionary";
import { SearchBar } from "@/components/SearchBar";
import { AuxNav } from "@/components/AuxNav";

type CinematicHeroProps = {
  query: string;
  onQueryChange: (value: string) => void;
};

// Rango de parallax por placa (px en los extremos del viewport), tal como
// lo pide el spec: dos placas completas (fondo + escena) más la capa UI.
// Nada de esto mueve sectores de personajes por separado — cada placa
// viaja entera, sin deformarse.
const RANGE_BACK_X = 3;
const RANGE_BACK_Y = 2;
const RANGE_SCENE_X = 8;
const RANGE_SCENE_Y = 5;
const RANGE_UI_X = 11;
const RANGE_UI_Y = 7;

const BACK_BASE_SCALE = 1.04;
const SCENE_SCALE_MIN = 1.055;
const SCENE_SCALE_MAX = 1.065;

// Cuánto scroll extra (además del 100svh sticky) dura la bienvenida.
// 70–85vh en desktop, 45–55svh en mobile, más corto aún con reduced-motion.
export function CinematicHero({ query, onQueryChange }: CinematicHeroProps) {
  const shellRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [canParallax] = useState(() => typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches);
  // Arranca en false (igual que el servidor, sin window) para no generar
  // un hydration mismatch en el "style" del shell; el efecto de abajo lo
  // corrige apenas monta en cliente, y lo mantiene al rotar/resize.
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  // Corrección (px) para que la cortina, al pasar a position:relative, no
  // deje un hueco: el hero oculto sigue reservando 100svh en el flujo,
  // pero el recorrido visible es más corto, así que compensamos con un
  // top negativo medido en el instante exacto del cambio (ver más abajo).
  const [curtainTopOffset, setCurtainTopOffset] = useState(0);

  const revealVh = isMobileViewport ? (reduceMotion ? 40 : 50) : reduceMotion ? 55 : 78;
  const revealUnit = isMobileViewport ? "svh" : "vh";

  // Re-sincroniza el breakpoint si el layout todavía no se había asentado
  // al montar, o si el viewport cambia después (rotación, resize).
  useEffect(() => {
    const query = window.matchMedia("(max-width: 640px)");
    const sync = () => setIsMobileViewport(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const portAudioRef = useRef<HTMLAudioElement | null>(null);
  const crowdAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioStartedRef = useRef(false);
  const mutedRef = useRef(false);
  const audioFrameRef = useRef<number | null>(null);

  // Puntero crudo (-1..1) suavizado con spring: reacciona de inmediato y
  // vuelve con naturalidad al centro al salir el mouse.
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 90, damping: 16, mass: 0.5 });
  const smoothY = useSpring(pointerY, { stiffness: 90, damping: 16, mass: 0.5 });

  // Progreso de scroll, sin spring adicional: responde de forma directa,
  // sin sensación amortiguada, para que un solo swipe fuerte alcance.
  const { scrollYProgress: scrollProgress } = useScroll({ target: shellRef, offset: ["start start", "end end"] });

  // 0–10%: parallax a pleno. Cae progresivamente hasta apagarse en 30%,
  // justo cuando arranca el desvanecimiento de la escena.
  const parallaxDamp = useTransform(scrollProgress, [0, 0.1, 0.3], [1, 1, 0], { clamp: true });
  const dampedX = useTransform([smoothX, parallaxDamp], (values) => (values[0] as number) * (values[1] as number));
  const dampedY = useTransform([smoothY, parallaxDamp], (values) => (values[0] as number) * (values[1] as number));

  const backX = useTransform(dampedX, (v) => -v * RANGE_BACK_X);
  const backY = useTransform(dampedY, (v) => -v * RANGE_BACK_Y);
  const sceneX = useTransform(dampedX, (v) => -v * RANGE_SCENE_X);
  const sceneY = useTransform(dampedY, (v) => -v * RANGE_SCENE_Y);
  const contentParallaxX = useTransform(dampedX, (v) => -v * RANGE_UI_X);
  const contentParallaxY = useTransform(dampedY, (v) => -v * RANGE_UI_Y);

  // Escala de la escena "según cursor": crece apenas con la distancia al
  // centro (1.055 en reposo, 1.065 en los extremos), amortiguada igual
  // que el resto del parallax al avanzar el scroll.
  const pointerMagnitude = useTransform([dampedX, dampedY], (values) => {
    const nx = (values[0] as number) / RANGE_SCENE_X;
    const ny = (values[1] as number) / RANGE_SCENE_Y;
    return Math.min(1, Math.sqrt(nx * nx + ny * ny));
  });
  const sceneCursorScale = useTransform(pointerMagnitude, [0, 1], [SCENE_SCALE_MIN, SCENE_SCALE_MAX]);

  // Avance de cámara sutil durante el desvanecimiento (30%–80%): empuja el
  // zoom de la escena hasta ~1.10 y el del fondo en proporción, sin saltos.
  const dissolveZoom = useTransform(scrollProgress, [0.3, 0.8], reduceMotion ? [1, 1] : [1, 1.1 / 1.06], { clamp: true });
  const backScale = useTransform(dissolveZoom, (z) => BACK_BASE_SCALE * z);
  const sceneScale = useTransform([sceneCursorScale, dissolveZoom], (values) => (values[0] as number) * (values[1] as number));

  // La escena pierde contraste y se difumina progresivamente (30%–80%):
  // nunca se apaga de golpe, y con reduced-motion se salta el blur/zoom.
  const sceneOpacity = useTransform(scrollProgress, [0.3, 0.8], [1, 0.25], { clamp: true });
  const sceneBlurPx = useTransform(scrollProgress, [0.3, 0.8], reduceMotion ? [0, 0] : [0, 6], { clamp: true });
  const sceneSaturate = useTransform(scrollProgress, [0.3, 0.8], [1, 0.7], { clamp: true });
  const sceneBrightness = useTransform(scrollProgress, [0.3, 0.8], [1, 0.85], { clamp: true });
  const sceneFilter = useTransform(
    [sceneBlurPx, sceneSaturate, sceneBrightness],
    (values) => `blur(${values[0]}px) saturate(${values[1]}) brightness(${values[2]})`
  );

  // Logo, tagline y buscador suben ligeramente y se desvanecen (10%–30%).
  const contentOpacity = useTransform(scrollProgress, [0.1, 0.3], [1, 0], { clamp: true });
  const contentLiftY = useTransform(scrollProgress, [0.1, 0.3], reduceMotion ? [0, 0] : [0, -30], { clamp: true });
  const contentY = useTransform([contentLiftY, contentParallaxY], (values) => (values[0] as number) + (values[1] as number));

  // El diccionario real asciende como cortina entre 15% y 75%.
  const curtainY = useTransform(scrollProgress, [0.15, 0.75], ["100%", "0%"], { clamp: true });

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

  // El hero solo se oculta (visibility:hidden) una vez que el diccionario
  // ya está totalmente opaco y cubrió el viewport (80%–100%), nunca antes.
  // Histéresis chica para que sea reversible sin parpadeo al retroceder.
  //
  // Al pasar a relative, la posición natural de la cortina en el flujo es
  // "altura del hero" (siempre 100svh, oculto o no) — pero el recorrido
  // visible es más corto, así que en el instante del cambio medimos la
  // diferencia real contra el scroll actual y la aplicamos como "top"
  // negativo constante, cerrando el hueco sin alterar ninguna otra fase.
  useMotionValueEvent(scrollProgress, "change", (latest) => {
    setIsRevealed((prev) => {
      if (!prev && latest >= 0.85) {
        const heroHeight = stickyRef.current?.offsetHeight ?? 0;
        setCurtainTopOffset(heroHeight - window.scrollY);
        return true;
      }
      if (prev && latest < 0.78) return false;
      return prev;
    });
  });

  // El sonido ambiente se apaga junto con la escena (30%–80%), no antes.
  useMotionValueEvent(scrollProgress, "change", (latest) => {
    if (!audioStartedRef.current || mutedRef.current) return;
    const portAudio = portAudioRef.current;
    const crowdAudio = crowdAudioRef.current;
    if (!portAudio || !crowdAudio) return;
    const fade = latest <= 0.3 ? 1 : Math.max(0, 1 - (latest - 0.3) / 0.5);
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
    <section ref={shellRef} className="cinehero-shell" style={{ height: `calc(100svh + ${revealVh}${revealUnit})` }}>
      <div ref={stickyRef} className="cinehero-sticky" style={{ visibility: isRevealed ? "hidden" : "visible" }}>
        <motion.div className="cinehero-layers" aria-hidden="true" style={{ opacity: sceneOpacity, filter: sceneFilter }}>
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
            style={{ x: sceneX, y: sceneY, scale: sceneScale }}
          />
        </motion.div>

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

      <motion.div
        className="cinehero-curtain"
        data-revealed={isRevealed ? "true" : "false"}
        style={{ y: curtainY, top: isRevealed ? -curtainTopOffset : undefined }}
      >
        <div className="cinehero-curtain-fade" aria-hidden="true" />
        <div className="cinehero-curtain-clip">
          <div className="wrap">
            <header className="dictionary-intro">
              <p className="tagline">diccionario navegable del lunfardo porteño — palabras y expresiones, de dónde vienen y cómo se usan hoy</p>
              <AuxNav className="dictionary-intro-nav" />
            </header>
            <Dictionary query={query} onQueryChange={onQueryChange} />
          </div>
        </div>
      </motion.div>
    </section>
  );
}
