import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { BackButton } from "@/components/BackButton";
import { Footer } from "@/components/Footer";

// No depende de quién lo visita (contenido público igual para todos):
// puede quedar cacheado como el resto de las páginas de contenido.
export function generateStaticParams() {
  return [];
}
export const revalidate = 300;

async function getPublicProfile(alias: string) {
  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return null;
  }

  const { data: profile } = await supabase.from("profiles").select("id, alias, avatar_url, location, reputation, created_at").eq("alias", alias.toLowerCase()).maybeSingle();
  if (!profile) return null;

  const { count: approvedCount } = await supabase
    .from("word_contributions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .eq("status", "approved");

  return { profile, approvedCount: approvedCount ?? 0 };
}

export async function generateMetadata({ params }: PageProps<"/perfil/[alias]">): Promise<Metadata> {
  const { alias } = await params;
  return { title: `@${alias} — perfil | Berretín`, robots: { index: false, follow: false } };
}

export default async function PerfilPage({ params }: PageProps<"/perfil/[alias]">) {
  const { alias } = await params;
  const result = await getPublicProfile(alias);
  if (!result) notFound();

  const { profile, approvedCount } = result;

  return (
    <>
      <div className="wrap word-wrap profile-wrap">
        <nav className="word-nav">
          <BackButton />
        </nav>
        <article className="word-article">
          {profile.avatar_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="profile-avatar" />
          )}
          <h1 className="word-title">@{profile.alias}</h1>
          {profile.location && <p className="ficha-meaning">{profile.location}</p>}
          <dl className="admin-meta-grid profile-meta">
            <div>
              <dt>Miembro desde</dt>
              <dd>{new Date(profile.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}</dd>
            </div>
            <div>
              <dt>Aportes aprobados</dt>
              <dd>{approvedCount}</dd>
            </div>
            <div>
              <dt>Reputación</dt>
              <dd>{profile.reputation}</dd>
            </div>
          </dl>
          {approvedCount === 0 && <p className="no-results profile-empty">todavía no tiene aportes públicos</p>}
        </article>
      </div>
      <Footer />
    </>
  );
}
