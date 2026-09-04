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
  // Misma curva que el original: el buscador se mantiene visible durante
  // casi todo el recorrido y se desvanece recién sobre el final, cuando
  // el humo ya está cubriendo la escena.
  const searchBoxOpacity = scrollProgress < 0.78 ? 1.0 : Math.max(0, 1 - (scrollProgress - 0.78) / 0.12);
  const sceneUiOpacity = Math.max(0, 1 - (scrollProgress - 0.84) / 0.08);

  return (
    <div className={styles.overlayRoot}>
      <div style={{ opacity: sceneUiOpacity }} className={styles.overlayFade}>
        <div
          style={{ opacity: searchBoxOpacity, display: searchBoxOpacity <= 0.01 ? "none" : "block" }}
          className={styles.searchWrap}
        >
          <SearchBar id="hero-v2-search" showSubmit value={query} onChange={onQueryChange} onSubmit={onSearchSubmit} />
        </div>
      </div>
    </div>
  );
}
