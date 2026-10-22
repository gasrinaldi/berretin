// Precalcula el índice del diccionario (orden alfabético, slugs y
// desambiguación por hash) y lo escribe en data/dictionary-index.json, que
// es lo único que carga lib/dictionary.ts en runtime. Antes ese trabajo
// (sort con localeCompare sobre ~15.000 entradas, sha1 de los slugs
// repetidos, normalización) se repetía en cada cold start de cualquier
// función que importara el diccionario.
//
// Corre solo: `npm run build` dispara `prebuild` y `npm run dev` dispara
// `predev`. El archivo generado está en .gitignore. Las reglas son
// EXACTAMENTE las que vivían en lib/dictionary.ts (buildAll): mismos slugs
// y mismo orden — cambiarlas cambia todas las URLs de /diccionario/*.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const inPath = resolve(root, "data/dictionary.json");
const outPath = resolve(root, "data/dictionary-index.json");

// Ignora signos iniciales para ordenar.
function sortKey(word) {
  return word.replace(/^[^\p{L}]+/u, "") || word;
}
function stripAccents(value) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}
function slugifyWord(value) {
  return (
    stripAccents(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "entrada"
  );
}
// Identificador corto y determinístico (derivado del id ya estable de la
// entrada) para desambiguar slugs que colisionan, sin depender de la
// posición en el array — no cambia si se reordena o actualiza el dataset.
function shortHash(id) {
  return createHash("sha1").update(id).digest("hex").slice(0, 5);
}

const raw = JSON.parse(readFileSync(inPath, "utf8"));
const sorted = [...raw].sort((a, b) => sortKey(a.palabra).localeCompare(sortKey(b.palabra), "es"));

const baseSlugs = sorted.map((e) => slugifyWord(e.palabra));
const freq = new Map();
for (const s of baseSlugs) freq.set(s, (freq.get(s) ?? 0) + 1);

const used = new Set();
const index = sorted.map((e, i) => {
  const base = baseSlugs[i];
  let slug = (freq.get(base) ?? 0) > 1 ? `${base}-${shortHash(e.id)}` : base;
  while (used.has(slug)) slug = `${slug}x`;
  used.add(slug);
  return {
    id: e.id,
    slug,
    palabra: e.palabra,
    definicion: e.definicion,
    letra: e.letra,
    categorias: e.categorias,
    origenes: e.origenes,
    busquedaNormalizada: e.busquedaNormalizada,
  };
});

writeFileSync(outPath, JSON.stringify(index));
console.log(`[dictionary-index] ${index.length} entradas -> data/dictionary-index.json`);
