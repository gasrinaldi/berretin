import { createHash } from "node:crypto";
import dictionaryData from "@/data/dictionary.json";

type RawEntry = {
  id: string;
  palabra: string;
  definicion: string;
  letra: string;
  categorias: string[];
  origenes: string[];
  busquedaNormalizada: string;
};

export type DictionaryEntry = {
  id: string;
  slug: string;
  palabra: string;
  definicion: string;
  letra: string;
  categorias: string[];
  origenes: string[];
};

type InternalEntry = DictionaryEntry & { busquedaNormalizada: string };

// Mismas reglas que components/Dictionary.tsx: ignora signos iniciales para
// ordenar, pliega tildes (no la ñ) para comparar sin acentos.
function sortKey(word: string) {
  return word.replace(/^[^\p{L}]+/u, "") || word;
}
function stripAccents(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}
function normalize(value: string) {
  return stripAccents(value).toLowerCase();
}
function slugifyWord(value: string) {
  return (
    stripAccents(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "entrada"
  );
}
// Identificador corto y determinístico (derivado del id ya estable de la
// entrada) para desambiguar slugs que colisionan, sin depender de la
// posición en el array — no cambia si se reordena o actualiza el dataset.
function shortHash(id: string) {
  return createHash("sha1").update(id).digest("hex").slice(0, 5);
}

function buildAll(): InternalEntry[] {
  const raw = dictionaryData as RawEntry[];
  const sorted = [...raw].sort((a, b) => sortKey(a.palabra).localeCompare(sortKey(b.palabra), "es"));

  const baseSlugs = sorted.map((e) => slugifyWord(e.palabra));
  const freq = new Map<string, number>();
  for (const s of baseSlugs) freq.set(s, (freq.get(s) ?? 0) + 1);

  const used = new Set<string>();
  return sorted.map((e, i) => {
    const base = baseSlugs[i];
    let slug = (freq.get(base) ?? 0) > 1 ? `${base}-${shortHash(e.id)}` : base;
    while (used.has(slug)) slug = `${slug}x`;
    used.add(slug);
    return {
      id: e.id,
      slug,
      palabra: e.palabra,
      definicion: e.definicion,
      letra: e.letra,
      categorias: e.categorias,
      origenes: e.origenes,
      busquedaNormalizada: e.busquedaNormalizada,
    };
  });
}

// Se calcula una sola vez por instancia de la función serverless: el orden,
// los slugs y el índice de búsqueda se reutilizan en cada request.
const ALL: InternalEntry[] = buildAll();
const BY_SLUG = new Map<string, InternalEntry>(ALL.map((e) => [e.slug, e]));

function stripInternal(entry: InternalEntry): DictionaryEntry {
  const { id, slug, palabra, definicion, letra, categorias, origenes } = entry;
  return { id, slug, palabra, definicion, letra, categorias, origenes };
}

export function getEntryBySlug(slug: string): DictionaryEntry | undefined {
  const entry = BY_SLUG.get(slug);
  return entry ? stripInternal(entry) : undefined;
}

export function getAllSlugs(): string[] {
  return ALL.map((e) => e.slug);
}

// Todo el diccionario ya normalizado (mismo orden y slugs que el resto de
// la app) — usado por /descubrir para elegir palabra del día, expresión
// aleatoria, preguntas de quiz y colecciones por categoría sin depender
// de la paginación de searchEntries.
export function getAllEntries(): DictionaryEntry[] {
  return ALL.map(stripInternal);
}

export type SearchParams = {
  q?: string;
  letras?: string[];
  categorias?: string[];
  origenes?: string[];
  sinCategoria?: boolean;
  page?: number;
  limit?: number;
};

export type SearchResult = {
  results: DictionaryEntry[];
  total: number;
  hasMore: boolean;
  page: number;
  countsByLetter: Record<string, number>;
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export function searchEntries({ q = "", letras = [], categorias = [], origenes = [], sinCategoria = false, page = 0, limit = DEFAULT_LIMIT }: SearchParams): SearchResult {
  const query = normalize(q.trim());
  const safePage = Math.max(0, Math.floor(page) || 0);
  const safeLimit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(limit) || DEFAULT_LIMIT));

  let filtered = ALL;
  if (query) filtered = filtered.filter((e) => e.busquedaNormalizada.includes(query));
  if (letras.length) filtered = filtered.filter((e) => letras.includes(e.letra));
  if (sinCategoria) {
    filtered = filtered.filter((e) => e.categorias.length === 0 && e.origenes.length === 0);
  } else {
    if (categorias.length) filtered = filtered.filter((e) => categorias.some((c) => e.categorias.includes(c)));
    if (origenes.length) filtered = filtered.filter((e) => origenes.some((o) => e.origenes.includes(o)));
  }

  const countsByLetter: Record<string, number> = {};
  for (const e of filtered) countsByLetter[e.letra] = (countsByLetter[e.letra] ?? 0) + 1;

  const total = filtered.length;
  const start = safePage * safeLimit;
  const results = filtered.slice(start, start + safeLimit).map(stripInternal);
  const hasMore = start + safeLimit < total;

  return { results, total, hasMore, page: safePage, countsByLetter };
}
