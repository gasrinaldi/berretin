"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { words, type Word } from "@/data/words";

const enterVariants = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: { opacity: 1, scale: 1 },
};

export function Hero() {
  const [wordOfTheDay, setWordOfTheDay] = useState<Word | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setWordOfTheDay(words[Math.floor(Math.random() * words.length)]);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const scrollToDictionary = () => {
    document.getElementById("content")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  };

  return (
    <section className="hero" aria-labelledby="hero-title">
      <motion.div
        className="hero-inner"
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        variants={enterVariants}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <p className="hero-kicker">lunfardo porteño</p>
        <h1 id="hero-title" className="hero-title">Berret<span>í</span>n</h1>
        <div className="hero-word" aria-live="polite">
          <span className="hero-word-label">palabra del día</span>
          {wordOfTheDay && <p><strong>{wordOfTheDay.word}</strong> <em>— {wordOfTheDay.meaning}</em></p>}
        </div>
        <button className="discover-button" type="button" onClick={scrollToDictionary}>
          descubrir <span aria-hidden="true">↓</span>
        </button>
      </motion.div>
    </section>
  );
}
