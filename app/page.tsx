import type { Metadata } from "next";
import { HomeClient } from "@/components/HomeClient";
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
    // Home limpia: hereda robots/canonical del layout raíz, que ya refleja
    // SITE_INDEXING_ENABLED — no hace falta repetir esa lógica acá.
    return {};
  }

  return {
    robots: { index: false, follow: true },
    alternates: { canonical: SITE_URL },
  };
}

export default function Home() {
  return <HomeClient />;
}
