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

// Mayúscula inicial en la primera letra (no en la primera posición: hay
// términos que arrancan con signos, como "¡aijuna!").
export function capitalizeFirst(text: string): string {
  return text.replace(/\p{L}/u, (ch) => ch.toLocaleUpperCase("es"));
}

// Largo a partir del cual el título completo se reemplaza por el corto.
export const ENTRY_TITLE_MAX = 60;

// Título de una ficha: "{Palabra}: qué significa en Argentina | Berretín",
// o "{Palabra} | Berretín" si el completo supera ENTRY_TITLE_MAX. Nunca se
// recorta el término; si ni el corto entra, se deja entero.
export function buildEntryTitle(palabra: string): string {
  const term = capitalizeFirst(palabra);
  const full = `${term}: qué significa en Argentina | ${SITE_NAME}`;
  return full.length <= ENTRY_TITLE_MAX ? full : `${term} | ${SITE_NAME}`;
}

// Meta description de una ficha: la definición sigue siendo el contenido
// principal; solo se antepone el término, que además desambigua las ~970
// fichas con definición idéntica. No es el description del JSON-LD.
export function buildEntryDescription(palabra: string, definicion: string): string {
  return cleanExcerpt(`${capitalizeFirst(palabra)}: ${definicion}`);
}

