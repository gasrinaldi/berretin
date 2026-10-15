// Estado de búsqueda/filtros del diccionario compartido entre servidor y
// cliente. Archivo NEUTRAL a propósito (sin "use client" ni imports de
// Node): app/page.tsx (server) y components/Dictionary.tsx (client) parsean
// la URL con la MISMA función, así el primer render del servidor y el
// primer render del cliente salen del mismo estado y no hay mismatch.
import type { DictionaryEntry } from "@/lib/dictionary";

export type TipoFilter = "todas" | "palabras" | "expresiones";

export type FilterState = {
  letras: string[];
  categorias: string[];
  origenes: string[];
  sinCategoria: boolean;
  tipo: TipoFilter;
};

export const EMPTY_FILTERS: FilterState = { letras: [], categorias: [], origenes: [], sinCategoria: false, tipo: "todas" };

// Misma forma que devuelve /api/dictionary (lib/dictionary SearchResult).
export type DictionaryPageData = {
  results: DictionaryEntry[];
  total: number;
  hasMore: boolean;
  page: number;
  countsByLetter: Record<string, number>;
};

// Lo que el servidor entrega ya resuelto: la URL parseada + la primera
// página de resultados de ESA búsqueda/filtro.
export type InitialDictionaryState = {
  query: string;
  filters: FilterState;
  data: DictionaryPageData;
};

// Reglas idénticas a las de siempre (antes vivían en readStateFromUrl de
// Dictionary.tsx): parámetros repetidos con getAll, tipo inválido -> "todas".
export function parseDictionaryState(params: URLSearchParams): { query: string; filters: FilterState } {
  const tipoParam = params.get("tipo");
  const tipo: TipoFilter = tipoParam === "palabras" || tipoParam === "expresiones" ? tipoParam : "todas";
  return {
    query: params.get("q") ?? "",
    filters: {
      letras: params.getAll("letra"),
      categorias: params.getAll("categoria"),
      origenes: params.getAll("origen"),
      sinCategoria: params.get("sinCategoria") === "1",
      tipo,
    },
  };
}

// searchParams de Next (string | string[] | undefined) -> URLSearchParams,
// conservando los parámetros repetidos.
export function toURLSearchParams(raw: Record<string, string | string[] | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
    else if (value !== undefined) params.append(key, value);
  }
  return params;
}

function sameList(a: string[], b: string[]) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

// ¿La búsqueda/filtros actuales son exactamente los que el servidor ya
// resolvió? (la query se compara sin espacios de borde: es lo que se envía
// a la API y lo que normaliza searchEntries).
export function isSameSearchState(query: string, filters: FilterState, initial: Pick<InitialDictionaryState, "query" | "filters">) {
  return (
    query.trim() === initial.query.trim() &&
    sameList(filters.letras, initial.filters.letras) &&
    sameList(filters.categorias, initial.filters.categorias) &&
    sameList(filters.origenes, initial.filters.origenes) &&
    filters.sinCategoria === initial.filters.sinCategoria &&
    filters.tipo === initial.filters.tipo
  );
}
