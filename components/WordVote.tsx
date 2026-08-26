"use client";

import { useEffect, useState } from "react";
import { getWordVoteSummary, castVote, removeVote } from "@/app/diccionario/[slug]/community-actions";
import { VOTE_OPTIONS, type VoteValue, type VoteSummary } from "@/lib/community";

// Votar no exige cuenta: identidad anónima vía cookie server-side (ver
// lib/anon-voter.ts). El login queda opcional, para perfil/historial/
// reputación — acá no hace falta chequear sesión para nada.
export function WordVote({ wordSlug }: { wordSlug: string }) {
  const [summary, setSummary] = useState<VoteSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getWordVoteSummary(wordSlug).then((result) => {
      if (result.ok) setSummary(result.data);
      else setLoadError(result.error);
    });
  }, [wordSlug]);

  const handleVote = async (value: VoteValue) => {
    if (pending) return;
    setPending(true);
    setError(null);
    // Tocar la opción ya activa retira el voto en vez de reafirmarlo.
    const isRetract = summary?.myVote === value;
    const result = isRetract ? await removeVote(wordSlug) : await castVote(wordSlug, value);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSummary((prev) => {
      if (!prev) return prev;
      const counts = { ...prev.counts };
      if (prev.myVote) counts[prev.myVote] = Math.max(0, counts[prev.myVote] - 1);
      if (!isRetract) counts[value] += 1;
      const total = isRetract ? Math.max(0, prev.total - 1) : prev.myVote ? prev.total : prev.total + 1;
      return { counts, total, myVote: isRetract ? null : value };
    });
  };

  if (loadError) {
    return (
      <div className="ficha-vote">
        <span className="ficha-vote-label">¿todavía se usa?</span>
        <p className="contribute-hint">no disponible en este momento</p>
      </div>
    );
  }

  if (!summary) return null;

  const siPct = summary.total > 0 ? Math.round((summary.counts.si / summary.total) * 100) : 0;

  return (
    <div className="ficha-vote">
      <span className="ficha-vote-label">¿todavía se usa?</span>
      <div className="ficha-vote-options">
        {VOTE_OPTIONS.map((opt) => {
          const count = summary.counts[opt.value];
          const pct = summary.total > 0 ? Math.round((count / summary.total) * 100) : 0;
          const active = summary.myVote === opt.value;
          return (
            <button key={opt.value} type="button" className={`ficha-vote-option${active ? " active" : ""}`} disabled={pending} onClick={() => handleVote(opt.value)}>
              <span className="ficha-vote-dot" aria-hidden="true" />
              {opt.label} <span className="ficha-vote-pct">{pct}%</span>
            </button>
          );
        })}
      </div>
      <div className="ficha-vote-bar" aria-hidden="true">
        <span className="ficha-vote-bar-fill" style={{ width: `${siPct}%` }} />
      </div>
      <p className="ficha-vote-count">
        {summary.total} {summary.total === 1 ? "voto" : "votos"}
      </p>
      {error && <p className="contribute-error">{error}</p>}
    </div>
  );
}
