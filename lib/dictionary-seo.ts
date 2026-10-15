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

// ---- Enlazado interno desde la ficha (/diccionario/[slug]) ----
// Todo se calcula a nivel de módulo (índices construidos una sola vez por
// instancia) y es determinístico: mismo input, mismo HTML, sin random.

// Posición de cada slug dentro del orden alfabético completo — el mismo
// orden estable que devuelve getAllEntries() y que usa el resto de la app.
const GLOBAL_INDEX: Map<string, number> = new Map(ENTRIES.map((e, i) => [e.slug, i]));

let LIST_INDEX_CACHE: { byLetter: Map<string, number>; byCategory: Map<string, Map<string, number>> } | null = null;
function listIndexes() {
  if (LIST_INDEX_CACHE) return LIST_INDEX_CACHE;
  const byLetter = new Map<string, number>();
  for (const list of letters().entries.values()) list.forEach((e, i) => byLetter.set(e.slug, i));
  const byCategory = new Map<string, Map<string, number>>();
  for (const [name, list] of categories().entries) byCategory.set(name, new Map(list.map((e, i) => [e.slug, i])));
  LIST_INDEX_CACHE = { byLetter, byCategory };
  return LIST_INDEX_CACHE;
}

// Path del hub de una letra / categoría, o null si no existe hub (nunca se
// arma una URL a una página que no está generada).
export function getLetterHubPath(letra: string): string | null {
  const info = getLetterBySlug(letra.toLowerCase());
  return info ? letterPath(info.slug) : null;
}

export function getCategoryHubPath(categoryName: string): string | null {
  const slug = slugifyCategory(categoryName);
  const info = getCategoryBySlug(slug);
  return info && info.name === categoryName ? categoryPath(info.slug) : null;
}

// Ficha anterior/siguiente en el orden real del dataset. Los extremos
// devuelven null (la primera no tiene anterior, la última no tiene siguiente).
export function getAdjacentEntries(slug: string): { prev: DictionaryEntry | null; next: DictionaryEntry | null } {
  const i = GLOBAL_INDEX.get(slug);
  if (i === undefined) return { prev: null, next: null };
  return { prev: ENTRIES[i - 1] ?? null, next: ENTRIES[i + 1] ?? null };
}

// Vecinos de list[idx] en orden de cercanía: +1, -1, +2, -2, ... Reparte
// los links entre todas las fichas (cada una queda enlazada desde sus
// vecinas) en vez de concentrarlos siempre en las primeras de la lista.
function* nearby<T>(list: T[], idx: number): Generator<T> {
  for (let d = 1; d < list.length; d++) {
    if (idx + d < list.length) yield list[idx + d];
    if (idx - d >= 0) yield list[idx - d];
  }
}

// Categoría "principal": la más específica (la de menos entradas) entre las
// de la ficha; empate -> el orden en que vienen en el dataset.
function primaryCategory(entry: DictionaryEntry): string | null {
  let best: string | null = null;
  let bestCount = Infinity;
  for (const name of entry.categorias) {
    const count = categories().entries.get(name)?.length ?? Infinity;
    if (count < bestCount) {
      best = name;
      bestCount = count;
    }
  }
  return best;
}

// "Seguí explorando": hasta `limit` fichas adicionales. Primero vecinas de
// la misma categoría principal, después de la misma letra; nunca la propia
// ficha ni la anterior/siguiente (ya se enlazan aparte), sin duplicados.
export function getExploreEntries(entry: DictionaryEntry, limit = 6): DictionaryEntry[] {
  const { prev, next } = getAdjacentEntries(entry.slug);
  const seen = new Set<string>([entry.slug]);
  if (prev) seen.add(prev.slug);
  if (next) seen.add(next.slug);

  const picked: DictionaryEntry[] = [];
  const take = (list: DictionaryEntry[], idx: number | undefined) => {
    if (idx === undefined) return;
    for (const candidate of nearby(list, idx)) {
      if (picked.length >= limit) return;
      if (seen.has(candidate.slug)) continue;
      seen.add(candidate.slug);
      picked.push(candidate);
    }
  };

  const idx = listIndexes();
  const category = primaryCategory(entry);
  if (category) take(getEntriesByCategory(category), idx.byCategory.get(category)?.get(entry.slug));
  if (picked.length < limit) take(getEntriesByLetter(entry.letra), idx.byLetter.get(entry.slug));
  return picked;
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
