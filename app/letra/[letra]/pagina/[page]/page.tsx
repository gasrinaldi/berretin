import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLetterCounts, getPageCount, parsePageParam } from "@/lib/dictionary-seo";
import { LetterHub, letterHubMetadata } from "@/components/seo/LetterHub";

// Solo existen las páginas 2..N de cada letra (la 1 vive en /letra/[letra]).
export const dynamicParams = false;

export function generateStaticParams() {
  return getLetterCounts().flatMap((l) =>
    Array.from({ length: Math.max(0, getPageCount(l.count) - 1) }, (_, i) => ({ letra: l.slug, page: String(i + 2) })),
  );
}

export async function generateMetadata({ params }: PageProps<"/letra/[letra]/pagina/[page]">): Promise<Metadata> {
  const { letra, page } = await params;
  const n = parsePageParam(page);
  return letterHubMetadata(letra, n ?? 0);
}

export default async function LetraPaginaPage({ params }: PageProps<"/letra/[letra]/pagina/[page]">) {
  const { letra, page } = await params;
  const n = parsePageParam(page);
  if (n === null) notFound();
  return <LetterHub slug={letra} page={n} />;
}
