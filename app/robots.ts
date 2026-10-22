import type { MetadataRoute } from "next";
import { SITE_URL, INDEXING_ALLOWED } from "@/lib/site";
import { FILTER_PARAM_KEYS } from "@/lib/dictionary-state";

// La home con filtros (?q=, ?letra=, …) es un estado de búsqueda, no una
// página: se bloquea el rastreo tanto con el parámetro primero (?q=) como
// después de otro (&q=).
const FILTER_DISALLOW = FILTER_PARAM_KEYS.flatMap((key) => [`/*?${key}=`, `/*&${key}=`]);

export default function robots(): MetadataRoute.Robots {
  if (!INDEXING_ALLOWED) {
    // Por defecto (SITE_INDEXING_ENABLED sin activar, o cualquier
    // deployment que no sea producción: previews y URLs *.vercel.app
    // incluidas) bloquea el rastreo completo — sin sitemap, para no
    // invitar a nadie a indexar igual.
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin", "/cuenta", "/auth", "/api", ...FILTER_DISALLOW] },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
