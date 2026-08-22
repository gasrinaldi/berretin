"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { DictionaryEntry } from "@/app/api/dictionary/route";
import { WordCard } from "@/components/WordCard";

type LetterBlockProps = {
  letter: string;
  entries: DictionaryEntry[];
  total: number;
};

export function LetterBlock({ letter, entries, total }: LetterBlockProps) {
  const reduceMotion = useReducedMotion();

  return (
    <section className="letter-block" aria-labelledby={`letter-${letter}`}>
      <motion.div className="letter-portada" initial={reduceMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}>
        <h2 className="letter-big" id={`letter-${letter}`}>{letter}</h2>
        <span className="letter-count">{total} {total === 1 ? "palabra" : "palabras"}</span>
      </motion.div>
      <div className="fichas">
        {entries.map((entry, index) => (
          <motion.div key={entry.id} initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: Math.min(0.015 * index, 0.45), ease: "easeOut" }}>
            <WordCard entry={entry} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
