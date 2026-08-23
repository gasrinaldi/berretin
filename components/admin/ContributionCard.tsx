"use client";

import { useState } from "react";
import { updateAndApprove, rejectContribution, saveModerationNote, blockSender, getOriginalImageUrl, getContributionAudioUrl, getSenderHistory, type SenderHistoryRow } from "@/app/admin/aportes/actions";
import { CONTRIBUTION_TYPES } from "@/lib/contributions";
import { MODERATION_NOTE_MAX, BLOCK_REASON_MAX, type ContributionRow } from "@/lib/admin-contributions";

type ContributionCardProps = {
  row: ContributionRow;
  onChanged: (id: string, newStatus: ContributionRow["status"]) => void;
  onUpdated: (id: string, patch: Partial<ContributionRow>) => void;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const STATUS_LABEL: Record<ContributionRow["status"], string> = { pending: "pendiente", approved: "aprobado", rejected: "rechazado" };

export function ContributionCard({ row, onChanged, onUpdated }: ContributionCardProps) {
  const [content, setContent] = useState(row.content);
  const [note, setNote] = useState(row.moderationNote ?? "");
  const [pending, setPending] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [history, setHistory] = useState<SenderHistoryRow[] | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const typeDef = CONTRIBUTION_TYPES.find((t) => t.value === row.type);
  const isPending = row.status === "pending";

  const handleApprove = async () => {
    setPending(true);
    setLocalError(null);
    const result = await updateAndApprove(row.id, content, note);
    setPending(false);
    if (!result.ok) {
      setLocalError(result.error);
      return;
    }
    onUpdated(row.id, { content, moderationNote: note || null });
    onChanged(row.id, "approved");
  };

  const handleReject = async () => {
    setPending(true);
    setLocalError(null);
    const result = await rejectContribution(row.id, note);
    setPending(false);
    if (!result.ok) {
      setLocalError(result.error);
      return;
    }
    onUpdated(row.id, { moderationNote: note || null, imagePath: null, thumbnailPath: null, thumbnailSignedUrl: null, audioPath: null });
    setAudioUrl(null);
    onChanged(row.id, "rejected");
  };

  const handleSaveNote = async () => {
    setPending(true);
    setLocalError(null);
    const result = await saveModerationNote(row.id, note);
    setPending(false);
    if (!result.ok) {
      setLocalError(result.error);
      return;
    }
    onUpdated(row.id, { moderationNote: note || null });
  };

  const handleBlock = async () => {
    if (!blockReason.trim()) {
      setLocalError("Contá brevemente el motivo del bloqueo.");
      return;
    }
    setPending(true);
    setLocalError(null);
    const result = await blockSender(row.id, blockReason);
    setPending(false);
    if (!result.ok) {
      setLocalError(result.error);
      return;
    }
    setBlockOpen(false);
    onUpdated(row.id, { imagePath: null, thumbnailPath: null, thumbnailSignedUrl: null, audioPath: null });
    setAudioUrl(null);
    onChanged(row.id, "rejected");
  };

  const handleViewOriginal = async () => {
    setPending(true);
    setLocalError(null);
    const result = await getOriginalImageUrl(row.id);
    setPending(false);
    if (!result.ok) {
      setLocalError(result.error);
      return;
    }
    window.open(result.url, "_blank", "noopener,noreferrer");
  };

  const handleLoadAudio = async () => {
    setPending(true);
    setLocalError(null);
    const result = await getContributionAudioUrl(row.id);
    setPending(false);
    if (!result.ok) {
      setLocalError(result.error);
      return;
    }
    setAudioUrl(result.url);
  };

  const handleToggleHistory = async () => {
    if (historyOpen) {
      setHistoryOpen(false);
      return;
    }
    setHistoryOpen(true);
    if (history === null) {
      const result = await getSenderHistory(row.id);
      if (result.ok) setHistory(result.rows);
      else setHistory([]);
    }
  };

  return (
    <article className="admin-card">
      <header className="admin-card-header">
        <div className="admin-card-heading">
          <span className={`admin-status admin-status-${row.status}`}>{STATUS_LABEL[row.status]}</span>
          <span className="ficha-badge">{typeDef?.label ?? row.type}</span>
          <strong className="admin-card-word">{row.word}</strong>
        </div>
        <span className="admin-card-date">{formatDate(row.createdAt)}</span>
      </header>

      <div className="admin-card-body">
        <div className="admin-card-main">
          {row.currentDefinition && (
            <div className="admin-current-definition">
              <span className="filters-group-label">definición actual</span>
              <p>{row.currentDefinition}</p>
            </div>
          )}

          <div className="contribute-field">
            <label htmlFor={`content-${row.id}`}>Contenido {isPending ? "(editable antes de aprobar)" : ""}</label>
            <textarea id={`content-${row.id}`} value={content} onChange={(event) => setContent(event.target.value)} rows={4} disabled={!isPending} />
          </div>

          <dl className="admin-meta-grid">
            <div>
              <dt>Alias</dt>
              <dd>{row.authorAlias || "—"}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{row.email || "—"}</dd>
            </div>
            <div>
              <dt>Ubicación</dt>
              <dd>{row.location || "—"}</dd>
            </div>
            <div>
              <dt>Década</dt>
              <dd>{row.decade || "—"}</dd>
            </div>
          </dl>

          <div className="contribute-field">
            <label htmlFor={`note-${row.id}`}>Nota interna ({note.length}/{MODERATION_NOTE_MAX})</label>
            <textarea id={`note-${row.id}`} value={note} onChange={(event) => setNote(event.target.value.slice(0, MODERATION_NOTE_MAX))} rows={2} placeholder="visible solo para moderación..." />
          </div>

          {localError && <p className="contribute-error">{localError}</p>}

          <div className="admin-card-actions">
            {isPending && (
              <>
                <button type="button" className="share-btn admin-approve" disabled={pending} onClick={handleApprove}>
                  aprobar
                </button>
                <button type="button" className="share-btn" disabled={pending} onClick={handleReject}>
                  rechazar
                </button>
              </>
            )}
            {!isPending && (
              <button type="button" className="share-btn" disabled={pending} onClick={handleSaveNote}>
                guardar nota
              </button>
            )}
            <button type="button" className="back-btn" disabled={pending} onClick={() => setBlockOpen((v) => !v)}>
              bloquear remitente
            </button>
            {row.thumbnailPath && (
              <button type="button" className="back-btn" disabled={pending} onClick={handleViewOriginal}>
                ver original
              </button>
            )}
            {row.audioPath && !audioUrl && (
              <button type="button" className="back-btn" disabled={pending} onClick={handleLoadAudio}>
                cargar audio
              </button>
            )}
            <button type="button" className="back-btn" onClick={handleToggleHistory}>
              historial del remitente
            </button>
          </div>

          {audioUrl && (
            <audio controls src={audioUrl} className="admin-audio-player">
              Tu navegador no puede reproducir audio.
            </audio>
          )}

          {blockOpen && (
            <div className="admin-block-panel">
              <div className="contribute-field">
                <label htmlFor={`block-${row.id}`}>Motivo del bloqueo ({blockReason.length}/{BLOCK_REASON_MAX})</label>
                <input id={`block-${row.id}`} type="text" value={blockReason} onChange={(event) => setBlockReason(event.target.value.slice(0, BLOCK_REASON_MAX))} placeholder="contenido ofensivo, spam..." />
              </div>
              <button type="button" className="share-btn" disabled={pending} onClick={handleBlock}>
                confirmar bloqueo y rechazar
              </button>
            </div>
          )}

          {historyOpen && (
            <div className="admin-history-panel">
              <span className="filters-group-label">otros aportes de este remitente</span>
              {history === null && <p className="contribute-hint">cargando...</p>}
              {history && history.length === 0 && <p className="contribute-hint">sin otros aportes registrados</p>}
              {history && history.length > 0 && (
                <ul>
                  {history.map((h) => (
                    <li key={h.id}>
                      <span>{h.word}</span> · <span>{h.type}</span> · <span>{STATUS_LABEL[h.status as ContributionRow["status"]] ?? h.status}</span> · <span>{formatDate(h.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {row.thumbnailSignedUrl && (
          <div className="admin-card-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={row.thumbnailSignedUrl} alt={`Miniatura del aporte para "${row.word}"`} loading="lazy" />
          </div>
        )}
      </div>
    </article>
  );
}
