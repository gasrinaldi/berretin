"use client";

import { useEffect, useState } from "react";
import { getWordGallery } from "@/app/diccionario/[slug]/gallery-actions";
import type { GalleryContribution } from "@/lib/gallery";
import { GalleryVoteReport } from "@/components/gallery/GalleryVoteReport";
import { ContributionMeta } from "@/components/gallery/ContributionMeta";

// Significados alternativos aprobados (aportes type: "alternative_meaning"),
// listados debajo de la definición principal como acepciones numeradas
// (2, 3, ...) con el mismo lenguaje visual del bloque de definición. No
// renderiza nada si no hay ninguno aprobado todavía ni si falla el fetch:
// es contenido complementario, no debe generar ruido en la mayoría de las
// palabras que todavía no tienen ninguno.
export function AlternativeMeaningsSection({ wordSlug }: { wordSlug: string }) {
  const [rows, setRows] = useState<GalleryContribution[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchPage = async (targetPage: number, append: boolean) => {
    setLoading(true);
    const result = await getWordGallery(wordSlug, "significado_alt", targetPage);
    setLoading(false);
    if (!result.ok) return;
    setRows((prev) => (append ? [...prev, ...result.data.rows] : result.data.rows));
    setHasMore(result.data.hasMore);
  };

  useEffect(() => {
    const run = () => {
      fetchPage(0, false);
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordSlug]);

  if (rows.length === 0) return null;

  return (
    <div className="ficha-alt-meanings">
      {rows.map((row, i) => (
        <div key={row.id} className="ficha-definition-block ficha-alt-meaning-block">
          <span className="ficha-definition-label">Acepción {i + 2}</span>
          <p className="ficha-definition-text ficha-alt-meaning-text">{row.content}</p>
          <div className="ficha-alt-meaning-meta">
            {(row.authorAlias || row.location || row.decade) && (
              <span className="gallery-item-meta">
                <ContributionMeta row={row} />
              </span>
            )}
            <GalleryVoteReport contributionId={row.id} wordSlug={wordSlug} voteCount={row.voteCount} myVote={row.myVote} />
          </div>
        </div>
      ))}
      {hasMore && (
        <button
          type="button"
          className="load-more-btn"
          disabled={loading}
          onClick={() => {
            const next = page + 1;
            setPage(next);
            fetchPage(next, true);
          }}
        >
          {loading ? "cargando..." : "cargar más"}
        </button>
      )}
    </div>
  );
}
