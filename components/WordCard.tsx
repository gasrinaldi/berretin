"use client";

import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { useState } from "react";
import { categories, type Word } from "@/data/words";

export function WordCard({ word }: { word: Word }) {
  const [isOpen, setIsOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const rotateX = useSpring(useMotionValue(0), { stiffness: 260, damping: 25 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 260, damping: 25 });
  const category = categories[word.category];

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (reduceMotion || event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    rotateX.set(-((event.clientY - bounds.top) / bounds.height - 0.5) * 3);
    rotateY.set(((event.clientX - bounds.left) / bounds.width - 0.5) * 3);
  };

  const resetTilt = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <motion.article className={`ficha ${isOpen ? "open" : ""}`} style={reduceMotion ? undefined : { rotateX, rotateY }} whileHover={reduceMotion ? undefined : { y: -3 }} whileTap={reduceMotion ? undefined : { y: -2 }} onPointerMove={handlePointerMove} onPointerLeave={resetTilt}>
      <button className="ficha-toggle" type="button" onClick={() => setIsOpen((open) => !open)} aria-expanded={isOpen}>
        <span className="ficha-meta">
          <span className="ficha-word">{word.word}</span>
          <span className="ficha-meaning">{word.meaning}</span>
        </span>
        <span className="ficha-tag" style={{ backgroundColor: `${category.color}22`, color: category.color }}>{category.name}</span>
      </button>
      <div className="ficha-body">
        <p className="ficha-origin">{word.origin}</p>
        <p className="ficha-example">{word.example}</p>
      </div>
    </motion.article>
  );
}
