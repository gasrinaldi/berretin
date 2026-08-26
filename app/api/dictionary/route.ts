import { NextRequest, NextResponse } from "next/server";
import { searchEntries } from "@/lib/dictionary";
import { getClientIpHash } from "@/lib/client-ip";

export type { DictionaryEntry } from "@/lib/dictionary";

// Rate limit en memoria (por instancia de función serverless), sin
// escritura a Supabase por cada búsqueda: alcanza para frenar scraping o
// tráfico masivo sin pegarle al uso normal. El cliente ya debounça 250ms
// (ver components/Dictionary.tsx), así que tipear rápido + scroll
// infinito quedan muy por debajo del límite. No es perfectamente preciso
// entre instancias/cold starts de Vercel, pero no hace falta que lo sea
// para este objetivo.
const WINDOW_MS = 10_000;
const MAX_REQUESTS_PER_WINDOW = 60;
const MAX_TRACKED_KEYS = 5000;

const hits = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  if (hits.size > MAX_TRACKED_KEYS) {
    for (const [trackedKey, entry] of hits) {
      if (now > entry.resetAt) hits.delete(trackedKey);
    }
  }

  const entry = hits.get(key);
  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_REQUESTS_PER_WINDOW;
}

export async function GET(request: NextRequest) {
  const ipHash = await getClientIpHash();
  if (ipHash && isRateLimited(ipHash)) {
    return NextResponse.json({ error: "Demasiadas búsquedas. Esperá un momento." }, { status: 429, headers: { "Retry-After": "10" } });
  }

  const { searchParams } = new URL(request.url);
  const tipoParam = searchParams.get("tipo");
  const tipo = tipoParam === "palabras" || tipoParam === "expresiones" ? tipoParam : "todas";
  const data = searchEntries({
    q: searchParams.get("q") ?? "",
    letras: searchParams.getAll("letra"),
    categorias: searchParams.getAll("categoria"),
    origenes: searchParams.getAll("origen"),
    sinCategoria: searchParams.get("sinCategoria") === "1",
    tipo,
    page: Number(searchParams.get("page") ?? "0"),
    limit: Number(searchParams.get("limit") ?? "50"),
  });

  // Resultados públicos y no personalizados: el edge de Vercel puede
  // cachearlos brevemente (s-maxage) para absorber picos de tráfico
  // repetido sin pegarle a la función en cada request idéntico.
  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300" },
  });
}
