"use client";

import { useState } from "react";
import { BerretinScrollytellingHero } from "@/components/hero-v2/BerretinScrollytellingHero";

// CinematicHero.tsx (el hero 2D/GSAP anterior) queda sin usar pero sin
// borrar a propósito, para poder volver atrás fácilmente — ver
// components/hero-v2/BerretinScrollytellingHero.tsx para el reemplazo.

export function HomeClient() {
  const [query, setQuery] = useState("");

  // .home-page: contenedor de bloque estable para que el .pin-spacer que
  // GSAP inserta alrededor de .hero-stage sea hijo de un bloque normal,
  // no directo de <body> (flex column) — como flex item, el spacer podía
  // encogerse/no reservar el recorrido completo del pin.
  return (
    <div className="home-page">
      <BerretinScrollytellingHero query={query} onQueryChange={setQuery} />
    </div>
  );
}
