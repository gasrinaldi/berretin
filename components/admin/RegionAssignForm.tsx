"use client";

import { useState } from "react";
import { assignWordRegion, removeWordRegion, type WordRegionRow } from "@/app/admin/regiones/actions";
import { ARGENTINE_REGIONS } from "@/lib/regions";

export function RegionAssignForm({ initial, initialError }: { initial: WordRegionRow[]; initialError: string | null }) {
  const [rows, setRows] = useState(initial);
  const [slug, setSlug] = useState("");
  const [region, setRegion] = useState<string>(ARGENTINE_REGIONS[0]);
  const [pending, setPending] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(initialError);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await assignWordRegion(slug, region);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSlug("");
    setRows((prev) => [result.row, ...prev.filter((r) => r.wordSlug !== result.row.wordSlug)]);
  };

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    setError(null);
    const result = await removeWordRegion(id);
    setRemovingId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="admin-dashboard">
      <form className="contribute-form" onSubmit={handleSubmit}>
        <div className="contribute-row">
          <div className="contribute-field">
            <label htmlFor="region-word-slug">Slug de la palabra</label>
            <input id="region-word-slug" type="text" required value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="bocha" />
          </div>
          <div className="contribute-field">
            <label htmlFor="region-select">Provincia</label>
            <select id="region-select" value={region} onChange={(event) => setRegion(event.target.value)}>
              {ARGENTINE_REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
        {error && <p className="contribute-error">{error}</p>}
        <button type="submit" className="share-btn contribute-submit" disabled={pending}>
          {pending ? "guardando..." : "asignar región"}
        </button>
      </form>

      <section className="account-history">
        <h2 className="admin-title account-history-title">Palabras con región asignada</h2>
        {rows.length === 0 ? (
          <p className="no-results">todavía no asignaste ninguna región</p>
        ) : (
          <div className="admin-list">
            {rows.map((row) => (
              <article key={row.id} className="admin-card">
                <div className="admin-card-header">
                  <div className="admin-card-heading">
                    <strong className="admin-card-word">{row.word}</strong>
                    <span className="ficha-badge">{row.region}</span>
                  </div>
                  <button type="button" className="back-btn" onClick={() => handleRemove(row.id)} disabled={removingId === row.id}>
                    {removingId === row.id ? "quitando..." : "quitar"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
