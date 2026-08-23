"use client";

import { useActionState, useState } from "react";
import { toggleContributionVote } from "@/app/palabra/[slug]/gallery-actions";
import { submitReport } from "@/app/palabra/[slug]/community-actions";
import { REPORT_REASONS, REPORT_COMMENT_MAX, initialReportState } from "@/lib/community";

type GalleryVoteReportProps = {
  contributionId: string;
  wordSlug: string;
  voteCount: number;
  myVote: boolean;
};

export function GalleryVoteReport({ contributionId, wordSlug, voteCount: initialCount, myVote: initialMyVote }: GalleryVoteReportProps) {
  const [count, setCount] = useState(initialCount);
  const [myVote, setMyVote] = useState(initialMyVote);
  const [votePending, setVotePending] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [state, formAction, pending] = useActionState(submitReport, initialReportState);

  const handleVote = async () => {
    setVotePending(true);
    setVoteError(null);
    const result = await toggleContributionVote(contributionId);
    setVotePending(false);
    if (!result.ok) {
      setVoteError(result.error);
      return;
    }
    setMyVote(result.voted);
    setCount((c) => Math.max(0, c + (result.voted ? 1 : -1)));
  };

  return (
    <div className="gallery-actions">
      <div className="gallery-actions-row">
        <button type="button" className={`filter-chip gallery-vote-btn${myVote ? " active" : ""}`} disabled={votePending} onClick={handleVote}>
          me sirvió{count > 0 && <span className="word-vote-pct">{count}</span>}
        </button>
        {state.status !== "success" && (
          <button type="button" className="back-btn" onClick={() => setReportOpen((v) => !v)}>
            reportar
          </button>
        )}
      </div>
      {voteError && <p className="contribute-error">{voteError}</p>}

      {state.status === "success" && <p className="contribute-hint">gracias, recibimos tu reporte.</p>}

      {reportOpen && state.status !== "success" && (
        <form action={formAction} className="contribute-form word-report-form">
          <input type="hidden" name="wordSlug" value={wordSlug} />
          <input type="hidden" name="contributionId" value={contributionId} />
          <div className="contribute-honeypot" aria-hidden="true">
            <label htmlFor={`gr-website-${contributionId}`}>No completar este campo</label>
            <input id={`gr-website-${contributionId}`} name="website" type="text" tabIndex={-1} autoComplete="off" />
          </div>
          <div className="contribute-field">
            <label htmlFor={`gr-reason-${contributionId}`}>Motivo</label>
            <select id={`gr-reason-${contributionId}`} name="reason" required defaultValue="">
              <option value="" disabled>
                elegí un motivo...
              </option>
              {REPORT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="contribute-field">
            <label htmlFor={`gr-comment-${contributionId}`}>Comentario (opcional)</label>
            <textarea id={`gr-comment-${contributionId}`} name="comment" maxLength={REPORT_COMMENT_MAX} rows={2} />
          </div>
          {state.status === "error" && state.error && <p className="contribute-error">{state.error}</p>}
          <button type="submit" className="share-btn" disabled={pending}>
            {pending ? "enviando..." : "enviar reporte"}
          </button>
        </form>
      )}
    </div>
  );
}
