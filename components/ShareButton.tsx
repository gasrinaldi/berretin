"use client";

import { useState } from "react";

type ShareButtonProps = {
  word: string;
  path: string;
};

export function ShareButton({ word, path }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = `${window.location.origin}${path}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${word} — Berretín`, text: `Mirá el significado de "${word}" en Berretín.`, url });
      } catch {
        // el usuario canceló el diálogo nativo: no hay nada que hacer
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // portapapeles no disponible: sin confirmación, sin romper la página
    }
  };

  return (
    <button type="button" className="share-btn" onClick={handleShare}>
      {copied ? "enlace copiado" : "compartir palabra"}
    </button>
  );
}
