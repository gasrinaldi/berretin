"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { submitContribution } from "@/app/diccionario/[slug]/contribute-actions";
import {
  CONTRIBUTION_TYPES,
  TYPES_WITH_IMAGE,
  TYPES_WITH_AUDIO,
  ALLOWED_IMAGE_LABEL,
  ALLOWED_AUDIO_LABEL,
  CONSENT_TERMS_TEXT,
  CONSENT_AUTHORSHIP_TEXT,
  CONSENT_NOTE,
  EMAIL_NOTE,
  CONTENT_MAX,
  ALIAS_MAX,
  LOCATION_MAX,
  DECADE_MAX,
  EMAIL_MAX,
  initialContributeState,
  type ContributionType,
} from "@/lib/contributions";

type ContributeFormProps = {
  wordSlug: string;
  wordPalabra: string;
  onClose: () => void;
};

export function ContributeForm({ wordSlug, wordPalabra, onClose }: ContributeFormProps) {
  const [state, formAction, pending] = useActionState(submitContribution, initialContributeState);
  const [type, setType] = useState<ContributionType>("example");
  const formRef = useRef<HTMLFormElement>(null);
  const dialogTitleId = useId();
  const activeTypeDef = CONTRIBUTION_TYPES.find((t) => t.value === type) ?? CONTRIBUTION_TYPES[0];
  const showImage = TYPES_WITH_IMAGE.includes(type);
  const showAudio = TYPES_WITH_AUDIO.includes(type);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state.status]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="contribute-overlay" role="presentation" onClick={onClose}>
      <div className="contribute-panel" role="dialog" aria-modal="true" aria-labelledby={dialogTitleId} onClick={(event) => event.stopPropagation()}>
        <button type="button" className="contribute-close" onClick={onClose} aria-label="Cerrar formulario">
          ×
        </button>

        {state.status === "success" ? (
          <div className="contribute-success">
            <p className="contribute-success-text">{state.message}</p>
            <button type="button" className="back-btn" onClick={onClose}>
              ← volver a la palabra
            </button>
          </div>
        ) : (
          <form ref={formRef} action={formAction} className="contribute-form" onReset={() => setType("example")}>
            <h2 id={dialogTitleId} className="contribute-title">
              Aportar a «{wordPalabra}»
            </h2>

            <input type="hidden" name="wordSlug" value={wordSlug} />

            <div className="contribute-honeypot" aria-hidden="true">
              <label htmlFor="website">No completar este campo</label>
              <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
            </div>

            <div className="contribute-field">
              <label htmlFor="contribute-type">Tipo de aporte</label>
              <select id="contribute-type" name="type" value={type} onChange={(event) => setType(event.target.value as ContributionType)}>
                {CONTRIBUTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              {state.fieldErrors?.type && <p className="contribute-error">{state.fieldErrors.type}</p>}
            </div>

            <div className="contribute-field">
              <label htmlFor="contribute-content">{activeTypeDef.contentLabel}</label>
              <textarea id="contribute-content" name="content" placeholder={activeTypeDef.placeholder} maxLength={CONTENT_MAX} rows={4} required />
              {state.fieldErrors?.content && <p className="contribute-error">{state.fieldErrors.content}</p>}
            </div>

            {showImage && (
              <div className="contribute-field">
                <label htmlFor="contribute-image">Imagen ({ALLOWED_IMAGE_LABEL}, hasta 8&nbsp;MB)</label>
                <input id="contribute-image" name="image" type="file" accept="image/jpeg,image/png,image/webp" required />
                {state.fieldErrors?.image && <p className="contribute-error">{state.fieldErrors.image}</p>}
              </div>
            )}

            {showAudio && (
              <div className="contribute-field">
                <label htmlFor="contribute-audio">Audio ({ALLOWED_AUDIO_LABEL}, hasta 5&nbsp;MB)</label>
                <input id="contribute-audio" name="audio" type="file" accept="audio/mpeg,audio/wav,audio/ogg,audio/webm" required />
                {state.fieldErrors?.audio && <p className="contribute-error">{state.fieldErrors.audio}</p>}
              </div>
            )}

            <div className="contribute-row">
              <div className="contribute-field">
                <label htmlFor="contribute-alias">Alias o nombre público (opcional)</label>
                <input id="contribute-alias" name="authorAlias" type="text" maxLength={ALIAS_MAX} />
                {state.fieldErrors?.authorAlias && <p className="contribute-error">{state.fieldErrors.authorAlias}</p>}
              </div>
              <div className="contribute-field">
                <label htmlFor="contribute-email">Email (opcional)</label>
                <input id="contribute-email" name="email" type="email" maxLength={EMAIL_MAX} />
                <p className="contribute-hint">{EMAIL_NOTE}</p>
                {state.fieldErrors?.email && <p className="contribute-error">{state.fieldErrors.email}</p>}
              </div>
            </div>

            <div className="contribute-row">
              <div className="contribute-field">
                <label htmlFor="contribute-location">Ciudad, barrio o provincia (opcional)</label>
                <input id="contribute-location" name="location" type="text" maxLength={LOCATION_MAX} />
                {state.fieldErrors?.location && <p className="contribute-error">{state.fieldErrors.location}</p>}
              </div>
              <div className="contribute-field">
                <label htmlFor="contribute-decade">Década o generación (opcional)</label>
                <input id="contribute-decade" name="decade" type="text" maxLength={DECADE_MAX} placeholder="ej. años 80, generación X..." />
                {state.fieldErrors?.decade && <p className="contribute-error">{state.fieldErrors.decade}</p>}
              </div>
            </div>

            <label className="contribute-consent">
              <input type="checkbox" name="consentTerms" required />
              <span>{CONSENT_TERMS_TEXT}</span>
            </label>
            {state.fieldErrors?.consentTerms && <p className="contribute-error">{state.fieldErrors.consentTerms}</p>}

            <label className="contribute-consent">
              <input type="checkbox" name="consentAuthorship" required />
              <span>{CONSENT_AUTHORSHIP_TEXT}</span>
            </label>
            <p className="contribute-hint">{CONSENT_NOTE}</p>
            {state.fieldErrors?.consentAuthorship && <p className="contribute-error">{state.fieldErrors.consentAuthorship}</p>}

            {state.status === "error" && state.message && (
              <p className="contribute-error contribute-error-general" role="alert">
                {state.message}
              </p>
            )}

            <button type="submit" className="share-btn contribute-submit" disabled={pending}>
              {pending && <span className="contribute-spinner" aria-hidden="true" />}
              {pending ? "enviando..." : "enviar aporte"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
