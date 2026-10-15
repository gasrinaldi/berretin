"use client";

import { useState } from "react";
import { BerretinScrollytellingHero } from "@/components/hero-v2/BerretinScrollytellingHero";
import type { InitialDictionaryState } from "@/lib/dictionary-state";

// CinematicHero.tsx (el hero 2D/GSAP anterior) queda sin usar pero sin
// borrar a propósito, para poder volver atrás fácilmente — ver
// components/hero-v2/BerretinScrollytellingHero.tsx para el reemplazo.

// initialDictionary: primera página del diccionario ya resuelta en el
// servidor (app/page.tsx) para la URL actual — se pasa tal cual hasta
// <Dictionary>, que hidrata sobre ese mismo contenido.
export function HomeClient({ initialDictionary }: { initialDictionary: InitialDictionaryState }) {
  const [query, setQuery] = useState(initialDictionary.query);

  // .home-page: contenedor de bloque estable para que el .pin-spacer que
  // GSAP inserta alrededor de .hero-stage sea hijo de un bloque normal,
  // no directo de <body> (flex column) — como flex item, el spacer podía
  // encogerse/no reservar el recorrido completo del pin.
  return (
    <div className="home-page">
      <BerretinScrollytellingHero query={query} onQueryChange={setQuery} initialDictionary={initialDictionary} />
    </div>
  );
}
