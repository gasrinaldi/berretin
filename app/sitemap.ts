import type { MetadataRoute } from "next";
import { getAllSlugs } from "@/lib/dictionary";
import { getHubPaths } from "@/lib/dictionary-seo";
import { SITE_URL } from "@/lib/site";

// Sin lastModified inventado: el dataset no trae fechas reales de edición
// por entrada, así que se omite el campo en vez de simularlo. ~15.000 URLs
// entra sin problema en un único sitemap (el límite nativo de Next/los
// motores de búsqueda es 50.000 por archivo).
export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
  ];

  // Hubs rastreables: /letras, /categorias, /letra/[letra] (+ /pagina/N) y
  // /categoria/[slug] (+ /pagina/N). getHubPaths solo devuelve páginas que
  // existen realmente (nunca vacías) y sin duplicados.
  for (const path of getHubPaths()) {
    entries.push({
      url: `${SITE_URL}${path}`,
      changeFrequency: "monthly",
      priority: path === "/letras" || path === "/categorias" ? 0.8 : 0.7,
    });
  }

  for (const slug of getAllSlugs()) {
    entries.push({
      url: `${SITE_URL}/diccionario/${slug}`,
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  return entries;
}
