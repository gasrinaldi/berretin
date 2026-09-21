"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getWordVoteSummary, castVote } from "@/app/diccionario/[slug]/community-actions";
import { getRoundTerms, type RoundTerm } from "@/app/desafio/round-actions";
import { VOTE_OPTIONS, type VoteValue, type VoteSummary } from "@/lib/community";

type Phase = "loading" | "voting" | "result";

// Reutiliza el sistema de votos existente ("¿todavía se usa?" en la
// ficha, ver components/WordVote.tsx y community-actions.ts) tal cual:
// mismas server actions, misma tabla word_votes, mismos VOTE_OPTIONS,
// mismo identity/anon-cookie/rate-limit. Acá solo cambia la presentación
// (palabra grande, una por vez, con progreso de ronda) y se agrega el
// tally de ronda, que es puramente client-side — no existe en DB.
export function DesafioGame({ initialTerms }: { initialTerms: RoundTerm[] }) {
  const [terms, setTerms] = useState(initialTerms);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("loading");
  const [summary, setSummary] = useState<VoteSummary | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roundVotes, setRoundVotes] = useState<Record<string, VoteValue>>({});
  const [roundOver, setRoundOver] = useState(false);
  const [restarting, setRestarting] = useState(false);

  const current = terms[index];

  useEffect(() => {
    let cancelled = false;
    const resetForNewTerm = () => {
      setPhase("loading");
      setError(null);
    };
    resetForNewTerm();
    getWordVoteSummary(current.slug).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error);
        setSummary(null);
        setPhase("voting");
        return;
      }
      setSummary(result.data);
      // Ya votó este término antes (ficha o desafío anterior): mostrar su
      // voto y los resultados en vez de la elección, sin duplicar nada.
      if (result.data.myVote) {
        setRoundVotes((prev) => (prev[current.slug] ? prev : { ...prev, [current.slug]: result.data.myVote as VoteValue }));
        setPhase("result");
      } else {
        setPhase("voting");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [current.slug]);

  const handleVote = async (value: VoteValue) => {
    if (pending) return;
    setPending(true);
    setError(null);
    const result = await castVote(current.slug, value);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setRoundVotes((prev) => ({ ...prev, [current.slug]: value }));
    setSummary((prev) => {
      const base = prev ?? { counts: { si: 0, poco: 0, no: 0 }, total: 0, myVote: null };
      const counts = { ...base.counts };
      if (base.myVote) counts[base.myVote] = Math.max(0, counts[base.myVote] - 1);
      counts[value] += 1;
      const total = base.myVote ? base.total : base.total + 1;
      return { counts, total, myVote: value };
    });
    setPhase("result");
  };

  const handleNext = () => {
    if (index + 1 >= terms.length) setRoundOver(true);
    else setIndex((i) => i + 1);
  };

  const handleRestart = async () => {
    setRestarting(true);
    const usedSlugs = terms.map((t) => t.slug);
    const fresh = await getRoundTerms(usedSlugs);
    setTerms(fresh);
    setIndex(0);
    setRoundVotes({});
    setRoundOver(false);
    setRestarting(false);
  };

  if (roundOver) {
    const tally: Record<VoteValue, number> = { si: 0, poco: 0, no: 0 };
    for (const value of Object.values(roundVotes)) tally[value]++;
    return (
      <div className="desafio-end">
        <p className="word-letter">Desafío</p>
        <h1 className="desafio-end-title">Terminaste la ronda</h1>
        <p className="desafio-end-text">Le diste tu mirada a {terms.length} palabras del habla argentina.</p>
        <div className="desafio-end-summary">
          {VOTE_OPTIONS.map((opt) => (
            <div key={opt.value} className="desafio-end-stat">
              <span className="desafio-end-stat-value">{tally[opt.value]}</span>
              <span className="desafio-end-stat-label">{opt.label}</span>
            </div>
          ))}
        </div>
        <div className="desafio-end-actions">
          <button type="button" className="desafio-btn-primary" onClick={handleRestart} disabled={restarting}>
            {restarting ? "cargando…" : "Jugar otra vez"}
          </button>
          <Link href="/#dictionary-top" className="desafio-btn-secondary">
            Volver al diccionario
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="desafio-game">
      <p className="desafio-progress">
        {String(index + 1).padStart(2, "0")} / {terms.length}
      </p>
      <h1 className="desafio-word">{current.palabra}</h1>
      <p className="desafio-question">¿Todavía se usa?</p>

      {phase === "loading" && <p className="desafio-loading">cargando…</p>}

      {phase === "voting" && (
        <div className="desafio-vote-buttons">
          {VOTE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className="desafio-vote-btn"
              disabled={pending}
              onClick={() => handleVote(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {phase === "result" && summary && (
        <div className="desafio-result">
          <p className="desafio-result-label">La comunidad dice</p>
          <div className="desafio-result-bars">
            {VOTE_OPTIONS.map((opt) => {
              const count = summary.counts[opt.value];
              const pct = summary.total > 0 ? Math.round((count / summary.total) * 100) : 0;
              return (
                <div key={opt.value} className="desafio-result-row">
                  <span className="desafio-result-row-label">{opt.label}</span>
                  <span className="desafio-result-row-bar">
                    <span className="desafio-result-row-fill" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="desafio-result-row-pct">{pct}%</span>
                </div>
              );
            })}
          </div>
          {summary.myVote && (
            <p className="desafio-my-vote">
              Tu voto: <strong>{VOTE_OPTIONS.find((o) => o.value === summary.myVote)?.label}</strong>
            </p>
          )}
          <Link href={`/diccionario/${current.slug}`} className="desafio-see-meaning">
            Ver significado →
          </Link>
          <div>
            <button type="button" className="desafio-btn-primary desafio-next-btn" onClick={handleNext}>
              Siguiente
            </button>
          </div>
        </div>
      )}

      {error && <p className="contribute-error">{error}</p>}
    </div>
  );
}
