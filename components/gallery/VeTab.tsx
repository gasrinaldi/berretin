"use client";

import { useEffect, useState } from "react";
import { getWordGallery, getContributionMediaUrl } from "@/app/palabra/[slug]/gallery-actions";
import type { GalleryContribution } from "@/lib/gallery";
import { GalleryVoteReport } from "@/components/gallery/GalleryVoteReport";
import { ContributionMeta } from "@/components/gallery/ContributionMeta";

export function VeTab({ wordSlug }: { wordSlug: string }) {
  const [rows, setRows] = useState<GalleryContribution[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [lightboxPendingId, setLightboxPendingId] = useState<string | null>(null);

  const fetchPage = async (targetPage: number, append: boolean) => {
    setLoading(true);
    const result = await getWordGallery(wordSlug, "ve", targetPage);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
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

  // La miniatura ya está cargada (lazy) en la grilla; la imagen optimizada
  // completa solo se pide — y solo se firma en el servidor — al abrir el
  // lightbox, nunca antes.
  const openFull = async (row: GalleryContribution) => {
    setLightboxPendingId(row.id);
    const result = await getContributionMediaUrl(row.id, "image");
    setLightboxPendingId(null);
    if (!result.ok) return;
    setLightbox(result.url);
  };

  if (loading && rows.length === 0) return <p className="contribute-hint">cargando...</p>;
  if (error) return <p className="contribute-hint">no disponible en este momento</p>;
  if (rows.length === 0) return <p className="no-results">todavía no hay dibujos ni fotos aprobados para esta palabra</p>;

  return (
    <div>
      <div className="gallery-grid">
        {rows.map((row) => (
          <figure key={row.id} className="gallery-grid-item">
            <button type="button" className="gallery-grid-thumb" onClick={() => openFull(row)} disabled={lightboxPendingId === row.id} aria-label="Ver imagen completa">
              {row.thumbnailSignedUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={row.thumbnailSignedUrl} alt="" loading="lazy" />
              ) : (
                <span className="contribute-hint">{lightboxPendingId === row.id ? "cargando..." : "sin miniatura"}</span>
              )}
            </button>
            {(row.authorAlias || row.location || row.decade) && (
              <figcaption className="gallery-item-meta">
                <ContributionMeta row={row} />
              </figcaption>
            )}
            <GalleryVoteReport contributionId={row.id} wordSlug={wordSlug} voteCount={row.voteCount} myVote={row.myVote} />
          </figure>
        ))}
      </div>

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

      {lightbox && (
        <div className="gallery-lightbox" role="dialog" aria-modal="true" onClick={() => setLightbox(null)}>
          <button type="button" className="contribute-close gallery-lightbox-close" onClick={() => setLightbox(null)} aria-label="Cerrar imagen">
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" className="gallery-lightbox-img" onClick={(event) => event.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
