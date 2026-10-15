import type { Metadata } from "next";
import { HomeClient } from "@/components/HomeClient";
import { searchEntries } from "@/lib/dictionary";
import { parseDictionaryState, toURLSearchParams, type InitialDictionaryState } from "@/lib/dictionary-state";
import { SITE_URL } from "@/lib/site";

// Mismos parámetros que lee/escribe components/Dictionary.tsx en la URL
// (búsqueda, letra, categoría, origen, tipo) — si aparece alguno, esta
// no es la home "limpia" sino un estado de búsqueda/filtros temporal:
// nunca debe indexarse como página propia.
const FILTER_PARAM_KEYS = ["q", "letra", "categoria", "origen", "sinCategoria", "tipo"];

export async function generateMetadata({ searchParams }: PageProps<"/">): Promise<Metadata> {
  const params = await searchParams;
  const hasFilterParams = FILTER_PARAM_KEYS.some((key) => params[key] !== undefined);

  if (!hasFilterParams) {
    // Home limpia: hereda robots del layout raíz, que ya refleja
    // SITE_INDEXING_ENABLED — no hace falta repetir esa lógica acá. El
    // canonical sí se define acá (no en el layout: heredaría a todas las
    // páginas internas el canonical de la home).
    return { alternates: { canonical: SITE_URL } };
  }

  return {
    robots: { index: false, follow: true },
    alternates: { canonical: SITE_URL },
  };
}

// La primera página del diccionario (la de la home limpia o la de la
// búsqueda/filtros que venga en la URL) se resuelve acá, en el servidor,
// con el mismo searchEntries que usa /api/dictionary — sin pasar por HTTP —
// y viaja como estado inicial hasta <Dictionary>: el HTML inicial ya trae
// las fichas reales y el componente hidrata sobre ese mismo contenido.
export default async function Home({ searchParams }: PageProps<"/">) {
  const { query, filters } = parseDictionaryState(toURLSearchParams(await searchParams));
  const data = searchEntries({
    q: query,
    letras: filters.letras,
    categorias: filters.categorias,
    origenes: filters.origenes,
    sinCategoria: filters.sinCategoria,
    tipo: filters.tipo,
    page: 0,
    limit: 50,
  });
  const initialDictionary: InitialDictionaryState = { query, filters, data };

  return <HomeClient initialDictionary={initialDictionary} />;
}
