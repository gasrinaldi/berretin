"use client";

import { useEffect, useState } from "react";
import { getWordGallery } from "@/app/diccionario/[slug]/gallery-actions";
import type { GalleryContribution } from "@/lib/gallery";
import { GalleryVoteReport } from "@/components/gallery/GalleryVoteReport";
import { ContributionMeta } from "@/components/gallery/ContributionMeta";

function InfoItem({ row, wordSlug }: { row: GalleryContribution; wordSlug: string }) {
  return (
    <article className="gallery-item">
      {(row.authorAlias || row.location || row.decade) && (
        <div className="gallery-item-header">
          <span className="gallery-item-meta">
            <ContributionMeta row={row} />
          </span>
        </div>
      )}
      <p className="ficha-meaning gallery-item-content">{row.content}</p>
      <GalleryVoteReport contributionId={row.id} wordSlug={wordSlug} voteCount={row.voteCount} myVote={row.myVote} />
    </article>
  );
}

// Información regional y generacional aprobada (aportes type: "regional" /
// "generational"), agrupada en subsecciones diferenciadas dentro de
// "Significado", claramente separadas del bloque de definición y de las
// acepciones alternativas. Una sola query/paginación combinada (mismo
// patrón que el resto de las pestañas); la separación en dos subsecciones
// es solo de presentación. No renderiza nada si no hay ninguna aprobada.
export function RegionalGenerationalSection({ wordSlug }: { wordSlug: string }) {
  const [rows, setRows] = useState<GalleryContribution[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchPage = async (targetPage: number, append: boolean) => {
    setLoading(true);
    const result = await getWordGallery(wordSlug, "significado_regional", targetPage);
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

  const regional = rows.filter((r) => r.type === "regional");
  const generational = rows.filter((r) => r.type === "generational");

  return (
    <div className="ficha-regional-generational">
      {regional.length > 0 && (
        <section className="ficha-info-subsection">
          <span className="ficha-definition-label">Información regional</span>
          <div className="gallery-list">
            {regional.map((row) => (
              <InfoItem key={row.id} row={row} wordSlug={wordSlug} />
            ))}
          </div>
        </section>
      )}
      {generational.length > 0 && (
        <section className="ficha-info-subsection">
          <span className="ficha-definition-label">Información generacional</span>
          <div className="gallery-list">
            {generational.map((row) => (
              <InfoItem key={row.id} row={row} wordSlug={wordSlug} />
            ))}
          </div>
        </section>
      )}
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
