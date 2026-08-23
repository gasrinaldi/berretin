"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { getAnotherRandomWord } from "@/app/descubrir/actions";
import type { DictionaryEntry } from "@/app/api/dictionary/route";

export function RandomWordCard({ initial }: { initial: DictionaryEntry }) {
  const [entry, setEntry] = useState(initial);
  const [pending, startTransition] = useTransition();
  const badges = [...entry.categorias, ...entry.origenes];

  const handleClick = () => {
    startTransition(async () => {
      const next = await getAnotherRandomWord();
      setEntry(next);
    });
  };

  return (
    <div className="discover-card">
      <p className="ficha-word">{entry.palabra}</p>
      <p className="ficha-meaning">{entry.definicion}</p>
      {badges.length > 0 && (
        <span className="ficha-badges">
          {badges.map((badge) => (
            <span key={badge} className="ficha-badge">
              {badge}
            </span>
          ))}
        </span>
      )}
      <div className="discover-card-actions">
        <Link href={`/diccionario/${entry.slug}`} className="back-btn">
          ver ficha completa
        </Link>
        <button type="button" className="share-btn" onClick={handleClick} disabled={pending}>
          {pending ? "buscando..." : "otra expresión"}
        </button>
      </div>
    </div>
  );
}
