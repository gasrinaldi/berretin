import type { Metadata } from "next";
import { HomeClient } from "@/components/HomeClient";
import { searchEntries } from "@/lib/dictionary";
import { EMPTY_FILTERS, type InitialDictionaryState } from "@/lib/dictionary-state";
import { SITE_URL } from "@/lib/site";

// Home estática: la misma página (y el mismo HTML) para todas las URLs de
// "/". Hereda robots del layout raíz, que ya refleja SITE_INDEXING_ENABLED.
// El canonical se define acá (no en el layout: heredaría a todas las páginas
// internas el canonical de la home) y es siempre la home limpia: las URLs
// con búsqueda/filtros (?q=, ?letra=, …) sirven este mismo HTML, el cliente
// aplica los filtros (components/Dictionary.tsx los lee de la URL) y
// proxy.ts las marca X-Robots-Tag noindex; robots.txt bloquea su rastreo.
export const metadata: Metadata = {
  alternates: { canonical: SITE_URL },
};

// La primera página del diccionario (sin filtros) se resuelve en el build,
// con el mismo searchEntries que usa /api/dictionary, y viaja como estado
// inicial hasta <Dictionary>: el HTML inicial ya trae las fichas reales y
// el componente hidrata sobre ese mismo contenido.
export default function Home() {
  const data = searchEntries({ page: 0, limit: 50 });
  const initialDictionary: InitialDictionaryState = { query: "", filters: EMPTY_FILTERS, data };

  return <HomeClient initialDictionary={initialDictionary} />;
}
