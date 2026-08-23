"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { createProfile, updateProfile, signOutUser } from "@/app/cuenta/actions";
import { CONTRIBUTION_TYPES } from "@/lib/contributions";
import { ALIAS_MAX, PROFILE_LOCATION_MAX, type ProfileRecord, type MyContributionRow, type ContributionStatus } from "@/lib/community";

const STATUS_LABEL: Record<ContributionStatus, string> = { pending: "pendiente", approved: "aprobado", rejected: "rechazado" };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

type AccountDashboardProps = {
  email: string;
  profile: ProfileRecord | null;
  contributions: MyContributionRow[];
};

export function AccountDashboard({ email, profile: initialProfile, contributions }: AccountDashboardProps) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [alias, setAlias] = useState("");
  const [location, setLocation] = useState(profile?.location ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await createProfile(alias, location, avatarUrl);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  };

  const handleUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);
    const result = await updateProfile(location, avatarUrl);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setProfile((prev) => (prev ? { ...prev, location: location || null, avatarUrl: avatarUrl || null } : prev));
    setSaved(true);
  };

  const handleSignOut = async () => {
    await signOutUser();
    router.push("/");
    router.refresh();
  };

  if (!profile) {
    return (
      <div className="account-onboarding">
        <p className="contribute-hint">Ingresaste como {email}. Elegí un alias público para terminar de crear tu perfil.</p>
        <form className="contribute-form" onSubmit={handleCreate}>
          <div className="contribute-field">
            <label htmlFor="onboarding-alias">Alias (minúsculas, números o _, 3 a {ALIAS_MAX} caracteres)</label>
            <input id="onboarding-alias" type="text" required value={alias} onChange={(event) => setAlias(event.target.value)} placeholder="boedense23" maxLength={ALIAS_MAX} />
          </div>
          <div className="contribute-field">
            <label htmlFor="onboarding-location">Ciudad, barrio o provincia (opcional)</label>
            <input id="onboarding-location" type="text" value={location} onChange={(event) => setLocation(event.target.value)} maxLength={PROFILE_LOCATION_MAX} />
          </div>
          <div className="contribute-field">
            <label htmlFor="onboarding-avatar">Link a un avatar (opcional, https://)</label>
            <input id="onboarding-avatar" type="url" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="https://..." />
          </div>
          {error && <p className="contribute-error">{error}</p>}
          <button type="submit" className="share-btn" disabled={pending}>
            {pending ? "creando..." : "crear perfil"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="account-dashboard">
      <div className="account-summary">
        {profile.avatarUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatarUrl} alt="" className="profile-avatar" />
        )}
        <div>
          <p className="admin-card-word">@{profile.alias}</p>
          <p className="contribute-hint">
            <Link href={`/perfil/${profile.alias}`}>ver perfil público</Link>
          </p>
        </div>
      </div>

      <dl className="admin-meta-grid">
        <div>
          <dt>Miembro desde</dt>
          <dd>{formatDate(profile.createdAt)}</dd>
        </div>
        <div>
          <dt>Reputación</dt>
          <dd>{profile.reputation}</dd>
        </div>
        <div>
          <dt>Aportes enviados</dt>
          <dd>{contributions.length}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{email}</dd>
        </div>
      </dl>

      <form className="contribute-form" onSubmit={handleUpdate}>
        <div className="contribute-field">
          <label htmlFor="edit-location">Ciudad, barrio o provincia (opcional)</label>
          <input id="edit-location" type="text" value={location} onChange={(event) => setLocation(event.target.value)} maxLength={PROFILE_LOCATION_MAX} />
        </div>
        <div className="contribute-field">
          <label htmlFor="edit-avatar">Link a un avatar (opcional, https://)</label>
          <input id="edit-avatar" type="url" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="https://..." />
        </div>
        {error && <p className="contribute-error">{error}</p>}
        {saved && !error && <p className="contribute-hint">cambios guardados.</p>}
        <button type="submit" className="share-btn" disabled={pending}>
          {pending ? "guardando..." : "guardar cambios"}
        </button>
      </form>

      <section className="account-history">
        <h2 className="admin-title account-history-title">Tus aportes</h2>
        {contributions.length === 0 && <p className="no-results">todavía no enviaste ningún aporte</p>}
        {contributions.length > 0 && (
          <div className="admin-list">
            {contributions.map((c) => (
              <article key={c.id} className="admin-card account-history-card">
                <header className="admin-card-header">
                  <div className="admin-card-heading">
                    <span className={`admin-status admin-status-${c.status}`}>{STATUS_LABEL[c.status]}</span>
                    <span className="ficha-badge">{CONTRIBUTION_TYPES.find((t) => t.value === c.type)?.label ?? c.type}</span>
                    <strong className="admin-card-word">{c.word}</strong>
                  </div>
                  <span className="admin-card-date">{formatDate(c.createdAt)}</span>
                </header>
                <p className="ficha-meaning">{c.content}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <button type="button" className="back-btn" onClick={handleSignOut}>
        cerrar sesión
      </button>
    </div>
  );
}
