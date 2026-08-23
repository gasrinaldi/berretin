"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LetterBlock } from "@/components/LetterBlock";
import { SearchBar } from "@/components/SearchBar";
import { DictionaryIntro } from "@/components/DictionaryIntro";
import { DictionaryFilters, EMPTY_FILTERS, type FilterState } from "@/components/DictionaryFilters";
import { Footer } from "@/components/Footer";
import type { DictionaryEntry } from "@/app/api/dictionary/route";

// Techo defensivo para la restauración por sessionStorage: nunca se
// dispara en el uso normal, solo evita un exceso de pedidos en paralelo
// si quedara guardado un estado desproporcionado.
const MAX_RESTORE_PAGES = 40;
const SCROLL_STATE_KEY = "berretin:dictionary-scroll";

type ApiResponse = {
  results: DictionaryEntry[];
  total: number;
  hasMore: boolean;
  page: number;
  countsByLetter: Record<string, number>;
};

type ScrollState = { search: string; pagesLoaded: number; scrollY: number };

function readStateFromUrl(): { query: string; filters: FilterState } {
  if (typeof window === "undefined") return { query: "", filters: EMPTY_FILTERS };
  const params = new URLSearchParams(window.location.search);
  const tipoParam = params.get("tipo");
  const tipo: FilterState["tipo"] = tipoParam === "palabras" || tipoParam === "expresiones" ? tipoParam : "todas";
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

function writeStateToUrl(query: string, filters: FilterState) {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query);
  filters.letras.forEach((l) => params.append("letra", l));
  filters.categorias.forEach((c) => params.append("categoria", c));
  filters.origenes.forEach((o) => params.append("origen", o));
  if (filters.sinCategoria) params.set("sinCategoria", "1");
  if (filters.tipo !== "todas") params.set("tipo", filters.tipo);
  const search = params.toString();
  const url = search ? `?${search}` : window.location.pathname;
  window.history.replaceState(null, "", url);
  return search ? `?${search}` : "";
}

// El estado de scroll/paginación vive aparte de la URL (que ya guarda
// búsqueda y filtros): es temporal, por pestaña, y no tiene sentido que
// aparezca en un link compartido.
function readScrollState(): ScrollState | null {
  try {
    const raw = sessionStorage.getItem(SCROLL_STATE_KEY);
    return raw ? (JSON.parse(raw) as ScrollState) : null;
  } catch {
    return null;
  }
}

function saveScrollState(state: ScrollState) {
  try {
    sessionStorage.setItem(SCROLL_STATE_KEY, JSON.stringify(state));
  } catch {
    // sessionStorage no disponible (modo privado, cuota llena): sin
    // restauración, pero la navegación normal sigue funcionando igual.
  }
}

// El hero cinematográfico mantiene el diccionario oculto (curtain fixed)
// hasta que el progreso de scroll cruza su propio umbral de revelado —
// esto vive en CinematicHero.tsx, que esta función no toca ni conoce por
// dentro: solo lee el atributo data-revealed que ya expone.
function isCurtainRevealed(): boolean {
  return document.querySelector(".cinehero-curtain")?.getAttribute("data-revealed") === "true";
}

type DictionaryProps = {
  query: string;
  onQueryChange: (value: string) => void;
};

