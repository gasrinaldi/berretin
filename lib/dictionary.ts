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
  return stripAccents(value).toLowerCase().replace(/\s+/g, " ").trim();
}
// Prioridad de relevancia para una búsqueda con texto: 0) coincidencia
// exacta del término, 1) el término empieza con la búsqueda, 2) el
// término contiene la búsqueda, 3) la coincidencia está solo en la
// definición (busquedaNormalizada, ya filtrada antes de llamar acá).
function relevanceTier(entry: InternalEntry, query: string): number {
  const word = normalize(entry.palabra);
  if (word === query) return 0;
  if (word.startsWith(query)) return 1;
  if (word.includes(query)) return 2;
  return 3;
}
// Clasificación automática, sin tocar el dataset: un término sin espacios
// es "palabra", dos o más separados por espacios son "expresión". Se usa
// tanto para el filtro Todas/Palabras/Expresiones como para restringir
// "expresión aleatoria" en /descubrir.
export function isExpression(palabra: string): boolean {
  return palabra.trim().split(/\s+/).filter(Boolean).length >= 2;
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
// Posición (1-based) de cada entrada dentro del orden alfabético completo
// del diccionario — estable mientras no cambie el dataset, nunca inventada.
// Usada en /diccionario/[slug] para el número de ficha ("N.º 00047").
const POSITION_BY_SLUG = new Map<string, number>(ALL.map((e, i) => [e.slug, i + 1]));

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

// Devuelve la posición real y estable de la entrada, o null si no existe
// (no se inventa ningún número de ficha para slugs desconocidos).
export function getEntryPosition(slug: string): number | null {
  return POSITION_BY_SLUG.get(slug) ?? null;
}

// Todo el diccionario ya normalizado (mismo orden y slugs que el resto de
// la app) — usado por /descubrir para elegir palabra del día, expresión
// aleatoria, preguntas de quiz y colecciones por categoría sin depender
// de la paginación de searchEntries.
export function getAllEntries(): DictionaryEntry[] {
  return ALL.map(stripInternal);
}

export type TipoFilter = "todas" | "palabras" | "expresiones";

export type SearchParams = {
  q?: string;
  letras?: string[];
  categorias?: string[];
  origenes?: string[];
  sinCategoria?: boolean;
  tipo?: TipoFilter;
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

export function searchEntries({ q = "", letras = [], categorias = [], origenes = [], sinCategoria = false, tipo = "todas", page = 0, limit = DEFAULT_LIMIT }: SearchParams): SearchResult {
  const query = normalize(q.trim());
  const safePage = Math.max(0, Math.floor(page) || 0);
  const safeLimit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(limit) || DEFAULT_LIMIT));

  let filtered = ALL;
  if (query) filtered = filtered.filter((e) => e.busquedaNormalizada.includes(query));
  if (letras.length) filtered = filtered.filter((e) => letras.includes(e.letra));
  if (tipo === "palabras") filtered = filtered.filter((e) => !isExpression(e.palabra));
  else if (tipo === "expresiones") filtered = filtered.filter((e) => isExpression(e.palabra));
  if (sinCategoria) {
    filtered = filtered.filter((e) => e.categorias.length === 0 && e.origenes.length === 0);
  } else {
    // AND entre categorías: una entrada solo aparece si tiene TODAS las
    // categorías activas (una palabra puede pertenecer legítimamente a
    // varias, y seleccionar más de una debe acotar el resultado, no
    // ampliarlo). Origen se mantiene con OR, sin cambios.
    if (categorias.length) filtered = filtered.filter((e) => categorias.every((c) => e.categorias.includes(c)));
    if (origenes.length) filtered = filtered.filter((e) => origenes.some((o) => e.origenes.includes(o)));
  }

  // Relevancia solo con búsqueda activa (vacía conserva el orden alfabético
  // de siempre). Sort estable: ALL ya viene alfabético, así que entradas
  // con la misma prioridad quedan alfabéticas entre sí sin comparar de nuevo.
  if (query) filtered = [...filtered].sort((a, b) => relevanceTier(a, query) - relevanceTier(b, query));

  const countsByLetter: Record<string, number> = {};
  for (const e of filtered) countsByLetter[e.letra] = (countsByLetter[e.letra] ?? 0) + 1;

  const total = filtered.length;
  const start = safePage * safeLimit;
  const results = filtered.slice(start, start + safeLimit).map(stripInternal);
  const hasMore = start + safeLimit < total;

  return { results, total, hasMore, page: safePage, countsByLetter };
}
