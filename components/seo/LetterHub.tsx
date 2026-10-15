import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getLetterBySlug,
  getLetterCounts,
  getEntriesByLetter,
  paginateEntries,
  letterPath,
  letterTitle,
  describePage,
  buildHubMetadata,
  hubPagePath,
  formatCount,
} from "@/lib/dictionary-seo";
import { SeoHubPage } from "@/components/seo/SeoHubPage";

// Lógica compartida entre /letra/[letra] (página 1) y
// /letra/[letra]/pagina/[page] (página 2+): una sola implementación.
function resolve(slug: string, page: number) {
  const info = getLetterBySlug(slug);
  if (!info) return null;
  const paged = paginateEntries(getEntriesByLetter(info.letter), page);
  if (!paged) return null;
  return { info, paged };
}

export function letterHubMetadata(slug: string, page: number): Metadata {
  const found = resolve(slug, page);
  if (!found) return { title: "Página no encontrada | Berretín", robots: { index: false, follow: true } };
  const { info, paged } = found;
  return buildHubMetadata({
    title: letterTitle(info.letter, page),
    description: describePage(`del habla argentina que empiezan con ${info.letter}`, paged),
    path: hubPagePath(letterPath(info.slug), page),
  });
}

export function LetterHub({ slug, page }: { slug: string; page: number }) {
  const found = resolve(slug, page);
  if (!found) notFound();
  const { info, paged } = found;

  return (
    <SeoHubPage
      eyebrow="Berretín · índice por letra"
      title={`Palabras con ${info.letter}`}
      intro={`${formatCount(info.count)} ${info.count === 1 ? "palabra o expresión" : "palabras y expresiones"} del habla argentina que empiezan con ${info.letter}, ordenadas alfabéticamente.`}
      basePath={letterPath(info.slug)}
      paged={paged}
      siblings={
        <nav className="seo-strip" aria-label="Otras letras">
          {getLetterCounts().map((l) =>
            l.slug === info.slug ? (
              <span key={l.slug} className="seo-strip-current" aria-current="page">
                {l.letter}
              </span>
            ) : (
              <Link key={l.slug} href={letterPath(l.slug)}>
                {l.letter}
              </Link>
            ),
          )}
        </nav>
      }
    />
  );
}
