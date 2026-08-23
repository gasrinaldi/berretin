"use client";

import { useState } from "react";
import { getContributionMediaUrl } from "@/app/palabra/[slug]/gallery-actions";

// Nunca precarga el audio: el <audio> con src solo existe después de que
// el usuario pide reproducirlo, y ese pedido genera una URL firmada de
// corta duración recién en ese momento.
export function AudioPlayer({ contributionId }: { contributionId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLoad = async () => {
    setPending(true);
    setError(null);
    const result = await getContributionMediaUrl(contributionId, "audio");
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setUrl(result.url);
  };

  if (url) {
    return (
      <audio controls autoPlay src={url} className="gallery-audio-player">
        Tu navegador no puede reproducir audio.
      </audio>
    );
  }

  return (
    <div className="gallery-audio-trigger">
      <button type="button" className="back-btn" disabled={pending} onClick={handleLoad}>
        {pending ? "cargando..." : "▶ reproducir audio"}
      </button>
      {error && <p className="contribute-error">{error}</p>}
    </div>
  );
}
