import type { Metadata } from "next";
import { getLetterCounts } from "@/lib/dictionary-seo";
import { LetterHub, letterHubMetadata } from "@/components/seo/LetterHub";

// Solo las letras que existen en el dataset: cualquier otra URL es 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return getLetterCounts().map((l) => ({ letra: l.slug }));
}

export async function generateMetadata({ params }: PageProps<"/letra/[letra]">): Promise<Metadata> {
  const { letra } = await params;
  return letterHubMetadata(letra, 1);
}

export default async function LetraPage({ params }: PageProps<"/letra/[letra]">) {
  const { letra } = await params;
  return <LetterHub slug={letra} page={1} />;
}
