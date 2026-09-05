"use client";

// Adaptado de berretinv2/src/components/scrollytelling/pack/PackHeroScrollytelling.tsx
// (la variante "pack" activa por defecto en berretinv2).
//
// Cambios respecto del original:
// - Props: ya no recibe soundEnabled/onToggleSound/onSelectWord/favoriteIds/
//   onToggleFavorite (todo eso era del producto demo de v2 — favoritos,
//   modal de palabra, audio). Recibe exactamente lo mismo que
//   CinematicHero.tsx: { query, onQueryChange }.
// - Ya no renderiza StoryboardDictionaryView (el diccionario demo/ficticio
//   de v2): al terminar el recorrido pineado renderiza el Dictionary REAL
//   de V1, con el mismo wrapper (AuxNav + Footer + botón "volver al
//   buscador") que hoy usa CinematicHero.tsx, sin tocar Dictionary.tsx.
import { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PackScene3D } from "./PackScene3D";
import { HeroOverlayUI } from "./HeroOverlayUI";
import { SCROLLY_CONFIG } from "./scrollyConfig";
import { Dictionary } from "@/components/Dictionary";
import { AuxNav } from "@/components/AuxNav";
import { Footer } from "@/components/Footer";
import styles from "./hero-v2.module.css";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

type BerretinScrollytellingHeroProps = {
  query: string;
  onQueryChange: (value: string) => void;
};

export function BerretinScrollytellingHero({ query, onQueryChange }: BerretinScrollytellingHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  // "Volver al diccionario": mismo mecanismo que CinematicHero.tsx — solo
  // aparece una vez que el usuario ya empezó a recorrer los resultados.
  const [showBackBtn, setShowBackBtn] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < SCROLLY_CONFIG.mobile.breakpoint);
    };
    checkMobile();

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => setPrefersReducedMotion(mediaQuery.matches);
    syncMotion();

    const handleMediaChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handleMediaChange);
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
      mediaQuery.removeEventListener("change", handleMediaChange);
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

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isMobile || prefersReducedMotion) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const rawX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const rawY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      const clampedX = Math.max(-1, Math.min(1, rawX));
      const clampedY = Math.max(-1, Math.min(1, rawY));
      setMousePos({ x: clampedX, y: clampedY });
    },
    [isMobile, prefersReducedMotion]
  );

  useEffect(() => {
    if (!containerRef.current || !stickyRef.current) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: containerRef.current,
        start: "top top",
        end: "bottom bottom",
        pin: stickyRef.current,
        pinSpacing: false,
        scrub: 1.0,
        onUpdate: (self) => setScrollProgress(self.progress),
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // El humo de la variante "pack" no llega a tapar el puerto del todo por
  // sí solo (queda escena visible incluso en progress=1) — esta capa sólida
  // termina de cubrirlo, pero su rampa arranca bastante antes de que la
  // home empiece a entrar y sigue subiendo en paralelo con ella (no debe
  // llegar a opacity 1 antes de que la home ya esté apareciendo).
  const scrimOpacity = scrollProgress < 0.55 ? 0 : Math.min(1, (scrollProgress - 0.55) / 0.37);

  // Reveal de la home real ligado directamente al scroll del pin (no a un
  // IntersectionObserver que se dispara al terminar el hero): arranca
  // mientras el hero todavía es visible arriba y el humo sigue subiendo,
  // para que sea una transición cruzada real y no humo -> negro -> home.
  const revealProgress = Math.max(0, Math.min(1, (scrollProgress - 0.72) / 0.12));
  const revealStyle = {
    opacity: revealProgress,
    transform: `translateY(${(1 - revealProgress) * 32}px)`,
  };

  const scrollToDictionaryTop = () => {
    document.getElementById("dictionary-top")?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
  };

  return (
    <>
      <div className={styles.heroToHome}>
        <div className={styles.heroRoot}>
          <div ref={containerRef} onMouseMove={handleMouseMove} className={styles.pinContainer}>
            <div ref={stickyRef} className={styles.stickyStage}>
              <PackScene3D scrollProgress={scrollProgress} mousePos={mousePos} isMobile={isMobile} prefersReducedMotion={prefersReducedMotion} />
              <div className={styles.scrimFade} style={{ opacity: scrimOpacity }} />

              <HeroOverlayUI scrollProgress={scrollProgress} query={query} onQueryChange={onQueryChange} onSearchSubmit={scrollToDictionaryTop} />
            </div>
          </div>
        </div>

        <div className={styles.dictionaryReveal}>
          <div className="wrap dictionary-wrap">
            <header id="dictionary-top" className="dictionary-intro" style={revealStyle}>
              {/* eslint-disable-next-line @next/next/no-img-element -- wordmark estático, no requiere optimización de next/image */}
              <img src="/brand/berretin-wordmark.png" alt="Berretín" className={styles.wordmark} />
              <AuxNav className="dictionary-intro-nav" />
            </header>
            <Dictionary query={query} onQueryChange={onQueryChange} />
          </div>
        </div>
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
