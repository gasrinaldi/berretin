"use client";

import { useEffect, useState } from "react";
import { getWordGallery } from "@/app/diccionario/[slug]/gallery-actions";
import { CONTRIBUTION_TYPES } from "@/lib/contributions";
import type { GalleryContribution } from "@/lib/gallery";
import { GalleryVoteReport } from "@/components/gallery/GalleryVoteReport";
import { AudioPlayer } from "@/components/gallery/AudioPlayer";
import { ContributionMeta } from "@/components/gallery/ContributionMeta";

export function UsoTab({ wordSlug }: { wordSlug: string }) {
  const [rows, setRows] = useState<GalleryContribution[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = async (targetPage: number, append: boolean) => {
    setLoading(true);
    const result = await getWordGallery(wordSlug, "uso", targetPage);
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

  if (loading && rows.length === 0) return <p className="contribute-hint">cargando...</p>;
  if (error) return <p className="contribute-hint">no disponible en este momento</p>;
  if (rows.length === 0) return <p className="no-results">todavía no hay aportes aprobados de este tipo para esta palabra</p>;

  return (
    <div className="gallery-list">
      {rows.map((row) => (
        <article key={row.id} className="gallery-item">
          <div className="gallery-item-header">
            <span className="ficha-badge">{CONTRIBUTION_TYPES.find((t) => t.value === row.type)?.label ?? row.type}</span>
            {(row.authorAlias || row.location || row.decade) && (
              <span className="gallery-item-meta">
                <ContributionMeta row={row} />
              </span>
            )}
          </div>
          <p className="ficha-meaning gallery-item-content">{row.content}</p>
          {row.hasAudio && <AudioPlayer contributionId={row.id} />}
          <GalleryVoteReport contributionId={row.id} wordSlug={wordSlug} voteCount={row.voteCount} myVote={row.myVote} />
        </article>
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
