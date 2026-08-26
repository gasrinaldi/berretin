"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LetterBlock } from "@/components/LetterBlock";
import { SearchBar } from "@/components/SearchBar";
import { DictionaryIntro } from "@/components/DictionaryIntro";
import { DictionaryFilters, EMPTY_FILTERS, type FilterState } from "@/components/DictionaryFilters";
import type { DictionaryEntry } from "@/app/api/dictionary/route";

// Techo defensivo para la restauración por sessionStorage: nunca se
// dispara en el uso normal, solo evita un exceso de pedidos en paralelo
// si quedara guardado un estado desproporcionado.
const MAX_RESTORE_PAGES = 40;
const SCROLL_STATE_KEY = "berretin:dictionary-scroll";
// "Pequeño margen" pedido para que la tarjeta restaurada no quede pegada
// al borde superior del viewport.
const RESTORED_CARD_TOP_MARGIN = 16;

type ApiResponse = {
  results: DictionaryEntry[];
  total: number;
  hasMore: boolean;
  page: number;
  countsByLetter: Record<string, number>;
};

type ScrollState = { search: string; pagesLoaded: number; wordSlug: string };

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
  const pendingWordSlugRef = useRef<string | null>(null);
  // Token de la alineación de tarjeta en curso: incrementarlo cancela
  // cualquier corrección de scroll todavía corriendo. Solo se toca al
  // desmontar de verdad — la carga automática (más abajo) puede seguir
  // alternando `loading` mientras tanto sin interrumpirla.
  const alignmentTokenRef = useRef(0);

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
      if (saved && saved.search === window.location.search && saved.pagesLoaded >= 1 && saved.wordSlug) {
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

  // Debounce de la búsqueda tipeada (los filtros, al ser clics discretos, no
  // lo necesitan). Vaciar el campo restaura de una, sin esperar los 250ms.
  // Se salta la primera corrida (montaje): ahí `debouncedQuery` ya arranca
  // igual a `query` (mismo valor inicial), así que no hay nada que
  // debouncear todavía — si no se salta, ese primer timeout(0) dispara con
  // el `query` viejo (antes de que hydrate() aplique la URL) y pisa el
  // debouncedQuery ya hidratado, tirando abajo la restauración.
  const isFirstQueryEffect = useRef(true);
  useEffect(() => {
    if (isFirstQueryEffect.current) {
      isFirstQueryEffect.current = false;
      return;
    }
    const timeout = setTimeout(() => setDebouncedQuery(query), query.trim() ? 250 : 0);
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
  // salto visual. La alineación de la tarjeta visitada se aplica recién
  // cuando esto termina, nunca antes.
  const restorePages = async (pagesLoaded: number, wordSlug: string) => {
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
      pendingWordSlugRef.current = wordSlug;
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
      if (restore) restorePages(restore.pagesLoaded, restore.wordSlug);
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

  // Alinea la tarjeta de la palabra visitada como primera fila visible
  // (con un pequeño margen arriba) recién después de que la restauración
  // terminó de pintar — nunca un scroll numérico fijo, que no tiene en
  // cuenta que el layout puede diferir levemente de cuando se guardó.
  // Recalcula la posición contra la tarjeta en cada intento y para de
  // reafirmarla recién cuando el resultado ya coincide varias veces
  // seguidas — así cubre tanto el caso rápido (unos pocos cuadros) como
  // una carrera más larga contra el navegador o el propio router de
  // Next.js, sin forzar el scroll por más tiempo del necesario (que se
  // notaría si el usuario scrollea a mano mientras tanto).
  //
  // requestAnimationFrame en vez de setTimeout: un setTimeout(50ms)
  // pierde en la práctica la carrera contra la restauración nativa de
  // scroll del navegador/Next.js tras router.back(); reafirmar antes de
  // cada pintado sí la gana. Corre con un token propio (no un cleanup de
  // efecto atado a `loading`): la carga automática de más abajo puede
  // alternar `loading` mientras tanto (dispara su propio fetch apenas el
  // centinela queda cerca) sin cortar esta corrección a mitad de camino.
  const alignCardToTop = (targetSlug: string) => {
    const token = ++alignmentTokenRef.current;
    let stableStreak = 0;
    const deadline = performance.now() + 3000;
    const tick = () => {
      if (alignmentTokenRef.current !== token) return;
      const card = document.getElementById(`word-${targetSlug}`);
      if (card) {
        const target = Math.max(0, card.getBoundingClientRect().top + window.scrollY - RESTORED_CARD_TOP_MARGIN);
        stableStreak = Math.abs(window.scrollY - target) < 1 ? stableStreak + 1 : 0;
        if (stableStreak <= 4) window.scrollTo(0, target);
      }
      if (stableStreak > 4 || performance.now() > deadline) return;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  useEffect(() => {
    if (loading) return;
    const targetSlug = pendingWordSlugRef.current;
    if (targetSlug == null) return;
    pendingWordSlugRef.current = null;
    alignCardToTop(targetSlug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Cancela una alineación en curso solo ante un desmontaje real (irse de
  // la página), nunca por los cambios de `loading` de la carga automática.
  useEffect(() => {
    return () => {
      alignmentTokenRef.current += 1;
    };
  }, []);

  // Guarda en el momento exacto del click sobre una tarjeta de palabra
  // (fase de captura en document, así corre antes que el navigate del
  // Link) — no al desmontar: para entonces Next.js ya cambió de página.
  // Solo interesa el click que efectivamente lleva a una palabra: es la
  // que hay que alinear arriba al volver, no cualquier navegación.
  useEffect(() => {
    if (!hydrated) return;
    const handleClick = (event: MouseEvent) => {
      if (pagesLoadedRef.current === 0) return;
      const link = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>('a[href^="/diccionario/"]');
      const slug = link?.getAttribute("href")?.slice("/diccionario/".length);
      if (!slug) return;
      saveScrollState({ search: currentSearchRef.current, pagesLoaded: pagesLoadedRef.current, wordSlug: slug });
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
    <div className="dictionary-body">
      <DictionaryIntro />
      <div id="dictionary-search" className="controls">
        <SearchBar value={query} onChange={onQueryChange} className="consult-search" />
        <p className="consult-results-count">
          {total.toLocaleString("es-AR")} {total === 1 ? "entrada" : "entradas"}
        </p>
      </div>
      <DictionaryFilters state={filters} onChange={setFilters} query={query} onQueryChange={onQueryChange} />
      {/* Centinela fino (no #content entero, que al ser alto queda
          "intersectando" casi todo el scroll y no vuelve a disparar el
          observer al cruzar su borde superior): CinematicHero.tsx lo usa
          para saber cuándo mostrar "volver al buscador". */}
      <div id="results-sentinel" aria-hidden="true" />
      <main id="content">
        {groups.length > 0 ? (
          <>
            {groups.map((group) => (
              // Con relevancia (búsqueda activa) la misma letra puede repetirse
              // en grupos no contiguos (p.ej. "bocha" antes, "a bocha" después):
              // key solo por letra colisionaría entre ambos. Se agrega el id de
              // la primera entrada del grupo, que es único en todo el resultado.
              <LetterBlock
                key={`${group.letter}-${group.entries[0].id}`}
                letter={group.letter}
                entries={group.entries}
                total={countsByLetter[group.letter] ?? group.entries.length}
              />
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
    </div>
  );
}
