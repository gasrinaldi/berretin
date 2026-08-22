#!/usr/bin/env node
// Importador reutilizable del diccionario de Berretín.
// Formato de entrada esperado por línea: "término => definición"
// (el separador válido es la PRIMERA aparición de "=>"; el resto de la
// línea, completo, pasa a ser la definición).
//
// Uso:
//   node scripts/import-dictionary.mjs <archivoA> <cantidadA> <archivoB> <cantidadB> <archivoC> <cantidadC>
//
// El script valida todo antes de tocar data/words.ts. Si algo no cierra,
// no escribe nada y termina con código de salida distinto de 0.

import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const wordsPath = resolve(projectRoot, "data/words.ts");

function fail(message) {
  console.error(`\n✗ IMPORTACIÓN DETENIDA: ${message}\n`);
  process.exit(1);
}

// Pliega solo los acentos de las vocales (á/é/í/ó/ú/ü) para la comparación
// de duplicados. La "ñ" NO se toca: es una letra propia del español, no una
// variante acentuada de "n" (p. ej. "cana" y "caña" son palabras distintas).
const VOWEL_ACCENTS = { á: "a", é: "e", í: "i", ó: "o", ú: "u", ü: "u" };

function normalizeForCompare(term) {
  return term
    .trim()
    .toLocaleLowerCase("es")
    .replace(/[áéíóúü]/g, (char) => VOWEL_ACCENTS[char]);
}

// Parsea un archivo "término => definición" y devuelve las entradas válidas.
// Cualquier línea sin "=>" (encabezados, notas, líneas vacías) se ignora.
function parseFile(path, label) {
  if (!existsSync(path)) {
    fail(`no encontré el archivo de la letra ${label}: ${path}`);
  }
  const raw = readFileSync(path, "utf-8");
  const lines = raw.split(/\r?\n/);
  const entries = [];
  const invalid = [];

  lines.forEach((line, index) => {
    const arrowIndex = line.indexOf("=>");
    if (arrowIndex === -1) return; // encabezado, nota o línea vacía: se ignora

    const term = line.slice(0, arrowIndex).trim();
    const meaning = line.slice(arrowIndex + 2).trim();

    if (!term || !meaning) {
      invalid.push({ line: index + 1, raw: line });
      return;
    }
    entries.push({ word: term, meaning, sourceFile: label, sourceLine: index + 1 });
  });

  if (invalid.length > 0) {
    const sample = invalid.slice(0, 5).map((e) => `  línea ${e.line}: "${e.raw}"`).join("\n");
    fail(`letra ${label}: ${invalid.length} línea(s) con "=>" pero término o definición vacíos.\n${sample}`);
  }

  return entries;
}

function main() {
  const [fileA, countAArg, fileB, countBArg, fileC, countCArg] = process.argv.slice(2);
  if (!fileA || !countAArg || !fileB || !countBArg || !fileC || !countCArg) {
    fail(
      "faltan argumentos. Uso: node scripts/import-dictionary.mjs <archivoA> <cantidadA> <archivoB> <cantidadB> <archivoC> <cantidadC>"
    );
  }

  const expectedA = Number(countAArg);
  const expectedB = Number(countBArg);
  const expectedC = Number(countCArg);

  const entriesA = parseFile(resolve(fileA), "A");
  const entriesB = parseFile(resolve(fileB), "B");
  const entriesCRaw = parseFile(resolve(fileC), "C");

  if (entriesA.length !== expectedA) {
    fail(`letra A: se esperaban ${expectedA} entradas y se encontraron ${entriesA.length}.`);
  }
  if (entriesB.length !== expectedB) {
    fail(`letra B: se esperaban ${expectedB} entradas y se encontraron ${entriesB.length}.`);
  }
  if (entriesCRaw.length < expectedC) {
    fail(`letra C: se esperaban al menos ${expectedC} entradas y solo se encontraron ${entriesCRaw.length}.`);
  }

  const entriesC = entriesCRaw.slice(0, expectedC);

  const all = [...entriesA, ...entriesB, ...entriesC];
  const expectedTotal = expectedA + expectedB + expectedC;
  if (all.length !== expectedTotal) {
    fail(`el total no cierra: se esperaban ${expectedTotal} y se armaron ${all.length}.`);
  }

  // Duplicados: se compara normalizando (minúsculas + sin acentos) SOLO
  // para la comparación; el término guardado nunca se toca.
  const seen = new Map();
  const duplicates = [];
  for (const entry of all) {
    const key = normalizeForCompare(entry.word);
    if (seen.has(key)) {
      const prev = seen.get(key);
      duplicates.push(
        `  "${prev.word}" (letra ${prev.sourceFile}, línea ${prev.sourceLine}) y "${entry.word}" (letra ${entry.sourceFile}, línea ${entry.sourceLine})`
      );
    } else {
      seen.set(key, entry);
    }
  }
  if (duplicates.length > 0) {
    fail(`se encontraron ${duplicates.length} término(s) duplicado(s) tras normalizar:\n${duplicates.join("\n")}`);
  }

  // Todo validado. Backup del archivo actual antes de escribir nada.
  const backupsDir = resolve(projectRoot, "data/backups");
  mkdirSync(backupsDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = resolve(backupsDir, `words.pre-import-${timestamp}.ts`);
  if (existsSync(wordsPath)) {
    copyFileSync(wordsPath, backupPath);
  }

  const header = `// Diccionario de Berretín — generado por scripts/import-dictionary.mjs
// Orden de importación: letra A, luego B, luego C.
// La visualización (orden alfabético, agrupación por letra) se calcula
// en tiempo de ejecución en components/Dictionary.tsx; este orden físico
// de inserción no tiene efecto en lo que ve el usuario.

export type Word = {
  word: string;
  meaning: string;
};

export const words: Word[] = [
`;

  const body = all
    .map((entry) => `  { word: ${JSON.stringify(entry.word)}, meaning: ${JSON.stringify(entry.meaning)} },`)
    .join("\n");

  const footer = `\n];\n`;

  const tmpPath = `${wordsPath}.tmp`;
  writeFileSync(tmpPath, header + body + footer, "utf-8");
  renameSync(tmpPath, wordsPath);

  console.log("\n✓ Importación completa.\n");
  console.log(`  A: ${entriesA.length} entradas`);
  console.log(`  B: ${entriesB.length} entradas`);
  console.log(`  C: ${entriesC.length} entradas`);
  console.log(`  Total: ${all.length} entradas`);
  console.log(`  Backup: ${backupPath}`);
  console.log(`  Archivo generado: ${wordsPath}\n`);
}

main();
