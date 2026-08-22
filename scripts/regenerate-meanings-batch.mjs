import fs from "node:fs";

const wordsPath = "data/words.ts";
const anchorsPath = "data/anclas-significados.txt";
const batchSize = 50;
const genericMeanings = new Set([
  "voz lunfarda de uso popular, cuyo sentido preciso depende del contexto",
  "hacer o llevar adelante una acción, en registro lunfardo",
  "que está marcado por una acción o estado determinado",
  "actuar o quedar en un estado que expresa la voz popular",
  "acción, situación o resultado nombrado en el habla popular",
  "persona que realiza con frecuencia una acción",
]);

const normalize = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim();
const cleanAnchor = (value) => value.replace(/[.!?]+$/, "").trim().toLocaleLowerCase("es");
const quote = (value) => value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
const entryPattern = /^(\s*\{ word: )"((?:\\.|[^"\\])*)"(, meaning: )"((?:\\.|[^"\\])*)"(, category: )"([^"]*)"(, origin: )"((?:\\.|[^"\\])*)"(, example: )"((?:\\.|[^"\\])*)"( \},?)$/;

const anchors = new Map();
for (const line of fs.readFileSync(anchorsPath, "utf8").split(/\r?\n/).filter(Boolean)) {
  const separator = line.indexOf("=>");
  if (separator < 0) continue;
  anchors.set(normalize(line.slice(0, separator)), line.slice(separator + 2).trim());
}

const lines = fs.readFileSync(wordsPath, "utf8").split("\n");
const candidates = lines.map((line, index) => ({ line, index }))
  .filter(({ line }) => genericMeanings.has(line.match(/meaning: "([^"]*)"/)?.[1] ?? ""));
const batch = candidates.slice(0, batchSize);
const summary = { processed: batch.length, updated: 0, review: 0, missing: [] };

for (const { line, index } of batch) {
  const parsed = line.match(entryPattern);
  if (!parsed) {
    throw new Error(`No se pudo parsear la entrada en línea ${index + 1}`);
  }
  const prefix = parsed[1];
  const word = parsed[2];
  const meaningPrefix = parsed[3];
  const categoryPrefix = parsed[5];
  const category = parsed[6];
  const originPrefix = parsed[7];
  const origin = parsed[8];
  const examplePrefix = parsed[9];
  const suffix = parsed[11];
  const anchor = anchors.get(normalize(word));
  if (!anchor) {
    lines[index] = `${prefix}"${word}"${meaningPrefix}"significado pendiente de revisión"${categoryPrefix}"${category}"${originPrefix}"${origin}"${examplePrefix}"Uso pendiente de revisión para «${quote(word.toLocaleLowerCase("es"))}."${suffix}`;
    summary.review += 1;
    summary.missing.push(word);
    continue;
  }
  const meaning = `En el habla lunfarda, refiere a ${cleanAnchor(anchor)}.`;
  const example = `En la charla, lo usó con el sentido de «${quote(cleanAnchor(anchor))}».`;
  lines[index] = `${prefix}"${word}"${meaningPrefix}"${quote(meaning)}"${categoryPrefix}"${category}"${originPrefix}"${origin}"${examplePrefix}"${quote(example)}"${suffix}`;
  summary.updated += 1;
}

fs.writeFileSync(wordsPath, lines.join("\n"));
console.log(JSON.stringify(summary, null, 2));
