"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Dictionary } from "@/components/Dictionary";
import { SearchBar } from "@/components/SearchBar";
import { AuxNav } from "@/components/AuxNav";
import { Footer } from "@/components/Footer";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

type CinematicHeroProps = {
  query: string;
  onQueryChange: (value: string) => void;
};

// Rango de parallax de mouse (px en los extremos), valores aprobados:
// solo el puerto lejano (fondo) y la UI se mueven con el cursor — piso,
// multitud, tanguero y jóvenes quedan siempre a 0px de mouse.
const RANGE_FONDO_X = 9;
const RANGE_FONDO_Y = 5.5;
const RANGE_LOGO_X = 2.5;
const RANGE_LOGO_Y = 1.5;
const RANGE_SEARCH_X = 1.5;
const RANGE_SEARCH_Y = 1;

// El parallax de mouse se desvanece entre 0% y 32% del recorrido de scroll.
const MOUSE_FADE_END = 0.32;

// Profundidad por scroll (wrapper de cámara, nunca toca piso/jóvenes,
// que quedan completamente anclados): fondo y multitud RETROCEDEN
// (dolly-out) hasta ~0.95–0.97, y el tanguero CRECE desde los pies
// hasta ~1.35–1.45 — el efecto contrario es justo el bug que esto
// corrige. Fondo/multitud llevan overscan (.hero-layer, inset:-8%) para
// que retroceder nunca revele un borde.
const FONDO_SCALE_FROM = 1;
const FONDO_SCALE_TO = 0.97;
const MULTITUD_SCALE_FROM = 1;
const MULTITUD_SCALE_TO = 0.95;
const TANGUERO_SCALE_FROM = 1;
const TANGUERO_SCALE_TO = 1.4;