export function Dictionary({ query, onQueryChange }: DictionaryProps) {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
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
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Estado "vivo" para poder guardarlo en cualquier momento (scroll, cambio
  // de página, desmontaje) sin depender de closures viejas de un efecto.
  const currentSearchRef = useRef("");
  const pagesLoadedRef = useRef(0);
  const pendingRestoreRef = useRef<ScrollState | null>(null);
  const pendingScrollYRef = useRef<number | null>(null);

  // El navegador (y Next.js, para navegaciones "atrás") intentan restaurar
  // el scroll por su cuenta apenas cambia la ruta — antes de que este
  // componente termine de recargar las páginas guardadas. Si se deja en
  // "auto", esa restauración nativa pisa la nuestra (o queda pisada por
  // ella más tarde). Se apaga una sola vez para que el único que mueva el
  // scroll sea el efecto de más abajo.
  useEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  // Hidratar desde la URL una sola vez al montar. Si hay un estado de
  // scroll guardado que corresponde EXACTAMENTE a esta URL (misma
  // búsqueda/filtros), es que se está volviendo de una palabra: se marca
  // para restaurar en vez de arrancar en la página 0. Se consume una sola
  // vez (se borra de sessionStorage) para que una visita nueva —aunque
  // caiga en la misma búsqueda más tarde— no recupere un estado viejo.
  useEffect(() => {
    const hydrate = () => {
      const { query: urlQuery, filters: urlFilters } = readStateFromUrl();
      if (urlQuery) onQueryChange(urlQuery);
      setFilters(urlFilters);
      // Sin esperar el debounce de 250ms: si no, el primer fetch (y una
      // eventual restauración) dispararía sin la búsqueda todavía aplicada.
      setDebouncedQuery(urlQuery);

      const saved = readScrollState();
      // pagesLoaded >= 1 (no ">1"): incluso con una sola página cargada el
      // usuario puede haber scrolleado bastante dentro de ella — lo que
      // importa para decidir si vale la pena restaurar es que haya *algo*
      // guardado para esta misma búsqueda, no cuántas páginas hacían falta.
      if (saved && saved.search === window.location.search && saved.pagesLoaded >= 1) {
        pendingRestoreRef.current = saved;
        try {
          sessionStorage.removeItem(SCROLL_STATE_KEY);
        } catch {
          // no-op
        }
      }
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
    const search = writeStateToUrl(query, filters);
    currentSearchRef.current = search;
  }, [query, filters, hydrated]);

  const buildParams = (targetPage: number) => {
    const params = new URLSearchParams();
    if (debouncedQuery.trim()) params.set("q", debouncedQuery.trim());
    filters.letras.forEach((l) => params.append("letra", l));
    filters.categorias.forEach((c) => params.append("categoria", c));
    filters.origenes.forEach((o) => params.append("origen", o));
    if (filters.sinCategoria) params.set("sinCategoria", "1");
    if (filters.tipo !== "todas") params.set("tipo", filters.tipo);
    params.set("page", String(targetPage));
    return params;
  };

  const fetchPageData = async (targetPage: number): Promise<ApiResponse> => {
    const res = await fetch(`/api/dictionary?${buildParams(targetPage).toString()}`);
    return res.json();
  };

  const fetchPage = async (targetPage: number, replace: boolean) => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const data = await fetchPageData(targetPage);
      if (id !== requestId.current) return; // respuesta obsoleta, se ignora
      setResults((prev) => (replace ? data.results : [...prev, ...data.results]));
      setTotal(data.total);
      setHasMore(data.hasMore);
      setCountsByLetter(data.countsByLetter);
      setPage(targetPage);
      pagesLoadedRef.current = targetPage + 1;
    } catch {
      if (id !== requestId.current) return;
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  };

  // Reconstruye de una sola vez los N bloques que ya estaban cargados
  // (pedidos en paralelo, un solo setState) para no pintar primero solo la
  // página 0 y recién después ir sumando el resto: eso sí se notaría como
  // salto visual. La posición de scroll se aplica recién cuando esto
  // termina, nunca antes.
  const restorePages = async (pagesLoaded: number, scrollY: number) => {
    const id = ++requestId.current;
    setLoading(true);
    const safeCount = Math.max(1, Math.min(pagesLoaded, MAX_RESTORE_PAGES));
    try {
      const pagesData = await Promise.all(Array.from({ length: safeCount }, (_, i) => fetchPageData(i)));
      if (id !== requestId.current) return;
      const last = pagesData[pagesData.length - 1];
      setResults(pagesData.flatMap((p) => p.results));
      setTotal(last.total);
      setHasMore(last.hasMore);
      setCountsByLetter(last.countsByLetter);
      setPage(safeCount - 1);
      pagesLoadedRef.current = safeCount;
      pendingScrollYRef.current = scrollY;
    } catch {
      if (id !== requestId.current) return;
      fetchPage(0, true); // la restauración falló: arrancar normal en vez de quedar vacío
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  };

  // Cada vez que cambia la búsqueda (ya debounced) o los filtros, se
  // reinicia la paginación — salvo la primera vez tras hidratar, si hay
  // una restauración pendiente para esta misma búsqueda. Se ignora por
  // completo mientras !hydrated: si no, este efecto ya dispara una vez en
  // el commit inicial (con filters/debouncedQuery todavía en su valor por
  // defecto) y consume pendingRestoreRef ahí — antes de que el commit que
  // sí trae los valores reales de la URL llegue a verlo.
  useEffect(() => {
    if (!hydrated) return;
    const run = () => {
      const restore = pendingRestoreRef.current;
      pendingRestoreRef.current = null;
      if (restore) restorePages(restore.pagesLoaded, restore.scrollY);
      else fetchPage(0, true);
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, filters, hydrated]);

  // Carga automática progresiva: cuando el centinela del final de la
  // lista entra en el viewport (con margen, para adelantarse antes de que
  // se llegue a ver), se pide la página siguiente — mismo fetchPage que ya
  // usa el botón, misma paginación de a 50 entradas, nunca todo junto.
  // "Cargar más" queda como respaldo manual si el observer no dispara
  // (navegador viejo, foco perdido, etc.).
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loading || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchPage(page + 1, false);
      },
      { rootMargin: "600px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loading, page]);

  // Aplica la posición de scroll guardada recién después de que la
  // restauración terminó de pintar. El hero mantiene el contenido fuera
  // del flujo (position:fixed) hasta cruzar su propio umbral de revelado,
  // así que primero hay que "empujar" ese cruce (el scroll queda clamped
  // al alto del hero, pero eso ya alcanza para revelarlo) y solo después,
  // con el documento ya a su alto real, aplicar la posición final.
  //
  // Sigue reafirmando la posición unos cuadros más incluso después de
  // cruzar el umbral: tanto el navegador como el propio router de
  // Next.js intentan restaurar SU idea de scroll en una navegación
  // "atrás", a veces después de que este efecto ya corrió una vez — sin
  // este margen, esa restauración ajena termina ganando la carrera.
  useEffect(() => {
    if (loading) return;
    const targetY = pendingScrollYRef.current;
    if (targetY == null) return;
    pendingScrollYRef.current = null;

    let cancelled = false;
    let revealedAt: number | null = null;
    const settle = (attempt: number) => {
      if (cancelled) return;
      window.scrollTo(0, targetY);
      if (revealedAt == null && isCurtainRevealed()) revealedAt = attempt;
      const settledLongEnough = revealedAt != null && attempt - revealedAt > 6;
      if (settledLongEnough || attempt > 40) return;
      setTimeout(() => settle(attempt + 1), 50);
    };
    settle(0);
    return () => {
      cancelled = true;
    };
  }, [loading]);

  // Guarda en el momento exacto del click (fase de captura en document, así
  // corre antes que el navigate del Link) — no al desmontar: para entonces
  // Next.js ya llevó el scroll a 0 para la página nueva, y guardar ahí
  // pisaría la posición real con un 0.
  useEffect(() => {
    if (!hydrated) return;
    const handleClick = () => {
      if (pagesLoadedRef.current > 0) {
        saveScrollState({ search: currentSearchRef.current, pagesLoaded: pagesLoadedRef.current, scrollY: window.scrollY });
      }
    };
    document.addEventListener("click", handleClick, { capture: true });
    return () => document.removeEventListener("click", handleClick, { capture: true });
  }, [hydrated]);

  const groups = useMemo(() => {
    const ordered: { letter: string; entries: DictionaryEntry[] }[] = [];
    for (const entry of results) {
      const last = ordered[ordered.length - 1];
      if (last && last.letter === entry.letra) last.entries.push(entry);
      else ordered.push({ letter: entry.letra, entries: [entry] });
    }
    return ordered;
  }, [results]);

  return (
    <>
      <DictionaryIntro />
      <div id="dictionary-search" className="controls">
        <SearchBar value={query} onChange={onQueryChange} className="consult-search" />
        <p className="consult-results-count">
          {total.toLocaleString("es-AR")} {total === 1 ? "entrada" : "entradas"}
        </p>
      </div>
      <DictionaryFilters state={filters} onChange={setFilters} query={query} onQueryChange={onQueryChange} />
      <main id="content">
        {groups.length > 0 ? (
          <>
            {groups.map((group) => (
              <LetterBlock key={group.letter} letter={group.letter} entries={group.entries} total={countsByLetter[group.letter] ?? group.entries.length} />
            ))}
            {hasMore && (
              <>
                <div ref={sentinelRef} aria-hidden="true" />
                <button type="button" className="load-more-btn" onClick={() => fetchPage(page + 1, false)} disabled={loading}>
                  {loading ? "cargando..." : "cargar más"}
                </button>
              </>
            )}
          </>
        ) : (
          !loading && (
            <p className="no-results">
              {filters.categorias.length >= 2
                ? "No encontramos entradas que compartan todos estos filtros."
                : "no encontramos nada con eso — probá con otra palabra o quitá algún filtro"}
            </p>
          )
        )}
      </main>
      <Footer />
    </>
  );
}
