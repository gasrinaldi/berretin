import { NextRequest, NextResponse } from "next/server";
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

export type DictionaryEntry = Omit<RawEntry, "busquedaNormalizada">;

// Se pliega solo signos iniciales para ordenar, igual que en Dictionary.tsx,
// así el orden que entrega la API ya viene listo para agrupar por letra.
function sortKey(word: string) {
  return word.replace(/^[^\p{L}]+/u, "") || word;
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// Se ordena una sola vez al arrancar la función serverless (no en cada
// request): filter() preserva el orden relativo, así que el resultado
// filtrado sigue alfabético sin tener que reordenar por request.
const ALL: RawEntry[] = [...(dictionaryData as RawEntry[])].sort((a, b) =>
  sortKey(a.palabra).localeCompare(sortKey(b.palabra), "es")
);

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = normalize(searchParams.get("q")?.trim() ?? "");
  const letras = searchParams.getAll("letra");
  const categorias = searchParams.getAll("categoria");
  const origenes = searchParams.getAll("origen");
  const sinCategoria = searchParams.get("sinCategoria") === "1";
  const page = Math.max(0, Math.floor(Number(searchParams.get("page") ?? "0")) || 0);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(Number(searchParams.get("limit") ?? String(DEFAULT_LIMIT))) || DEFAULT_LIMIT));

  let filtered = ALL;
  if (q) filtered = filtered.filter((e) => e.busquedaNormalizada.includes(q));
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
  const start = page * limit;
  const results: DictionaryEntry[] = filtered.slice(start, start + limit).map((entry) => {
    const { id, palabra, definicion, letra, categorias, origenes } = entry;
    return { id, palabra, definicion, letra, categorias, origenes };
  });
  const hasMore = start + limit < total;

  return NextResponse.json({ results, total, hasMore, page, countsByLetter });
}
