import type { Metadata } from "next";
import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { mapChallengeRow } from "@/lib/challenges";
import { BackButton } from "@/components/BackButton";
import { Footer } from "@/components/Footer";

// No depende de quién lo visita: mismo contenido para todos, puede
// quedar cacheado como el resto de las páginas públicas.
export const revalidate = 300;

export const metadata: Metadata = { title: "Desafío del mes — Berretín", description: "El desafío cultural mensual de Berretín." };

async function getActiveChallenge() {
  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return null;
  }
  const { data } = await supabase.from("monthly_challenges").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data ? mapChallengeRow(data) : null;
}

export default async function DesafioPage() {
  const challenge = await getActiveChallenge();

  return (
    <>
      <div className="wrap word-wrap">
        <nav className="word-nav">
          <BackButton />
        </nav>
        <article className="word-article">
          <span className="word-letter">Desafío</span>
          {challenge ? (
            <>
              <h1 className="word-title">{challenge.title}</h1>
              <p className="contribute-hint">{challenge.periodLabel}</p>
              <p className="word-definition">{challenge.description}</p>
              {challenge.wordSlug && (
                <p className="contribute-hint">
                  Palabra del desafío: <Link href={`/palabra/${challenge.wordSlug}`}>{challenge.wordSlug}</Link>
                </p>
              )}
            </>
          ) : (
            <>
              <h1 className="word-title">Sin desafío activo</h1>
              <p className="word-definition">Todavía no hay un desafío del mes publicado. Volvé pronto.</p>
            </>
          )}
        </article>
      </div>
      <Footer />
    </>
  );
}
