"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { Word } from "@/data/words";
import { WordCard } from "@/components/WordCard";

export function LetterBlock({ letter, words }: { letter: string; words: Word[] }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section className="letter-block" aria-labelledby={`letter-${letter}`} initial={reduceMotion ? false : "hidden"} whileInView="visible" viewport={{ once: true, amount: 0.15 }}>
      <motion.div className="letter-portada" variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }} transition={{ duration: 0.5, ease: "easeOut" }}>
        <h2 className="letter-big" id={`letter-${letter}`}>{letter}</h2>
        <span className="letter-count">{words.length} {words.length === 1 ? "palabra" : "palabras"}</span>
      </motion.div>
      <motion.div className="fichas" variants={{ hidden: {}, visible: {} }}>
        {words.map((word, index) => <motion.div key={`${word.word}-${index}`} variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }} transition={{ duration: 0.4, delay: 0.08 * index, ease: "easeOut" }}><WordCard word={word} /></motion.div>)}
      </motion.div>
    </motion.section>
  );
}
