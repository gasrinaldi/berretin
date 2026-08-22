"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { Word } from "@/data/words";
import { WordCard } from "@/components/WordCard";

export function LetterBlock({ letter, words }: { letter: string; words: Word[] }) {
  const reduceMotion = useReducedMotion();

  return (
    <section className="letter-block" aria-labelledby={`letter-${letter}`}>
      <motion.div className="letter-portada" initial={reduceMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}>
        <h2 className="letter-big" id={`letter-${letter}`}>{letter}</h2>
        <span className="letter-count">{words.length} {words.length === 1 ? "palabra" : "palabras"}</span>
      </motion.div>
      <div className="fichas">
        {words.map((word, index) => <motion.div key={`${word.word}-${index}`} initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: Math.min(0.015 * index, 0.45), ease: "easeOut" }}><WordCard word={word} /></motion.div>)}
      </div>
    </section>
  );
}
