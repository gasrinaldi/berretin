import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEntryBySlug, getEntryPosition, isExpression } from "@/lib/dictionary";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { SITE_URL, SITE_NAME, INDEXING_ALLOWED, cleanExcerpt } from "@/lib/site";
import { BackButton } from "@/components/BackButton";
import { AuxNav } from "@/components/AuxNav";
import { ShareButton } from "@/components/ShareButton";
import { ContributeButton } from "@/components/ContributeButton";
import { WordVote } from "@/components/WordVote";
import { ReportButton } from "@/components/ReportButton";
import { WordTabs } from "@/components/gallery/WordTabs";
import { Footer } from "@/components/Footer";

// Nada se prerenderiza en el build: cada palabra se genera la primera vez
// que alguien la visita (ISR "on demand") y queda cacheada como estática,
// evitando compilar ~15.000 páginas en cada deploy.
export function generateStaticParams() {
  return [];
}
export const revalidate = 86400;

function capitalizeFirst(text: string) {
  return text.replace(/\p{L}/u, (ch) => ch.toLocaleUpperCase("es"));
}

function tipoLabel(palabra: string) {
  return isExpression(palabra) ? "Expresión" : "Palabra";
}

// Región asignada a mano desde /admin/regiones, si existe (Etapa 6). Nunca
// se infiere: si Supabase no está disponible o la palabra no tiene región
// cargada, se omite en silencio — la ficha sigue funcionando igual.
async function getWordRegion(wordSlug: string): Promise<string | null> {
  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return null;
  }
  const { data } = await supabase.from("word_regions").select("region").eq("word_slug", wordSlug).maybeSingle();
  return data?.region ?? null;
}

export async function generateMetadata({ params }: PageProps<"/diccionario/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const entry = getEntryBySlug(slug);

  if (!entry) {
    return { title: `Palabra no encontrada | ${SITE_NAME}`, robots: { index: false, follow: true } };
  }

  const title = `${capitalizeFirst(entry.palabra)}: significado en lunfardo argentino | ${SITE_NAME}`;
  const description = cleanExcerpt(entry.definicion);
  const url = `${SITE_URL}/diccionario/${entry.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: INDEXING_ALLOWED ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: "es_AR",
      type: "article",
      // openGraph/twitter no heredan de layout.tsx cuando la página define
      // los suyos propios, así que la imagen hay que repetirla acá.
      images: [{ url: "/brand/berretin-og.png", width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/brand/berretin-og.png"],
    },
  };
}

export default async function DiccionarioEntryPage({ params }: PageProps<"/diccionario/[slug]">) {
  const { slug } = await params;
  const entry = getEntryBySlug(slug);

  if (!entry) notFound();

  const region = await getWordRegion(entry.slug);
  const position = getEntryPosition(entry.slug);
  const registro = position ? String(position).padStart(5, "0") : null;
  const tipo = tipoLabel(entry.palabra);
  const metaParts = [tipo, ...entry.categorias, ...entry.origenes, ...(region ? [region] : [])];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: entry.palabra,
    description: entry.definicion,
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: `${SITE_NAME} — Archivo del habla`,
      url: SITE_URL,
    },
    url: `${SITE_URL}/diccionario/${entry.slug}`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="ficha-detail">
        <nav className="ficha-detail-nav">
          <BackButton hideArrow />
          <AuxNav />
        </nav>

        <div className="ficha-detail-grid">
          <aside className="ficha-detail-sidebar">
            <span className="ficha-detail-sidebar-letter" aria-hidden="true">
              {entry.letra}
            </span>
            {registro && <p className="ficha-detail-registro">N.º {registro}</p>}
          </aside>

          <article className="ficha-detail-main">
            <header className="ficha-detail-header">
              <h1 className="ficha-detail-title">{entry.palabra}</h1>
              {metaParts.length > 0 && <p className="ficha-detail-meta">{metaParts.join(" · ")}</p>}
            </header>

            <WordTabs wordSlug={entry.slug} definicion={entry.definicion} />

            <div className="ficha-detail-bottom">
              <WordVote wordSlug={entry.slug} />
              <div className="ficha-actions">
                <div className="ficha-actions-list">
                  <ShareButton word={entry.palabra} path={`/diccionario/${entry.slug}`} />
                  <ContributeButton wordSlug={entry.slug} wordPalabra={entry.palabra} />
                </div>
                <ReportButton wordSlug={entry.slug} />
              </div>
            </div>
          </article>
        </div>
      </div>
      <Footer />
    </>
  );
}
