"use client";

import { useState } from "react";
import { CinematicHero } from "@/components/CinematicHero";

export function HomeClient() {
  const [query, setQuery] = useState("");

  // .home-page: contenedor de bloque estable para que el .pin-spacer que
  // GSAP inserta alrededor de .hero-stage sea hijo de un bloque normal,
  // no directo de <body> (flex column) — como flex item, el spacer podía
  // encogerse/no reservar el recorrido completo del pin.
  return (
    <div className="home-page">
      <CinematicHero query={query} onQueryChange={setQuery} />
    </div>
  );
}
