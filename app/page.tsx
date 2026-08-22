"use client";

import { AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Dictionary } from "@/components/Dictionary";
import { Hero } from "@/components/Hero";
import { Splash } from "@/components/Splash";

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      <AnimatePresence>
        {showSplash && <Splash onEnter={() => setShowSplash(false)} />}
      </AnimatePresence>
      <Hero />
      <div className="wrap">
      <header className="dictionary-intro">
        <p className="tagline">diccionario navegable del lunfardo porteño — palabras y expresiones, de dónde vienen y cómo se usan hoy</p>
      </header>
      <Dictionary />
      </div>
    </>
  );
}
