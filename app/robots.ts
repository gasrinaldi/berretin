import type { MetadataRoute } from "next";
import { SITE_URL, INDEXING_ALLOWED } from "@/lib/site";

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
      { userAgent: "*", allow: "/", disallow: ["/admin", "/cuenta", "/auth", "/api"] },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
