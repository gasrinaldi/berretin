#!/usr/bin/env node
// Importador definitivo del diccionario completo A-Z de Berretín.
// Fuentes: data/words.ts (A y B existentes, sin cambios) + los 24 archivos
// TXT de /Users/gast/Desktop/diccionario berretin/ (C completo + D..Z).
// Genera data/dictionary.json (dataset completo, server-only) y
// data/dictionary-facets.json (conteos livianos para la UI de filtros).
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const wordsPath = resolve(root, "data/words.ts");
const outPath = resolve(root, "data/dictionary.json");
const facetsPath = resolve(root, "data/dictionary-facets.json");
const backupDir = resolve(root, "data/backups");
const SRC_DIR = "/Users/gast/Desktop/diccionario berretin";

const CATEGORIES = [
  "Uso popular", "Lunfardo", "Fútbol", "Deportes", "Turf", "Música",
  "Jerga delictiva", "Jerga carcelaria", "Jerga vinculada con drogas",
  "Habla rural", "Uso médico popular",
];
const ORIGINS = [
  "Voz de origen italiano", "Voz de origen inglés",
  "Voz de origen francés", "Voz de origen alemán",
];

function normalizeTag(tag) {
  return stripAccents(tag.trim()).toLowerCase();
}
const CATEGORY_LOOKUP = new Map(CATEGORIES.map((c) => [normalizeTag(c), c]));
const ORIGIN_LOOKUP = new Map(ORIGINS.map((o) => [normalizeTag(o), o]));

function stripAccents(value) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}
function normalizeSearch(value) {
  return stripAccents(value).toLowerCase();
}
// Para detectar duplicados entre C parcial y C nueva: pliega solo vocales
// acentuadas, nunca la ñ (es letra propia, no una variante de "n") — misma
// regla que components/Dictionary.tsx usa para agrupar por letra.
const VOWEL_ACCENTS = { á: "a", é: "e", í: "i", ó: "o", ú: "u", ü: "u" };
function dedupeKey(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[áéíóúü]/g, (m) => VOWEL_ACCENTS[m]);
}
function slugify(value) {
  return (
    stripAccents(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "entrada"
  );
}

function fail(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

const report = [];
const unknownTags = new Set();

function parseDefinition(raw) {
  const match = raw.match(/^\[([^\]]+)\]\s*(.*)$/s);
  if (!match) return { categorias: [], origenes: [], definicion: raw.trim() };
  const tags = match[1].split(";").map((t) => t.trim()).filter(Boolean);
  const categorias = [];
  const origenes = [];
  for (const tag of tags) {
    const key = normalizeTag(tag);
    if (CATEGORY_LOOKUP.has(key)) categorias.push(CATEGORY_LOOKUP.get(key));
    else if (ORIGIN_LOOKUP.has(key)) origenes.push(ORIGIN_LOOKUP.get(key));
    else {
      unknownTags.add(tag);
      categorias.push(tag);
    }
  }
  return { categorias, origenes, definicion: match[2].trim() };
}

function parseFile(path, letra, expectedCount) {
  if (!existsSync(path)) fail(`No encontré el archivo de la letra ${letra}: ${path}`);
  const raw = readFileSync(path, "utf-8");
  const lines = raw.split(/\r?\n/);
  const entries = [];
  const invalid = [];
  lines.forEach((line, idx) => {
    const arrow = line.indexOf(" => ");
    if (arrow === -1) {
      if (line.trim()) invalid.push({ line: idx + 1, raw: line, reason: "sin separador ' => '" });
      return;
    }
    const term = line.slice(0, arrow).trim();
    const rest = line.slice(arrow + 4).trim();
    if (!term || !rest) {
      invalid.push({ line: idx + 1, raw: line, reason: "palabra o definición vacía" });
      return;
    }
    const { categorias, origenes, definicion } = parseDefinition(rest);
    if (!definicion) {
      invalid.push({ line: idx + 1, raw: line, reason: "definición vacía tras extraer etiquetas" });
      return;
    }
    entries.push({ palabra: term, definicion, categorias, origenes, letra });
  });

  if (invalid.length > 0) {
    report.push(`⚠️  ${letra}: ${invalid.length} línea(s) no parseadas (revisar, no se descartaron silenciosamente):`);
    for (const e of invalid.slice(0, 15)) report.push(`    línea ${e.line} (${e.reason}): "${e.raw}"`);
  }
  if (expectedCount != null && entries.length !== expectedCount) {
    report.push(`⚠️  ${letra}: se esperaban ${expectedCount} entradas (según nombre de archivo), se parsearon ${entries.length}.`);
  }
  return entries;
}

// ---- 1. A y B desde data/words.ts (no vinieron en los TXT nuevos) ----
const wordsSrc = readFileSync(wordsPath, "utf-8");
const existingMatches = [...wordsSrc.matchAll(/\{ word: "((?:[^"\\]|\\.)*)", meaning: "((?:[^"\\]|\\.)*)" \}/g)];
const EXISTING_A_COUNT = 1178;
const EXISTING_B_COUNT = 791;
const EXISTING_C_COUNT = 400;
if (existingMatches.length !== EXISTING_A_COUNT + EXISTING_B_COUNT + EXISTING_C_COUNT) {
  fail(
    `data/words.ts tiene ${existingMatches.length} entradas, esperaba ${
      EXISTING_A_COUNT + EXISTING_B_COUNT + EXISTING_C_COUNT
    } (A+B+C parcial). Abortando para no corromper el dataset.`
  );
}
const existingEntries = existingMatches.map((m) => ({
  palabra: JSON.parse(`"${m[1]}"`),
  meaning: JSON.parse(`"${m[2]}"`),
}));
const existingA = existingEntries
  .slice(0, EXISTING_A_COUNT)
  .map((e) => ({ palabra: e.palabra, definicion: e.meaning, categorias: [], origenes: [], letra: "A" }));
const existingB = existingEntries
  .slice(EXISTING_A_COUNT, EXISTING_A_COUNT + EXISTING_B_COUNT)
  .map((e) => ({ palabra: e.palabra, definicion: e.meaning, categorias: [], origenes: [], letra: "B" }));
const oldPartialC = existingEntries.slice(EXISTING_A_COUNT + EXISTING_B_COUNT).map((e) => {
  const { categorias, origenes, definicion } = parseDefinition(e.meaning);
  return { palabra: e.palabra, definicion, categorias, origenes, letra: "C" };
});

// ---- 2. C: decidir reemplazo total vs combinación ----
const newCPath = resolve(SRC_DIR, "berretin_diccionario_C_definiciones_originales_1868.txt");
const newCEntries = parseFile(newCPath, "C", 1868);

let finalC;
let cTreatment;
if (newCEntries.length === 1868) {
  finalC = newCEntries;
  cTreatment = `Reemplazo total: el archivo nuevo trae las 1.868 entradas completas y definitivas de C. Se descartaron las ${oldPartialC.length} entradas parciales anteriores (no se concatenaron).`;
} else {
  const seen = new Set();
  const merged = [];
  for (const e of oldPartialC) {
    const key = dedupeKey(e.palabra);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(e);
    }
  }
  let overlap = 0;
  for (const e of newCEntries) {
    const key = dedupeKey(e.palabra);
    if (seen.has(key)) {
      overlap++;
      continue;
    }
    seen.add(key);
    merged.push(e);
  }
  finalC = merged;
  cTreatment = `Combinación: el archivo nuevo (${newCEntries.length}) no llega a 1.868, se tomó como remanente. Se combinó con las ${oldPartialC.length} entradas parciales anteriores, evitando ${overlap} superposición(es) por palabra normalizada. Total C: ${finalC.length}.`;
}

