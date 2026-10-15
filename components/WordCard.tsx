"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import type { DictionaryEntry } from "@/app/api/dictionary/route";

const MotionLink = motion.create(Link);

const noopSubscribe = () => () => {};

export function WordCard({ entry }: { entry: DictionaryEntry }) {
  const prefersReducedMotion = useReducedMotion();
  // Las fichas ahora llegan renderizadas por el servidor, donde
  // useReducedMotion() es null — pero en el primer render del cliente ya
  // devuelve la preferencia real, y el markup (style/tabindex) difería entre
  // ambos (mismatch de hidratación solo con reduced-motion). Con
  // useSyncExternalStore el servidor y la hidratación usan siempre `false`
  // y recién después React pasa al valor real: el primer render es idéntico
  // y, ya hidratado, quien prefiere menos movimiento sigue sin animaciones.
  const reduceMotion = useSyncExternalStore(
    noopSubscribe,
    () => prefersReducedMotion === true,
    () => false
  );
  const rotateX = useSpring(useMotionValue(0), { stiffness: 260, damping: 25 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 260, damping: 25 });

  const handlePointerMove = (event: React.PointerEvent<HTMLAnchorElement>) => {
    if (reduceMotion || event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    rotateX.set(-((event.clientY - bounds.top) / bounds.height - 0.5) * 3);
    rotateY.set(((event.clientX - bounds.left) / bounds.width - 0.5) * 3);
  };

  const resetTilt = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  const badges = [...entry.categorias, ...entry.origenes];

  return (
    <MotionLink
      id={`word-${entry.slug}`}
      href={`/diccionario/${entry.slug}`}
      className="ficha"
      style={reduceMotion ? undefined : { rotateX, rotateY }}
      whileHover={reduceMotion ? undefined : { y: -3 }}
      whileTap={reduceMotion ? undefined : { y: -2 }}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
    >
      <span className="ficha-word">{entry.palabra}</span>
      <span className="ficha-content">
        <span className="ficha-meaning">{entry.definicion}</span>
        {badges.length > 0 && (
          <span className="ficha-badges">
            {badges.map((badge) => (
              <span key={badge} className="ficha-badge">
                {badge}
              </span>
            ))}
          </span>
        )}
      </span>
    </MotionLink>
  );
}
