import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCategoryBySlug,
  getCategoryCounts,
  getEntriesByCategory,
  paginateEntries,
  categoryPath,
  categoryTitle,
  describePage,
  buildHubMetadata,
  hubPagePath,
  formatCount,
} from "@/lib/dictionary-seo";
import { SeoHubPage } from "@/components/seo/SeoHubPage";

function resolve(slug: string, page: number) {
  const info = getCategoryBySlug(slug);
  if (!info) return null;
  const paged = paginateEntries(getEntriesByCategory(info.name), page);
  if (!paged) return null;
  return { info, paged };
}

export function categoryHubMetadata(slug: string, page: number): Metadata {
  const found = resolve(slug, page);
  if (!found) return { title: "Página no encontrada | Berretín", robots: { index: false, follow: true } };
  const { info, paged } = found;
  return buildHubMetadata({
    title: categoryTitle(info.name, page),
    description: describePage(`de la categoría «${info.name}» del habla argentina`, paged),
    path: hubPagePath(categoryPath(info.slug), page),
  });
}

export function CategoryHub({ slug, page }: { slug: string; page: number }) {
  const found = resolve(slug, page);
  if (!found) notFound();
  const { info, paged } = found;

  return (
    <SeoHubPage
      eyebrow="Berretín · categoría"
      title={info.name}
      intro={`${formatCount(info.count)} ${info.count === 1 ? "palabra o expresión" : "palabras y expresiones"} del habla argentina clasificadas como «${info.name}», con su significado.`}
      basePath={categoryPath(info.slug)}
      paged={paged}
      siblings={
        <nav className="seo-strip" aria-label="Otras categorías">
          {getCategoryCounts().map((c) =>
            c.slug === info.slug ? (
              <span key={c.slug} className="seo-strip-current" aria-current="page">
                {c.name}
              </span>
            ) : (
              <Link key={c.slug} href={categoryPath(c.slug)}>
                {c.name}
              </Link>
            ),
          )}
        </nav>
      }
    />
  );
}