// ---- 3. Resto de letras D..Z ----
const LETTER_FILES = {
  D: ["berretin_diccionario_D_definiciones_originales_641.txt", 641],
  E: ["berretin_diccionario_E_definiciones_originales_1059.txt", 1059],
  F: ["berretin_diccionario_F_definiciones_originales_540.txt", 540],
  G: ["berretin_diccionario_G_definiciones_originales_539.txt", 539],
  H: ["berretin_diccionario_H_definiciones_originales_386.txt", 386],
  I: ["berretin_diccionario_I_definiciones_originales_186.txt", 186],
  J: ["berretin_diccionario_J_definiciones_originales_214.txt", 214],
  K: ["berretin_diccionario_K_definiciones_originales_40.txt", 40],
  L: ["berretin_diccionario_L_definiciones_originales_596.txt", 596],
  M: ["berretin_diccionario_M_definiciones_originales_1117.txt", 1117],
  N: ["berretin_diccionario_N_definiciones_originales_273.txt", 273],
  O: ["berretin_diccionario_O_definiciones_originales_168.txt", 168],
  P: ["berretin_diccionario_P_definiciones_originales_1634.txt", 1634],
  Q: ["berretin_diccionario_Q_definiciones_originales_181.txt", 181],
  R: ["berretin_diccionario_R_definiciones_originales_705.txt", 705],
  S: ["berretin_diccionario_S_definiciones_originales_950.txt", 950],
  T: ["berretin_diccionario_T_definiciones_originales_1113.txt", 1113],
  U: ["berretin_diccionario_U_definiciones_originales_87.txt", 87],
  V: ["berretin_diccionario_V_definiciones_originales_420.txt", 420],
  W: ["berretin_diccionario_W_definiciones_originales_25.txt", 25],
  X: ["berretin_diccionario_X_definiciones_originales_3.txt", 3],
  Y: ["berretin_diccionario_Y_definiciones_originales_115.txt", 115],
  Z: ["berretin_diccionario_Z_definiciones_originales_142.txt", 142],
};

