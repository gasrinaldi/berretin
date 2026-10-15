// Helpers de las páginas hub SEO (/letras, /letra/[letra], /categorias,
// /categoria/[slug] y sus versiones paginadas). Todo se deriva del dataset
// local vía lib/dictionary.ts — ninguna cantidad, categoría ni letra se
// inventa, y no se consulta Supabase.
import type { Metadata } from "next";
import { getAllEntries, type DictionaryEntry } from "@/lib/dictionary";
import { SITE_URL, OG_URL, SITE_NAME, INDEXING_ALLOWED } from "@/lib/site";

// Una sola constante para letras y categorías (100 fichas por página).
export const SEO_PAGE_SIZE = 100;

// getAllEntries() ya viene en el mismo orden alfabético y con los mismos
// slugs que el resto de la app; se calcula una vez por instancia.
const ENTRIES: DictionaryEntry[] = getAllEntries();

function stripAccents(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Mapping determinístico nombre <-> slug (solo existe para categorías que
// aparecen realmente en el dataset: nunca se acepta un slug arbitrario).
export function slugifyCategory(name: string) {
  return stripAccents(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type LetterInfo = { letter: string; slug: string; count: number };
export type CategoryInfo = { name: string; slug: string; count: number };

let LETTERS_CACHE: { list: LetterInfo[]; bySlug: Map<string, LetterInfo>; entries: Map<string, DictionaryEntry[]> } | null = null;
let CATEGORIES_CACHE: { list: CategoryInfo[]; bySlug: Map<string, CategoryInfo>; entries: Map<string, DictionaryEntry[]> } | null = null;

function letters() {
  if (LETTERS_CACHE) return LETTERS_CACHE;
  const entries = new Map<string, DictionaryEntry[]>();
  for (const e of ENTRIES) {
    const bucket = entries.get(e.letra);
    if (bucket) bucket.push(e);
    else entries.set(e.letra, [e]);
  }
  const list = [...entries.keys()].sort((a, b) => a.localeCompare(b, "es")).map((letter) => ({ letter, slug: letter.toLowerCase(), count: entries.get(letter)!.length }));
  LETTERS_CACHE = { list, bySlug: new Map(list.map((l) => [l.slug, l])), entries };
  return LETTERS_CACHE;
}

function categories() {
  if (CATEGORIES_CACHE) return CATEGORIES_CACHE;
  const entries = new Map<string, DictionaryEntry[]>();
  for (const e of ENTRIES) {
    for (const cat of e.categorias) {
      const bucket = entries.get(cat);
      if (bucket) bucket.push(e);
      else entries.set(cat, [e]);
    }
  }
  // Más fichas primero; empate por nombre, para un orden estable.
  const list = [...entries.keys()]
    .map((name) => ({ name, slug: slugifyCategory(name), count: entries.get(name)!.length }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "es"));
  CATEGORIES_CACHE = { list, bySlug: new Map(list.map((c) => [c.slug, c])), entries };
  return CATEGORIES_CACHE;
}

export function getLetterCounts(): LetterInfo[] {
  return letters().list;
}

export function getLetterBySlug(slug: string): LetterInfo | undefined {
  return letters().bySlug.get(slug);
}

export function getEntriesByLetter(letter: string): DictionaryEntry[] {
  return letters().entries.get(letter) ?? [];
}

export function getCategoryCounts(): CategoryInfo[] {
  return categories().list;
}

export function getCategoryBySlug(slug: string): CategoryInfo | undefined {
  return categories().bySlug.get(slug);
}

export function getEntriesByCategory(name: string): DictionaryEntry[] {
  return categories().entries.get(name) ?? [];
}

export function getPageCount(total: number): number {
  return Math.max(1, Math.ceil(total / SEO_PAGE_SIZE));
}

export type Paginated = { items: DictionaryEntry[]; page: number; pageCount: number; total: number; first: number; last: number };

// page es 1-based. Devuelve null si la página no existe (nunca se
// renderiza una página vacía).
export function paginateEntries(entries: DictionaryEntry[], page: number): Paginated | null {
  const pageCount = getPageCount(entries.length);
  if (!Number.isInteger(page) || page < 1 || page > pageCount || entries.length === 0) return null;
  const start = (page - 1) * SEO_PAGE_SIZE;
  const items = entries.slice(start, start + SEO_PAGE_SIZE);
  return { items, page, pageCount, total: entries.length, first: start + 1, last: start + items.length };
}

// Parsea el segmento [page] de la URL: solo enteros canónicos ("2", no
// "02" ni "2.0") y desde la 2 — la página 1 vive en la URL sin /pagina/.
export function parsePageParam(raw: string): number | null {
  if (!/^[1-9]\d*$/.test(raw)) return null;
  const n = Number(raw);
  return n >= 2 ? n : null;
}

// Paths relativos (sin dominio) de cada página de un hub.
export function hubPagePath(basePath: string, page: number): string {
  return page <= 1 ? basePath : `${basePath}/pagina/${page}`;
}

export function letterPath(slug: string) {
  return `/letra/${slug}`;
}
export function categoryPath(slug: string) {
  return `/categoria/${slug}`;
}

// Todas las rutas de hub que existen realmente (para sitemap y
// generateStaticParams), sin páginas vacías ni duplicados.
export function getHubPaths(): string[] {
  const paths: string[] = ["/letras", "/categorias"];
  for (const l of getLetterCounts()) {
    const base = letterPath(l.slug);
    for (let p = 1; p <= getPageCount(l.count); p++) paths.push(hubPagePath(base, p));
  }
  for (const c of getCategoryCounts()) {
    const base = categoryPath(c.slug);
    for (let p = 1; p <= getPageCount(c.count); p++) paths.push(hubPagePath(base, p));
  }
  return paths;
}

// ---- Metadata ----

export function formatCount(n: number) {
  return n.toLocaleString("es-AR");
}

function capitalizeFirst(text: string) {
  return text.replace(/\p{L}/u, (ch) => ch.toLocaleUpperCase("es"));
}

export function letterTitle(letter: string, page: number) {
  const base = `Palabras con ${letter} del habla argentina`;
  return `${base}${page > 1 ? ` — Página ${page}` : ""} | ${SITE_NAME}`;
}

export function categoryTitle(name: string, page: number) {
  const lower = name.toLocaleLowerCase("es");
  const base = lower === "lunfardo" ? "Palabras de lunfardo argentino" : `${capitalizeFirst(name)}: palabras y expresiones argentinas`;
  return `${base}${page > 1 ? ` — Página ${page}` : ""} | ${SITE_NAME}`;
}

// Descripción basada en contenido real de la página: cantidad total y el
// rango alfabético que efectivamente muestra.
export function describePage(subject: string, p: Paginated): string {
  const from = p.items[0].palabra;
  const to = p.items[p.items.length - 1].palabra;
  const range = `de «${from}» a «${to}»`;
  if (p.pageCount === 1) {
    return `${formatCount(p.total)} palabras y expresiones ${subject}, ${range}, con su significado en el diccionario Berretín.`;
  }
  return `Página ${p.page} de ${p.pageCount}: palabras y expresiones ${subject}, ${range}, con su significado. ${formatCount(p.total)} entradas en total.`;
}

export function buildHubMetadata({ title, description, path }: { title: string; description: string; path: string }): Metadata {
  const url = `${SITE_URL}${path}`;
  const ogImage = `${OG_URL}/brand/berretin-og.png`;
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: INDEXING_ALLOWED ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      title,
      description,
      url: `${OG_URL}${path}`,
      siteName: SITE_NAME,
      locale: "es_AR",
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
  };
}
