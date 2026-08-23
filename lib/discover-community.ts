import { unstable_cache } from "next/cache";
import { getSupabaseAdmin, CONTRIBUTIONS_BUCKET } from "@/lib/supabase-admin";
import { getEntryBySlug } from "@/lib/dictionary";

// Todo lo de este módulo lee datos ya existentes (regiones asignadas a
// mano desde /admin/regiones, aportes generacionales aprobados, votos,
// ilustraciones aprobadas) — nada se infiere ni se inventa acá. Cada
// función queda envuelta en unstable_cache para no pegarle a Supabase en
// cada visita a /descubrir: el resto de la página es dynamic (palabra del
// día, aleatoria, quiz), pero estas consultas se revalidan solas cada
// pocos minutos, igual que /desafio y /perfil/[alias].
const REVALIDATE_SECONDS = 300;
const WEEKLY_REVALIDATE_SECONDS = 3600;
const WEEKLY_THUMB_TTL_SECONDS = 3600;

type WordRef = { wordSlug: string; word: string };

export type RegionGroup = { region: string; words: WordRef[] };
export type DecadeGroup = { decade: string; words: WordRef[] };
export type TrendingWord = { wordSlug: string; word: string; voteCount: number; contributionCount: number };
export type WeeklyIllustration = { contributionId: string; wordSlug: string; word: string; thumbnailSignedUrl: string };

async function fetchRegionGroups(): Promise<RegionGroup[]> {
  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return [];
  }

  const { data, error } = await supabase.from("word_regions").select("word_slug, word, region").order("region", { ascending: true });
  if (error || !data) return [];

  const groups = new Map<string, WordRef[]>();
  for (const row of data) {
    const list = groups.get(row.region) ?? [];
    list.push({ wordSlug: row.word_slug, word: row.word });
    groups.set(row.region, list);
  }
  return [...groups.entries()].map(([region, words]) => ({ region, words }));
}
export const getRegionGroups = unstable_cache(fetchRegionGroups, ["descubrir-map"], { revalidate: REVALIDATE_SECONDS });

async function fetchDecadeGroups(): Promise<DecadeGroup[]> {
  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return [];
  }

  const { data, error } = await supabase
    .from("word_contributions")
    .select("word_slug, word, decade")
    .eq("status", "approved")
    .eq("type", "generational")
    .not("decade", "is", null)
    .order("created_at", { ascending: false })
    .limit(300);
  if (error || !data) return [];

  const groups = new Map<string, WordRef[]>();
  for (const row of data) {
    const decade = (row.decade ?? "").trim();
    if (!decade) continue;
    const list = groups.get(decade) ?? [];
    if (!list.some((w) => w.wordSlug === row.word_slug)) list.push({ wordSlug: row.word_slug, word: row.word });
    groups.set(decade, list);
  }
  return [...groups.entries()].map(([decade, words]) => ({ decade, words })).sort((a, b) => a.decade.localeCompare(b.decade, "es"));
}
export const getDecadeGroups = unstable_cache(fetchDecadeGroups, ["descubrir-decades"], { revalidate: REVALIDATE_SECONDS });

// "Tendencia" = actividad real reciente (votos "¿todavía se usa?" +
// aportes aprobados) en los últimos 30 días. No hay ningún contador de
// visitas ni tracking nuevo: solo se leen las dos tablas que ya existían.
async function fetchTrendingWords(): Promise<TrendingWord[]> {
  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return [];
  }

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [{ data: votes }, { data: contributions }] = await Promise.all([
    supabase.from("word_votes").select("word_slug").gte("created_at", since).limit(1000),
    supabase.from("word_contributions").select("word_slug").eq("status", "approved").gte("created_at", since).limit(1000),
  ]);

  const counts = new Map<string, { voteCount: number; contributionCount: number }>();
  for (const row of votes ?? []) {
    const entry = counts.get(row.word_slug) ?? { voteCount: 0, contributionCount: 0 };
    entry.voteCount += 1;
    counts.set(row.word_slug, entry);
  }
  for (const row of contributions ?? []) {
    const entry = counts.get(row.word_slug) ?? { voteCount: 0, contributionCount: 0 };
    entry.contributionCount += 1;
    counts.set(row.word_slug, entry);
  }

  return [...counts.entries()]
    .map(([wordSlug, c]) => {
      const entry = getEntryBySlug(wordSlug);
      return entry ? { wordSlug, word: entry.palabra, voteCount: c.voteCount, contributionCount: c.contributionCount } : null;
    })
    .filter((v): v is TrendingWord => v !== null)
    .sort((a, b) => b.voteCount + b.contributionCount * 2 - (a.voteCount + a.contributionCount * 2))
    .slice(0, 10);
}
export const getTrendingWords = unstable_cache(fetchTrendingWords, ["descubrir-trends"], { revalidate: REVALIDATE_SECONDS });

// Hash estable (FNV-1a) de la semana ISO actual, igual que el de palabra
// del día pero con clave semanal: misma ilustración para todos durante
// toda la semana, cambia la semana siguiente.
function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}
function hashToIndex(seed: string, length: number): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return length > 0 ? Math.abs(hash) % length : 0;
}

async function fetchWeeklyIllustration(): Promise<WeeklyIllustration | null> {
  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return null;
  }

  const { data, error } = await supabase
    .from("word_contributions")
    .select("id, word_slug, word, thumbnail_path")
    .eq("status", "approved")
    .in("type", ["illustration", "photo"])
    .not("thumbnail_path", "is", null)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error || !data || data.length === 0) return null;

  const chosen = data[hashToIndex(isoWeekKey(new Date()), data.length)];
  if (!chosen.thumbnail_path) return null;

  // Siempre la miniatura (thumbnail_path) — nunca la imagen optimizada
  // completa (image_path), que solo se firma bajo pedido explícito.
  const { data: signed } = await supabase.storage.from(CONTRIBUTIONS_BUCKET).createSignedUrl(chosen.thumbnail_path, WEEKLY_THUMB_TTL_SECONDS);
  if (!signed?.signedUrl) return null;

  return { contributionId: chosen.id, wordSlug: chosen.word_slug, word: chosen.word, thumbnailSignedUrl: signed.signedUrl };
}
export const getWeeklyIllustration = unstable_cache(fetchWeeklyIllustration, ["descubrir-illustration"], { revalidate: WEEKLY_REVALIDATE_SECONDS });
