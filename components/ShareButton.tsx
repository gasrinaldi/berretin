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
    <button type="button" className="ficha-action" onClick={handleShare}>
      <svg className="ficha-action-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 16V4M12 4 7 9M12 4l5 5" />
        <path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
      </svg>
      {copied ? "enlace copiado" : "compartir"}
    </button>
  );
}
