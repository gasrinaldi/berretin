import type { MetadataRoute } from "next";
import { getAllSlugs } from "@/lib/dictionary";
import { SITE_URL } from "@/lib/site";

// Sin lastModified inventado: el dataset no trae fechas reales de edición
// por entrada, así que se omite el campo en vez de simularlo. ~15.000 URLs
// entra sin problema en un único sitemap (el límite nativo de Next/los
// motores de búsqueda es 50.000 por archivo).
export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
  ];

  for (const slug of getAllSlugs()) {
    entries.push({
      url: `${SITE_URL}/diccionario/${slug}`,
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  return entries;
}
