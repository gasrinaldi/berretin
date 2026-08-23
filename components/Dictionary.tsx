"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LetterBlock } from "@/components/LetterBlock";
import { SearchBar } from "@/components/SearchBar";
import { DictionaryFilters, type FilterState } from "@/components/DictionaryFilters";
import { Footer } from "@/components/Footer";
import type { DictionaryEntry } from "@/app/api/dictionary/route";

const EMPTY_FILTERS: FilterState = { letras: [], categorias: [], origenes: [], sinCategoria: false };

type ApiResponse = {
  results: DictionaryEntry[];
  total: number;
  hasMore: boolean;
  page: number;
  countsByLetter: Record<string, number>;
};

function readStateFromUrl(): { query: string; filters: FilterState } {
  if (typeof window === "undefined") return { query: "", filters: EMPTY_FILTERS };
  const params = new URLSearchParams(window.location.search);
  return {
    query: params.get("q") ?? "",
    filters: {
      letras: params.getAll("letra"),
      categorias: params.getAll("categoria"),
      origenes: params.getAll("origen"),
      sinCategoria: params.get("sinCategoria") === "1",
    },
  };
}

function writeStateToUrl(query: string, filters: FilterState) {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query);
  filters.letras.forEach((l) => params.append("letra", l));
  filters.categorias.forEach((c) => params.append("categoria", c));
  filters.origenes.forEach((o) => params.append("origen", o));
  if (filters.sinCategoria) params.set("sinCategoria", "1");
  const search = params.toString();
  const url = search ? `?${search}` : window.location.pathname;
  window.history.replaceState(null, "", url);
}

type DictionaryProps = {
  query: string;
  onQueryChange: (value: string) => void;
};

export function Dictionary({ query, onQueryChange }: DictionaryProps) {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [results, setResults] = useState<DictionaryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [countsByLetter, setCountsByLetter] = useState<Record<string, number>>({});
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);

  // Flag de estado (no ref): así el commit que aplica los filtros leídos de
  // la URL es el mismo en el que "hydrated" pasa a true, y el efecto que
  // escribe la URL nunca ve la combinación a medio hidratar (perdería los
  // filtros aunque conservara la búsqueda, que llega por otra vía).
  const [hydrated, setHydrated] = useState(false);
  const requestId = useRef(0);

  // Hidratar desde la URL una sola vez al montar.
  useEffect(() => {
    const hydrate = () => {
      const { query: urlQuery, filters: urlFilters } = readStateFromUrl();
      if (urlQuery) onQueryChange(urlQuery);
      setFilters(urlFilters);
      setHydrated(true);
    };
    hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce de la búsqueda tipeada (los filtros, al ser clics discretos, no lo necesitan).
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(timeout);
  }, [query]);

  // Reflejar búsqueda y filtros en la URL, sin pisar lo que aún no se leyó.
  useEffect(() => {
    if (!hydrated) return;
    writeStateToUrl(query, filters);
  }, [query, filters, hydrated]);

  const fetchPage = async (targetPage: number, replace: boolean) => {
    const id = ++requestId.current;
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedQuery.trim()) params.set("q", debouncedQuery.trim());
    filters.letras.forEach((l) => params.append("letra", l));
    filters.categorias.forEach((c) => params.append("categoria", c));
    filters.origenes.forEach((o) => params.append("origen", o));
    if (filters.sinCategoria) params.set("sinCategoria", "1");
    params.set("page", String(targetPage));

    try {
      const res = await fetch(`/api/dictionary?${params.toString()}`);
      const data: ApiResponse = await res.json();
      if (id !== requestId.current) return; // respuesta obsoleta, se ignora
      setResults((prev) => (replace ? data.results : [...prev, ...data.results]));
      setTotal(data.total);
      setHasMore(data.hasMore);
      setCountsByLetter(data.countsByLetter);
      setPage(targetPage);
    } catch {
      if (id !== requestId.current) return;
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  };

  // Cada vez que cambia la búsqueda (ya debounced) o los filtros, se reinicia la paginación.
  useEffect(() => {
    const run = () => {
      fetchPage(0, true);
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, filters]);

  const groups = useMemo(() => {
    const ordered: { letter: string; entries: DictionaryEntry[] }[] = [];
    for (const entry of results) {
      const last = ordered[ordered.length - 1];
      if (last && last.letter === entry.letra) last.entries.push(entry);
      else ordered.push({ letter: entry.letra, entries: [entry] });
    }
    return ordered;
  }, [results]);

  const activeFilterCount = filters.letras.length + filters.categorias.length + filters.origenes.length + (filters.sinCategoria ? 1 : 0);

  const activePills = [
    ...filters.letras.map((v) => ({ key: `letra-${v}`, label: `letra: ${v}`, onRemove: () => setFilters({ ...filters, letras: filters.letras.filter((x) => x !== v) }) })),
    ...filters.categorias.map((v) => ({ key: `cat-${v}`, label: v.toLocaleLowerCase("es"), onRemove: () => setFilters({ ...filters, categorias: filters.categorias.filter((x) => x !== v) }) })),
    ...filters.origenes.map((v) => ({ key: `ori-${v}`, label: v.replace("Voz de origen ", "").toLocaleLowerCase("es"), onRemove: () => setFilters({ ...filters, origenes: filters.origenes.filter((x) => x !== v) }) })),
    ...(filters.sinCategoria ? [{ key: "sin-categoria", label: "sin categoría", onRemove: () => setFilters({ ...filters, sinCategoria: false }) }] : []),
  ];

  return (
    <>
      <div className="controls">
        <SearchBar value={query} onChange={onQueryChange} />
        <div className="controls-row">
          <DictionaryFilters state={filters} onChange={setFilters} isOpen={filtersOpen} onToggle={() => setFiltersOpen((v) => !v)} activeCount={activeFilterCount} />
          <p className="results-counter">
            {total} {total === 1 ? "resultado" : "resultados"}
          </p>
        </div>
        {activePills.length > 0 && (
          <div className="active-filters">
            {activePills.map((pill) => (
              <button key={pill.key} type="button" className="active-filter-pill" onClick={pill.onRemove}>
                {pill.label} <span aria-hidden="true">×</span>
              </button>
            ))}
            <button type="button" className="clear-filters-btn" onClick={() => setFilters(EMPTY_FILTERS)}>
              limpiar filtros
            </button>
          </div>
        )}
      </div>
      <main id="content">
        {groups.length > 0 ? (
          <>
            {groups.map((group) => (
              <LetterBlock key={group.letter} letter={group.letter} entries={group.entries} total={countsByLetter[group.letter] ?? group.entries.length} />
            ))}
            {hasMore && (
              <button type="button" className="load-more-btn" onClick={() => fetchPage(page + 1, false)} disabled={loading}>
                {loading ? "cargando..." : "cargar más"}
              </button>
            )}
          </>
        ) : (
          !loading && <p className="no-results">no encontramos nada con eso — probá con otra palabra o quitá algún filtro</p>
        )}
      </main>
      <Footer />
    </>
  );
}
