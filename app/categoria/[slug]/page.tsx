import type { Metadata } from "next";
import { getCategoryCounts } from "@/lib/dictionary-seo";
import { CategoryHub, categoryHubMetadata } from "@/components/seo/CategoryHub";

// Solo las categorías reales del dataset: cualquier otro slug es 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return getCategoryCounts().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/categoria/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return categoryHubMetadata(slug, 1);
}

export default async function CategoriaPage({ params }: PageProps<"/categoria/[slug]">) {
  const { slug } = await params;
  return <CategoryHub slug={slug} page={1} />;
}
