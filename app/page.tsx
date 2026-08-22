"use client";

import { useState } from "react";
import { CinematicHero } from "@/components/CinematicHero";
import { Dictionary } from "@/components/Dictionary";

export default function Home() {
  const [query, setQuery] = useState("");

  return (
    <>
      <CinematicHero query={query} onQueryChange={setQuery} />
      <div className="wrap">
      <header className="dictionary-intro">
        <p className="tagline">diccionario navegable del lunfardo porteño — palabras y expresiones, de dónde vienen y cómo se usan hoy</p>
      </header>
      <Dictionary query={query} onQueryChange={setQuery} />
      </div>
    </>
  );
}
