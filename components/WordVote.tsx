"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getWordVoteSummary, castVote } from "@/app/palabra/[slug]/community-actions";
import { VOTE_OPTIONS, type VoteValue, type VoteSummary } from "@/lib/community";

// Chequea la sesión en el cliente a propósito: la página de palabra es
// estática/ISR (se sirve igual a todo el mundo), así que el estado de
// login nunca puede depender de lo que se calculó en el servidor al
// generar esa página — se resuelve acá, después de montar.
export function WordVote({ wordSlug }: { wordSlug: string }) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [summary, setSummary] = useState<VoteSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (supabase) {
      supabase.auth.getUser().then(({ data }) => setLoggedIn(Boolean(data.user)));
    }
    getWordVoteSummary(wordSlug).then((result) => {
      if (result.ok) setSummary(result.data);
      else setLoadError(result.error);
    });
  }, [wordSlug]);

  const handleVote = async (value: VoteValue) => {
    if (!loggedIn || pending) return;
    setPending(true);
    setError(null);
    const result = await castVote(wordSlug, value);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSummary((prev) => {
      if (!prev) return prev;
      const counts = { ...prev.counts };
      if (prev.myVote) counts[prev.myVote] = Math.max(0, counts[prev.myVote] - 1);
      counts[value] += 1;
      return { counts, total: prev.myVote ? prev.total : prev.total + 1, myVote: value };
    });
  };

  if (loadError) {
    return (
      <div className="word-vote">
        <span className="filters-group-label">¿todavía se usa?</span>
        <p className="contribute-hint">no disponible en este momento</p>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="word-vote">
      <span className="filters-group-label">¿todavía se usa?</span>
      <div className="word-vote-options">
        {VOTE_OPTIONS.map((opt) => {
          const count = summary.counts[opt.value];
          const pct = summary.total > 0 ? Math.round((count / summary.total) * 100) : 0;
          const active = summary.myVote === opt.value;
          return (
            <button key={opt.value} type="button" className={`filter-chip word-vote-btn${active ? " active" : ""}`} disabled={!loggedIn || pending} onClick={() => handleVote(opt.value)}>
              {opt.label} <span className="word-vote-pct">{pct}%</span>
            </button>
          );
        })}
      </div>
      <p className="contribute-hint">
        {summary.total} {summary.total === 1 ? "voto" : "votos"}
        {!loggedIn && (
          <>
            {" · "}
            <Link href="/cuenta">iniciá sesión</Link> para votar
          </>
        )}
      </p>
      {error && <p className="contribute-error">{error}</p>}
    </div>
  );
}
