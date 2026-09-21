"use server";

import { getAllEntries } from "@/lib/dictionary";

// Selección de términos para una ronda de "¿Todavía se usa?": siempre a
// partir del dataset local (getAllEntries, el mismo que usa el
// diccionario/sitemap) — nunca Supabase. Un shuffle simple alcanza para
// mezclar términos conocidos y menos conocidos sin necesitar una señal de
// popularidad que el dataset no tiene.
export type RoundTerm = { slug: string; palabra: string };

const ROUND_SIZE = 10;

function shuffle<T>(list: T[]): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// excludeSlugs: términos de la ronda anterior, para que "jugar otra vez"
// traiga otros cuando sea posible. Con ~15.000 entradas excluir 10 nunca
// deja el pool corto, pero el fallback evita romper si algún día el
// dataset fuera chico.
export async function getRoundTerms(excludeSlugs: string[] = []): Promise<RoundTerm[]> {
  const entries = getAllEntries();
  const excludeSet = new Set(excludeSlugs);
  const pool = entries.filter((entry) => !excludeSet.has(entry.slug));
  const source = pool.length >= ROUND_SIZE ? pool : entries;
  return shuffle(source)
    .slice(0, ROUND_SIZE)
    .map((entry) => ({ slug: entry.slug, palabra: entry.palabra }));
}
