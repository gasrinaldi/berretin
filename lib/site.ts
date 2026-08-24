// Fuente única del dominio público — todo el resto del código (metadata,
// sitemap, robots, canonical, JSON-LD) importa SITE_URL de acá en vez de
// repetir el dominio a mano.
const DEFAULT_SITE_URL = "https://www.xn--berretn-dza.com.ar";

export const SITE_URL = (process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, "");

// URL temporal solo para Open Graph/Twitter (og:url, og:image,
// twitter:image) mientras berretin.com.ar no esté conectado: esos
// previews (WhatsApp, redes) necesitan una URL que resuelva de verdad,
// a diferencia de canonical/sitemap/robots/JSON-LD, que ya apuntan al
// dominio definitivo vía SITE_URL. Centralizada acá para volver a
// SITE_URL en un solo lugar cuando el dominio esté listo.
const DEFAULT_OG_URL = "https://berretin-steel.vercel.app";

export const OG_URL = (process.env.OG_URL || DEFAULT_OG_URL).replace(/\/+$/, "");

export const SITE_NAME = "Berretín";

// Apagada por defecto: se activa recién cuando el dominio esté conectado
// y verificado, seteando SITE_INDEXING_ENABLED=true en Vercel.
export const SITE_INDEXING_ENABLED = process.env.SITE_INDEXING_ENABLED === "true";

// VERCEL_ENV distingue "production" de "preview"/"development" en runtime.
// Sin esto, activar la variable de indexación en todos los entornos
// dejaría indexables también los deployments de preview y las URLs
// temporales *.vercel.app.
const isProductionDeployment = process.env.VERCEL_ENV ? process.env.VERCEL_ENV === "production" : process.env.NODE_ENV === "production";

export const INDEXING_ALLOWED = SITE_INDEXING_ENABLED && isProductionDeployment;

// Meta robots a aplicar en páginas que nunca deben indexarse por sí
// mismas (búsquedas, combinaciones de filtros) — independiente del
// estado global de indexación.
export const NOINDEX_FOLLOW_ROBOTS = { index: false, follow: true } as const;

// Recorta una definición a un largo prolijo para meta description: sin
// cortar palabras a la mitad ni arrastrar espacios/saltos de línea, y sin
// asumir que el texto trae markup (las definiciones del dataset son texto
// plano, así que no hace falta un sanitizador de HTML).
export function cleanExcerpt(text: string, maxLength = 155): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  const truncated = clean.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  const safe = lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated;
  return `${safe.trim()}…`;
}