const otherEntries = [];
const perLetterCount = {};
for (const [letra, [filename, count]] of Object.entries(LETTER_FILES)) {
  const entries = parseFile(resolve(SRC_DIR, filename), letra, count);
  perLetterCount[letra] = entries.length;
  otherEntries.push(...entries);
}

// ---- 4. Unificar, asignar IDs estables y búsqueda normalizada ----
const all = [...existingA, ...existingB, ...finalC, ...otherEntries];

const idCounts = new Map();
function makeId(letra, palabra) {
  const base = `${letra.toLowerCase()}-${slugify(palabra)}`;
  const n = (idCounts.get(base) ?? 0) + 1;
  idCounts.set(base, n);
  return n === 1 ? base : `${base}-${n}`;
}

const final = all.map((e) => {
  const id = makeId(e.letra, e.palabra);
  const busquedaNormalizada = normalizeSearch(
    [e.palabra, e.definicion, ...e.categorias, ...e.origenes].join(" ")
  );
  return {
    id,
    palabra: e.palabra,
    definicion: e.definicion,
    letra: e.letra,
    categorias: e.categorias,
    origenes: e.origenes,
    busquedaNormalizada,
  };
});

// ---- 5. Validaciones ----
const letters = new Set(final.map((e) => e.letra));
const missing = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").filter((l) => !letters.has(l));
if (missing.length) fail(`Faltan letras en el dataset final: ${missing.join(", ")}`);

const emptyDefs = final.filter((e) => !e.definicion || !e.palabra);
if (emptyDefs.length) fail(`${emptyDefs.length} entradas con palabra o definición vacía tras el parseo.`);

const ids = new Set();
const dupIds = [];
for (const e of final) {
  if (ids.has(e.id)) dupIds.push(e.id);
  ids.add(e.id);
}
if (dupIds.length) fail(`IDs duplicados detectados: ${dupIds.slice(0, 10).join(", ")}`);

// ---- 6. Backup de data/words.ts antes de retirarlo ----
mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
copyFileSync(wordsPath, resolve(backupDir, `words.pre-full-import-${stamp}.ts`));

// ---- 7. Escribir dataset y facets ----
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(final), "utf-8");

const categoryCounts = new Map();
const originCounts = new Map();
let sinCategoriaCount = 0;
const letterCounts = new Map();
for (const e of final) {
  letterCounts.set(e.letra, (letterCounts.get(e.letra) ?? 0) + 1);
  if (e.categorias.length === 0 && e.origenes.length === 0) sinCategoriaCount++;
  for (const c of e.categorias) categoryCounts.set(c, (categoryCounts.get(c) ?? 0) + 1);
  for (const o of e.origenes) originCounts.set(o, (originCounts.get(o) ?? 0) + 1);
}
const facets = {
  total: final.length,
  letras: Object.fromEntries([..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].map((l) => [l, letterCounts.get(l) ?? 0])),
  categorias: Object.fromEntries(CATEGORIES.map((c) => [c, categoryCounts.get(c) ?? 0]).filter(([, n]) => n > 0)),
  origenes: Object.fromEntries(ORIGINS.map((o) => [o, originCounts.get(o) ?? 0]).filter(([, n]) => n > 0)),
  sinCategoria: sinCategoriaCount,
};
writeFileSync(facetsPath, JSON.stringify(facets, null, 2), "utf-8");

// ---- 8. Reporte final ----
console.log("\n=== Importación completa del diccionario Berretín ===\n");
console.log(`Total entradas: ${final.length}`);
console.log(`Letras presentes: ${[...letters].sort().join(", ")}`);
console.log(`\nTratamiento de C: ${cTreatment}`);
console.log(`\nEtiquetas desconocidas encontradas (conservadas en categorias, no clasificadas):`);
if (unknownTags.size === 0) console.log("  (ninguna)");
else [...unknownTags].sort().forEach((t) => console.log(`  - "${t}"`));
if (report.length) {
  console.log(`\nAvisos de parseo:`);
  report.forEach((r) => console.log(r));
}
console.log(`\nArchivos generados:\n  - ${outPath}\n  - ${facetsPath}`);
console.log(`Backup de words.ts: data/backups/words.pre-full-import-${stamp}.ts\n`);
