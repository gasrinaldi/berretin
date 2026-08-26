"use client";

import { useState } from "react";
import { setReportResolved, type ReportRow, type ReportStatus } from "@/app/admin/reportes/actions";
import { REPORT_REASONS } from "@/lib/community";

const REASON_LABEL = new Map(REPORT_REASONS.map((r) => [r.value, r.label]));

const STATUS_LABEL: Record<ReportStatus, string> = { pending: "pendiente", reviewed: "resuelto", dismissed: "descartado" };
// dismissed no se genera desde esta pantalla (solo pending/reviewed vía el
// toggle), pero se contempla por si ya existiera algún reporte con ese
// estado — se lo muestra igual, con la misma clase que "rechazado" en el
// resto del panel.
const STATUS_CLASS: Record<ReportStatus, string> = { pending: "admin-status-pending", reviewed: "admin-status-approved", dismissed: "admin-status-rejected" };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function ReportCard({ report }: { report: ReportRow }) {
  const [status, setStatus] = useState(report.status);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolved = status === "reviewed";

  const handleToggle = async () => {
    setPending(true);
    setError(null);
    const result = await setReportResolved(report.id, !resolved);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setStatus(resolved ? "pending" : "reviewed");
  };

  return (
    <article className="admin-card">
      <header className="admin-card-header">
        <div className="admin-card-heading">
          <span className={`admin-status ${STATUS_CLASS[status]}`}>{STATUS_LABEL[status]}</span>
          <span className="ficha-badge">{report.targetType === "word" ? "palabra" : "aporte"}</span>
          <strong className="admin-card-word">{report.targetType === "word" ? report.wordSlug : (report.contributionWord ?? report.contributionId)}</strong>
        </div>
        <span className="admin-card-date">{formatDate(report.createdAt)}</span>
      </header>

      <dl className="admin-meta-grid">
        <div>
          <dt>Motivo</dt>
          <dd>{REASON_LABEL.get(report.reason) ?? report.reason}</dd>
        </div>
        {report.targetType === "contribution" && report.contributionContent && (
          <div>
            <dt>Aporte reportado</dt>
            <dd>{report.contributionContent}</dd>
          </div>
        )}
        {report.comment && (
          <div>
            <dt>Comentario</dt>
            <dd>{report.comment}</dd>
          </div>
        )}
      </dl>

      {error && <p className="contribute-error">{error}</p>}

      <div className="admin-card-actions">
        <button type="button" className="share-btn admin-approve" disabled={pending} onClick={handleToggle}>
          {pending ? "guardando..." : resolved ? "reabrir" : "marcar resuelto"}
        </button>
      </div>
    </article>
  );
}

export function ReportsList({ initialRows, initialError }: { initialRows: ReportRow[]; initialError: string | null }) {
  if (initialError) return <p className="contribute-error">{initialError}</p>;
  if (initialRows.length === 0) return <p className="no-results">todavía no hay reportes</p>;

  return (
    <div className="admin-list">
      {initialRows.map((r) => (
        <ReportCard key={r.id} report={r} />
      ))}
    </div>
  );
}
