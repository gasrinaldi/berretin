"use client";

import { useState } from "react";
import { createChallenge, deactivateChallenge } from "@/app/admin/desafio/actions";
import { CHALLENGE_TITLE_MAX, CHALLENGE_DESCRIPTION_MAX, CHALLENGE_PERIOD_MAX, type ChallengeRecord } from "@/lib/challenges";

export function ChallengeForm({ initialChallenges }: { initialChallenges: ChallengeRecord[] }) {
  const [challenges, setChallenges] = useState(initialChallenges);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [wordSlug, setWordSlug] = useState("");
  const [periodLabel, setPeriodLabel] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await createChallenge(title, description, wordSlug, periodLabel);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setChallenges((prev) =>
      prev
        .map((c) => ({ ...c, isActive: false }))
        .concat([{ id: `temp-${Date.now()}`, title, description, wordSlug: wordSlug || null, periodLabel, isActive: true, createdAt: new Date().toISOString() }])
    );
    setTitle("");
    setDescription("");
    setWordSlug("");
    setPeriodLabel("");
  };

  const handleDeactivate = async (id: string) => {
    setPending(true);
    const result = await deactivateChallenge(id);
    setPending(false);
    if (result.ok) setChallenges((prev) => prev.map((c) => (c.id === id ? { ...c, isActive: false } : c)));
  };

  return (
    <div className="account-dashboard">
      <form className="contribute-form" onSubmit={handleCreate}>
        <div className="contribute-field">
          <label htmlFor="challenge-title">Título</label>
          <input id="challenge-title" type="text" required value={title} onChange={(event) => setTitle(event.target.value)} maxLength={CHALLENGE_TITLE_MAX} />
        </div>
        <div className="contribute-field">
          <label htmlFor="challenge-description">Descripción</label>
          <textarea id="challenge-description" required value={description} onChange={(event) => setDescription(event.target.value)} maxLength={CHALLENGE_DESCRIPTION_MAX} rows={4} />
        </div>
        <div className="contribute-row">
          <div className="contribute-field">
            <label htmlFor="challenge-word">Palabra relacionada (opcional, slug exacto)</label>
            <input id="challenge-word" type="text" value={wordSlug} onChange={(event) => setWordSlug(event.target.value)} placeholder="ej. morfar" />
          </div>
          <div className="contribute-field">
            <label htmlFor="challenge-period">Período</label>
            <input id="challenge-period" type="text" required value={periodLabel} onChange={(event) => setPeriodLabel(event.target.value)} maxLength={CHALLENGE_PERIOD_MAX} placeholder="Septiembre 2026" />
          </div>
        </div>
        {error && <p className="contribute-error">{error}</p>}
        <button type="submit" className="share-btn admin-approve" disabled={pending}>
          {pending ? "creando..." : "crear y activar desafío"}
        </button>
      </form>

      <section className="account-history">
        <h2 className="admin-title account-history-title">Desafíos anteriores</h2>
        {challenges.length === 0 && <p className="no-results">todavía no creaste ningún desafío</p>}
        <div className="admin-list">
          {challenges.map((c) => (
            <article key={c.id} className="admin-card">
              <header className="admin-card-header">
                <div className="admin-card-heading">
                  <span className={`admin-status ${c.isActive ? "admin-status-approved" : "admin-status-rejected"}`}>{c.isActive ? "activo" : "inactivo"}</span>
                  <strong className="admin-card-word">{c.title}</strong>
                </div>
                <span className="admin-card-date">{c.periodLabel}</span>
              </header>
              <p className="ficha-meaning">{c.description}</p>
              {c.wordSlug && <p className="contribute-hint">palabra: {c.wordSlug}</p>}
              {c.isActive && (
                <div className="admin-card-actions">
                  <button type="button" className="back-btn" disabled={pending} onClick={() => handleDeactivate(c.id)}>
                    desactivar
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
