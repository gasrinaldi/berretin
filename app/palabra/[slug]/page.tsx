import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEntryBySlug } from "@/lib/dictionary";
import { BackButton } from "@/components/BackButton";
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

export async function generateMetadata({ params }: PageProps<"/palabra/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const entry = getEntryBySlug(slug);

  if (!entry) {
    return { title: "Palabra no encontrada | Berretín" };
  }

  const title = `${capitalizeFirst(entry.palabra)} — significado | Berretín`;
  const description = `Conocé el significado de "${entry.palabra}" en el diccionario argentino Berretín.`;
  const url = `/palabra/${entry.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Berretín",
      locale: "es_AR",
      type: "article",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function PalabraPage({ params }: PageProps<"/palabra/[slug]">) {
  const { slug } = await params;
  const entry = getEntryBySlug(slug);

  if (!entry) notFound();

  return (
    <>
      <div className="wrap word-wrap">
        <nav className="word-nav">
          <BackButton />
        </nav>
        <article className="word-article">
          <span className="word-letter">{entry.letra}</span>
          <h1 className="word-title">{entry.palabra}</h1>
          <WordTabs wordSlug={entry.slug} definicion={entry.definicion} categorias={entry.categorias} origenes={entry.origenes} />
          <div className="word-actions">
            <ShareButton word={entry.palabra} path={`/palabra/${entry.slug}`} />
            <ContributeButton wordSlug={entry.slug} wordPalabra={entry.palabra} />
          </div>
          <div className="word-community">
            <WordVote wordSlug={entry.slug} />
            <ReportButton wordSlug={entry.slug} />
          </div>
        </article>
      </div>
      <Footer />
    </>
  );
}
