import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategoryCounts, getPageCount, parsePageParam } from "@/lib/dictionary-seo";
import { CategoryHub, categoryHubMetadata } from "@/components/seo/CategoryHub";

// Solo existen las páginas 2..N de cada categoría (la 1 vive en /categoria/[slug]).
export const dynamicParams = false;

export function generateStaticParams() {
  return getCategoryCounts().flatMap((c) =>
    Array.from({ length: Math.max(0, getPageCount(c.count) - 1) }, (_, i) => ({ slug: c.slug, page: String(i + 2) })),
  );
}

export async function generateMetadata({ params }: PageProps<"/categoria/[slug]/pagina/[page]">): Promise<Metadata> {
  const { slug, page } = await params;
  const n = parsePageParam(page);
  return categoryHubMetadata(slug, n ?? 0);
}

export default async function CategoriaPaginaPage({ params }: PageProps<"/categoria/[slug]/pagina/[page]">) {
  const { slug, page } = await params;
  const n = parsePageParam(page);
  if (n === null) notFound();
  return <CategoryHub slug={slug} page={n} />;
}
