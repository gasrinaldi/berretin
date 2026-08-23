import type { DictionaryEntry } from "@/lib/dictionary";

export type QuizOption = { text: string; correct: boolean };
export type QuizQuestion = { id: string; palabra: string; slug: string; options: QuizOption[] };
export type ThematicCollection = { categoria: string; total: number; sample: DictionaryEntry[] };

// Hash simple y estable (FNV-1a) de la fecha en formato YYYY-MM-DD: mismo
// resultado para todo el mundo el mismo día UTC, cambia al día siguiente,
// sin depender de Math.random ni de estado guardado en ningún lado.
function hashToIndex(seed: string, length: number): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return length > 0 ? Math.abs(hash) % length : 0;
}

export function pickWordOfTheDay(entries: DictionaryEntry[], date: Date = new Date()): DictionaryEntry {
  const dateKey = date.toISOString().slice(0, 10);
  return entries[hashToIndex(dateKey, entries.length)];
}

export function pickRandomEntry(entries: DictionaryEntry[]): DictionaryEntry {
  return entries[Math.floor(Math.random() * entries.length)];
}

function shuffle<T>(list: T[]): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Quiz de opción múltiple: la definición correcta y los tres distractores
// son siempre definiciones reales de otras entradas del diccionario —
// nunca texto inventado. Se descartan definiciones muy cortas para evitar
// distractores triviales (por ejemplo, entradas con una sola palabra).
export function buildQuiz(entries: DictionaryEntry[], count = 5): QuizQuestion[] {
  const pool = entries.filter((e) => e.definicion.trim().length >= 12);
  const chosen = shuffle(pool).slice(0, Math.min(count, pool.length));

  return chosen.map((entry) => {
    const distractorPool = pool.filter((e) => e.id !== entry.id && e.definicion !== entry.definicion);
    const distractors = shuffle(distractorPool).slice(0, 3);
    const options = shuffle([{ text: entry.definicion, correct: true }, ...distractors.map((d) => ({ text: d.definicion, correct: false }))]);
    return { id: entry.id, palabra: entry.palabra, slug: entry.slug, options };
  });
}

// Una colección por cada categoría real del dataset (mismas que usa
// DictionaryFilters): nunca se inventa ni se agrupa nada fuera de
// entry.categorias.
export function buildThematicCollections(entries: DictionaryEntry[], categorias: string[], sampleSize = 3): ThematicCollection[] {
  return categorias.map((categoria) => {
    const matches = entries.filter((e) => e.categorias.includes(categoria));
    return { categoria, total: matches.length, sample: shuffle(matches).slice(0, sampleSize) };
  });
}
