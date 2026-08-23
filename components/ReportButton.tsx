"use client";

import { useActionState, useState } from "react";
import { submitReport } from "@/app/palabra/[slug]/community-actions";
import { REPORT_REASONS, REPORT_COMMENT_MAX, initialReportState } from "@/lib/community";

export function ReportButton({ wordSlug }: { wordSlug: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(submitReport, initialReportState);

  if (state.status === "success") {
    return <p className="contribute-hint">gracias, recibimos tu reporte.</p>;
  }

  return (
    <div className="ficha-report">
      <button type="button" className="ficha-action ficha-action-muted" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        reportar error
      </button>
      {open && (
        <form action={formAction} className="contribute-form word-report-form">
          <input type="hidden" name="wordSlug" value={wordSlug} />
          <div className="contribute-honeypot" aria-hidden="true">
            <label htmlFor="report-website">No completar este campo</label>
            <input id="report-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
          </div>
          <div className="contribute-field">
            <label htmlFor="report-reason">Motivo</label>
            <select id="report-reason" name="reason" required defaultValue="">
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
            <label htmlFor="report-comment">Comentario (opcional)</label>
            <textarea id="report-comment" name="comment" maxLength={REPORT_COMMENT_MAX} rows={3} />
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