export function CinematicHero({ query, onQueryChange }: CinematicHeroProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const fondoScrollRef = useRef<HTMLDivElement>(null);
  const fondoMouseRef = useRef<HTMLDivElement>(null);
  const multitudScrollRef = useRef<HTMLDivElement>(null);
  const tangueroRef = useRef<HTMLImageElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const logoGroupRef = useRef<HTMLDivElement>(null);
  const logoMouseRef = useRef<HTMLDivElement>(null);
  const searchMouseRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLButtonElement>(null);
  const audioToggleRef = useRef<HTMLButtonElement>(null);
  const smokeMainRef = useRef<HTMLDivElement>(null);
  const smokeSecondaryRef = useRef<HTMLDivElement>(null);
  const smokeGradientRef = useRef<HTMLDivElement>(null);

  const scrollProgressRef = useRef(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  // "Volver al diccionario": solo aparece una vez que el usuario ya
  // empezó a recorrer los resultados (el título/buscador/filtros todavía
  // están a la vista antes de eso). Observa #content, que Dictionary.tsx
  // siempre renderiza — no depende de conocer su estado interno.
  const [showBackBtn, setShowBackBtn] = useState(false);

  // Re-sincroniza breakpoint y reduced-motion si el layout todavía no se
  // había asentado al montar, o si cambian después (rotación, resize, o
  // el usuario cambia la preferencia del sistema en vivo).
  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 640px)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMobile = () => setIsMobileViewport(mobileQuery.matches);
    const syncMotion = () => setReduceMotion(motionQuery.matches);
    syncMobile();
    syncMotion();
    mobileQuery.addEventListener("change", syncMobile);
    motionQuery.addEventListener("change", syncMotion);
    return () => {
      mobileQuery.removeEventListener("change", syncMobile);
      motionQuery.removeEventListener("change", syncMotion);
    };
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    let sentinel: HTMLElement | null = null;
    let observer: IntersectionObserver | null = null;
    let attempts = 0;
    const attach = () => {
      sentinel = document.getElementById("results-sentinel");
      if (!sentinel) {
        attempts += 1;
        if (attempts < 40) requestAnimationFrame(attach);
        return;
      }
      observer = new IntersectionObserver(([entry]) => setShowBackBtn(entry.boundingClientRect.top < 0), { threshold: 0 });
      observer.observe(sentinel);
    };
    attach();
    return () => observer?.disconnect();
  }, []);

  const portAudioRef = useRef<HTMLAudioElement | null>(null);
  const crowdAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioStartedRef = useRef(false);
  const mutedRef = useRef(false);
  const audioFrameRef = useRef<number | null>(null);

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
    document.getElementById("dictionary-top")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  };

  const scrollToDictionaryTop = () => {
    document.getElementById("dictionary-top")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  };

  // isMobileViewport arranca en false en el primer render (server, sin
  // matchMedia) y se corrige apenas monta — el efecto de GSAP de más abajo
  // lo lee de este ref en vez de tenerlo como dependencia: así la
  // corrección post-montaje (o un resize real que cruce el breakpoint)
  // solo dispara un ScrollTrigger.refresh() (recalcula end/parallax) en
  // vez de destruir y recrear el pin mientras React sigue con ese mismo
  // subárbol montado — eso último producía conflictos reales de DOM entre
  // GSAP y React (insertBefore/removeChild sobre nodos que el pin-spacer
  // ya había movido).
  const isMobileRef = useRef(isMobileViewport);
  useEffect(() => {
    isMobileRef.current = isMobileViewport;
    if (typeof window !== "undefined") ScrollTrigger.refresh();
  }, [isMobileViewport]);

  // Motor único: una timeline GSAP con ease:"none" maneja todo lo que
  // depende del scroll (pin, crecimiento, disolución, humo); el mouse vive
  // aparte, en wrappers interiores propios, vía gsap.quickTo. Nada de esto
  // convive con RAF/listeners manuales ni con Framer Motion. Corre una
  // sola vez por montaje (reduceMotion es la única dependencia real: si
  // cambia, React desmonta esta rama entera y monta el fallback estático,
  // así que el cleanup de gsap.context corre en un desmontaje real, nunca
  // mientras el árbol sigue vivo).
  useEffect(() => {
    if (reduceMotion) return;
    const stage = stageRef.current;
    if (!stage) return;

    // gsap.context() no propaga el return de su callback como cleanup —
    // los listeners de mouse (que sí necesitan removerse aparte de las
    // tweens/ScrollTrigger que sí revierte ctx.revert()) se guardan acá.
    let removeMouseListeners: (() => void) | undefined;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: stage,
          start: "top top",
          end: () => `+=${window.innerHeight * ((isMobileRef.current ? 50 : 78) / 100)}`,
          pin: true,
          scrub: 0.68,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            scrollProgressRef.current = self.progress;
            if (!audioStartedRef.current || mutedRef.current) return;
            const portAudio = portAudioRef.current;
            const crowdAudio = crowdAudioRef.current;
            if (!portAudio || !crowdAudio) return;
            const p = self.progress;
            const fade = p <= 0.3 ? 1 : Math.max(0, 1 - (p - 0.3) / 0.5);
            portAudio.volume = 0.7 * fade;
            crowdAudio.volume = 0.45 * fade;
            if (fade === 0 && !portAudio.paused) {
              portAudio.pause();
              crowdAudio.pause();
            } else if (fade > 0 && portAudio.paused) {
              void Promise.all([portAudio.play(), crowdAudio.play()]).catch(() => undefined);
            }
          },
        },
      });

      // Profundidad por scroll: fondo y multitud retroceden (dolly-out),
      // el tanguero crece desde los pies — los tres en el mismo tramo
      // 0→0.85 para que la sensación de cámara sea una sola, continua.
      tl.fromTo(fondoScrollRef.current, { scale: FONDO_SCALE_FROM }, { scale: FONDO_SCALE_TO, duration: 0.85 }, 0);
      tl.fromTo(multitudScrollRef.current, { scale: MULTITUD_SCALE_FROM }, { scale: MULTITUD_SCALE_TO, duration: 0.85 }, 0);
      tl.fromTo(tangueroRef.current, { scale: TANGUERO_SCALE_FROM }, { scale: TANGUERO_SCALE_TO, duration: 0.85 }, 0);

      // Logo/tagline suben y se desvanecen entre 10% y 30% — el buscador
      // del hero NO comparte este fade (ver más abajo: sigue de pie hasta
      // quedar tapado por el humo, para que nunca desaparezca el buscador).
      tl.to(logoGroupRef.current, { opacity: 0, y: -30, duration: 0.2 }, 0.1);
      tl.to(cueRef.current, { opacity: 0, duration: 0.2 }, 0.1);

      // Disolución de toda la escena (nunca transforms individuales:
      // opacity + filter compartidos en el wrapper de cámara) entre 30% y 80%.
      tl.to(
        sceneRef.current,
        { opacity: 0.25, filter: "blur(6px) saturate(0.7) brightness(0.85)", duration: 0.5 },
        0.3
      );

      // Botón de sonido: se apaga cerca del final del fade de audio, no
      // junto con el resto de la UI (el audio sigue sonando hasta 80%).
      tl.to(audioToggleRef.current, { opacity: 0, duration: 0.15 }, 0.65);

      // Humo — textura y degradado sólido por separado, en ese orden de
      // pintado (ver DOM: el degradado va ANTES en el markup para quedar
      // detrás). El humo entra bien antes que el oscurecimiento final
      // (0.15/0.2, mucho antes que el negro sólido) para que se vea de
      // verdad como textura, no tapado por el degradado.
      tl.fromTo(smokeMainRef.current, { opacity: 0, scale: 1 }, { opacity: 0.68, scale: 1.1, duration: 0.7 }, 0.15);
      tl.fromTo(smokeSecondaryRef.current, { opacity: 0, scale: 1.04 }, { opacity: 0.48, scale: 1.14, duration: 0.65 }, 0.2);
      // El negro pleno recién en el último tramo (0.75→1, justo cuando
      // despinea) para no tapar el humo antes de tiempo ni dejar un
      // bloque sólido prematuro — el diccionario comparte el mismo --ink,
      // así que llegar a 1 exactamente al final no deja costura.
      tl.to(smokeGradientRef.current, { opacity: 1, duration: 0.25 }, 0.75);

      // Mouse: quickTo con power3.out, wrappers interiores independientes
      // del de scroll/cámara. mobile/pointer grueso se revisa en cada
      // movimiento (no al armar el efecto), así isMobileViewport puede
      // cambiar sin tener que reconstruir todo el pin.
      const xToFondo = gsap.quickTo(fondoMouseRef.current, "x", { duration: 0.72, ease: "power3.out" });
      const yToFondo = gsap.quickTo(fondoMouseRef.current, "y", { duration: 0.72, ease: "power3.out" });
      const xToLogo = gsap.quickTo(logoMouseRef.current, "x", { duration: 0.62, ease: "power3.out" });
      const yToLogo = gsap.quickTo(logoMouseRef.current, "y", { duration: 0.62, ease: "power3.out" });
      const xToSearch = gsap.quickTo(searchMouseRef.current, "x", { duration: 0.62, ease: "power3.out" });
      const yToSearch = gsap.quickTo(searchMouseRef.current, "y", { duration: 0.62, ease: "power3.out" });

      const handleMove = (event: PointerEvent) => {
        if (isMobileRef.current || !window.matchMedia("(pointer: fine)").matches) return;
        const bounds = stage.getBoundingClientRect();
        const nx = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
        const ny = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
        const fade = Math.max(0, 1 - scrollProgressRef.current / MOUSE_FADE_END);
        xToFondo(-nx * RANGE_FONDO_X * fade);
        yToFondo(-ny * RANGE_FONDO_Y * fade);
        xToLogo(-nx * RANGE_LOGO_X * fade);
        yToLogo(-ny * RANGE_LOGO_Y * fade);
        xToSearch(-nx * RANGE_SEARCH_X * fade);
        yToSearch(-ny * RANGE_SEARCH_Y * fade);
      };
      const handleLeave = () => {
        xToFondo(0);
        yToFondo(0);
        xToLogo(0);
        yToLogo(0);
        xToSearch(0);
        yToSearch(0);
      };
      stage.addEventListener("pointermove", handleMove, { passive: true });
      stage.addEventListener("pointerleave", handleLeave, { passive: true });
      removeMouseListeners = () => {
        stage.removeEventListener("pointermove", handleMove);
        stage.removeEventListener("pointerleave", handleLeave);
      };
    }, stage);

    // El pin se calcula con el layout que exista en ese instante — si
    // alguna placa todavía no terminó de cargar (tamaño real distinto al
    // width/height declarado), el alto pineado queda mal hasta el primer
    // resize. Se espera a que todas carguen (o ya estén completas, cache)
    // y se refresca una vez más para no depender de eso.
    const heroImages = Array.from(stage.querySelectorAll("img"));
    const whenLoaded = Promise.all(
      heroImages.map(
        (img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                img.addEventListener("load", () => resolve(), { once: true });
                img.addEventListener("error", () => resolve(), { once: true });
              })
      )
    );
    whenLoaded.then(() => ScrollTrigger.refresh());

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("resize", refresh);
    return () => {
      window.removeEventListener("resize", refresh);
      removeMouseListeners?.();
      ctx.revert();
    };
  }, [reduceMotion]);

  if (reduceMotion) {
    return (
      <>
        <div className="hero-reduced">
          <img src="/splash/00-maestra-v3.jpg" alt="" width={1672} height={941} />
          <div className="cinehero-content">
            <div className="cinehero-wordmark-wrap">
              <Image
                className="cinehero-logo"
                src="/brand/berretin-wordmark.png"
                alt="Berretín"
                width={2079}
                height={756}
                loading="eager"
                sizes="(max-width: 640px) 88vw, 720px"
                style={{ width: "min(clamp(520px, 45vw, 720px), 88vw)", height: "auto", objectFit: "contain" }}
              />
            </div>
            <p className="cinehero-descriptor">diccionario de la calle argentina</p>
            <p className="cinehero-subline">lunfardo porteño</p>
            <SearchBar id="hero-search" className="cinehero-search" showSubmit value={query} onChange={onQueryChange} onSubmit={enterDictionary} />
          </div>
        </div>
        <div className="wrap dictionary-wrap">
          <header id="dictionary-top" className="dictionary-intro">
            <AuxNav className="dictionary-intro-nav" />
          </header>
          <Dictionary query={query} onQueryChange={onQueryChange} />
        </div>
        <Footer />
        {showBackBtn && (
          <button type="button" className="dictionary-back-btn" onClick={scrollToDictionaryTop}>
            <span className="dictionary-back-mark" aria-hidden="true" />
            Volver al buscador
          </button>
        )}
      </>
    );
  }

  return (
    <>
      <div ref={stageRef} className="hero-stage">
        <div ref={sceneRef} className="hero-scene" aria-hidden="true">
          <div ref={fondoScrollRef} className="hero-layer">
            <div ref={fondoMouseRef} className="hero-mouse-wrap">
              <img className="hero-plate" src="/splash/01-fondo-sin-apoyos.png" alt="" width={1672} height={941} fetchPriority="high" onLoad={() => ScrollTrigger.refresh()} />
            </div>
          </div>
          <img className="hero-plate hero-piso-mask" src="/splash/01-fondo-sin-apoyos.png" alt="" width={1672} height={941} onLoad={() => ScrollTrigger.refresh()} />
          <div ref={multitudScrollRef} className="hero-layer">
            <img className="hero-plate hero-multitud" src="/splash/02-multitud-profunda.png" alt="" width={1672} height={941} onLoad={() => ScrollTrigger.refresh()} />
          </div>
          <img ref={tangueroRef} className="hero-plate hero-tanguero" src="/splash/03-tanguero-anclado.png" alt="" width={1672} height={941} onLoad={() => ScrollTrigger.refresh()} />
          <img className="hero-plate" src="/splash/04-jovenes-apoyos-anclados.png" alt="" width={1672} height={941} onLoad={() => ScrollTrigger.refresh()} />
        </div>

        <div className="hero-vignette" aria-hidden="true" />
        <div className="hero-corner-shadow" aria-hidden="true" />

        {/* El degradado sólido va PRIMERO en el DOM (mismo z-index que las
            texturas de humo) para pintar DETRÁS de ellas — si fuera último
            las tapaba apenas empezaba a ganar opacidad. */}
        <div ref={smokeGradientRef} className="hero-smoke-gradient" />
        <div ref={smokeMainRef} className="hero-smoke hero-smoke-main" />
        <div ref={smokeSecondaryRef} className="hero-smoke hero-smoke-secondary" />

        <div ref={contentRef} className="cinehero-content">
          <div ref={logoGroupRef}>
            <div ref={logoMouseRef} className="hero-ui-mouse-wrap">
              <div className="cinehero-wordmark-wrap">
                <Image
                  className="cinehero-logo"
                  src="/brand/berretin-wordmark.png"
                  alt="Berretín"
                  width={2079}
                  height={756}
                  // El LCP real del hero es la escena de fondo (más grande y
                  // pintada antes) — el wordmark carga eager pero sin
                  // competirle la prioridad "high".
                  loading="eager"
                  sizes="(max-width: 640px) 88vw, 720px"
                  style={{ width: "min(clamp(520px, 45vw, 720px), 88vw)", height: "auto", objectFit: "contain" }}
                />
                <span className="cinehero-wordmark-sheen" aria-hidden="true" />
              </div>
              <p className="cinehero-descriptor">diccionario de la calle argentina</p>
              <p className="cinehero-subline">lunfardo porteño</p>
            </div>
          </div>
          {/* El buscador del hero NO se desvanece con el resto de la UI —
              queda de pie hasta que el humo/degradado lo tapan, así nunca
              hay un momento sin buscador visible (ver timeline GSAP). */}
          <div ref={searchMouseRef} className="hero-ui-mouse-wrap">
            <SearchBar id="hero-search" className="cinehero-search" showSubmit value={query} onChange={onQueryChange} onSubmit={enterDictionary} />
          </div>
        </div>

        <button ref={cueRef} className="cinehero-cue" type="button" onClick={enterDictionary}>
          deslizá para entrar <span aria-hidden="true">↓</span>
        </button>

        <button
          ref={audioToggleRef}
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

        <audio ref={portAudioRef} src="/sounds/puerto-ambiente.mp3" loop preload="auto" aria-hidden="true" />
        <audio ref={crowdAudioRef} src="/sounds/gente-murmullo.mp3" loop preload="auto" aria-hidden="true" />
      </div>

      <div className="wrap dictionary-wrap">
        <header id="dictionary-top" className="dictionary-intro">
          <AuxNav className="dictionary-intro-nav" />
        </header>
        <Dictionary query={query} onQueryChange={onQueryChange} />
      </div>
      <Footer />

      {showBackBtn && (
        <button type="button" className="dictionary-back-btn" onClick={scrollToDictionaryTop}>
          <span className="dictionary-back-mark" aria-hidden="true" />
          Volver al buscador
        </button>
      )}
    </>
  );
}
