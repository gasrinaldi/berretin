"use client";

// Adaptado de berretinv2/src/components/scrollytelling/StoryboardOverlayUI.tsx.
// Cambios respecto del original:
// - Se quita por completo el bloque "Cuadro 04" (wordmark propio, tira de
//   alfabeto y card falsa "Berretín · s.m. · Alboroto, bullicio...") — era
//   el preview demo del diccionario ficticio de v2, que no se porta.
// - El buscador ya no es StoryboardSearchBox: es el SearchBar real de V1,
//   conectado a query/onQueryChange (misma lógica de búsqueda existente,
//   sin duplicarla).
import { SearchBar } from "@/components/SearchBar";
import styles from "./hero-v2.module.css";

type HeroOverlayUIProps = {
  scrollProgress: number;
  query: string;
  onQueryChange: (value: string) => void;
  onSearchSubmit: () => void;
};

export function HeroOverlayUI({ scrollProgress, query, onQueryChange, onSearchSubmit }: HeroOverlayUIProps) {
  // El buscador tiene que desaparecer bastante antes de que el humo cubra
  // la escena (no puede seguir flotando sobre un puerto ya casi oscuro):
  // visible hasta ~0.68, se apaga entre 0.72 y 0.81, como si el humo se lo
  // tragara — por eso además de opacity baja un poco (translateY) al irse.
  const searchBoxOpacity = scrollProgress < 0.72 ? 1.0 : Math.max(0, 1 - (scrollProgress - 0.72) / 0.09);
  const sceneUiOpacity = scrollProgress < 0.68 ? 1.0 : Math.max(0, 1 - (scrollProgress - 0.68) / 0.14);
  const searchBoxTranslateY = (1 - searchBoxOpacity) * 14;

  return (
    <div className={styles.overlayRoot}>
      <div style={{ opacity: sceneUiOpacity }} className={styles.overlayFade}>
        <div className={styles.subtitleWrap} style={{ display: searchBoxOpacity <= 0.01 ? "none" : "block" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- asset estático, no requiere optimización de next/image */}
          <img
            src="/hero-v2/diccionario-vivo-subtitle.png"
            alt="Diccionario vivo del habla porteña"
            className={styles.subtitleImg}
            style={{ opacity: searchBoxOpacity, transform: `translateY(${searchBoxTranslateY}px)` }}
          />
        </div>
        <div className={styles.searchWrap} style={{ display: searchBoxOpacity <= 0.01 ? "none" : "block" }}>
          <div
            className={styles.searchFade}
            style={{ opacity: searchBoxOpacity, transform: `translateY(${searchBoxTranslateY}px)` }}
          >
            <div className={styles.ticketFrame}>
              {/* eslint-disable-next-line @next/next/no-img-element -- solo marco decorativo, sin texto ni ícono embebido */}
              <img src="/hero-v2/searchbar-ticket.png" alt="" aria-hidden="true" className={styles.ticketImg} />
              <SearchBar
                id="hero-v2-search"
                showSubmit
                className={styles.ticketSearchRow}
                value={query}
                onChange={onQueryChange}
                onSubmit={onSearchSubmit}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
