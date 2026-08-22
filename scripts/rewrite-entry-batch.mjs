import fs from "node:fs";

const wordsPath = "data/words.ts";
const anchorsPath = "data/anclas-significados.txt";
const batchSize = 100;
const start = Number(process.argv[2] ?? 0);
const normalize = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim();
const entryPattern = /^(\s*)\{ word: "((?:\\.|[^"\\])*)", meaning: "((?:\\.|[^"\\])*)", category: "([^"]*)", origin: "((?:\\.|[^"\\])*)", example: "((?:\\.|[^"\\])*)" \},?$/;
const parseString = (value) => JSON.parse(`"${value}"`);
const serialize = (value) => JSON.stringify(value);
const stripPunctuation = (value) => value.replace(/[.!?]+$/, "").trim();

const anchors = new Map();
for (const line of fs.readFileSync(anchorsPath, "utf8").split(/\r?\n/).filter(Boolean)) {
  const separator = line.indexOf("=>");
  if (separator >= 0) anchors.set(normalize(line.slice(0, separator)), stripPunctuation(line.slice(separator + 2)));
}

const lines = fs.readFileSync(wordsPath, "utf8").split("\n");
const entries = lines.map((line, index) => ({ line, index, match: line.match(entryPattern) })).filter(({ match }) => match);
const batch = entries.slice(start, start + batchSize);
const summary = { processed: batch.length, rewritten: 0, review: [], samples: [] };

function meaningFromAnchor(anchor) {
  const value = anchor.trim();
  return value ? value[0].toLocaleUpperCase("es") + value.slice(1) + (/[.!?]$/.test(value) ? "" : ".") : "Significado pendiente de revisión.";
}

function originFromAnchor(word, anchor, category) {
  const categoryText = { inmigracion: "las lenguas de la inmigración", tango: "el tango y el habla de conventillo", bajofondo: "la conversación de calle", cotidiano: "la vida cotidiana porteña", vesre: "el juego del vesre", indigena: "el contacto con lenguas indígenas", tumbero: "el lunfardo delictivo y carcelario" }[category] ?? "el repertorio lunfardo";
  return `La voz circula en ${categoryText} con el sentido de ${anchor.toLocaleLowerCase()}. Su origen puntual no siempre quedó registrado y puede haber cambiado según la época y el barrio.`;
}

function exampleFromAnchor(word, anchor) {
  return `"En esa charla, usó «${word.toLocaleLowerCase()}» para referirse a ${anchor.toLocaleLowerCase()}."`;
}

for (const { line, index, match } of batch) {
  const indent = match[1];
  const word = parseString(match[2]);
  const category = match[4];
  const anchor = anchors.get(normalize(word));
  if (!anchor) {
    lines[index] = `${indent}// REVISAR: no hay ancla para ${word}\n${line}`;
    summary.review.push(word);
    continue;
  }
  const meaning = meaningFromAnchor(anchor);
  const origin = originFromAnchor(word, anchor, category);
  const example = exampleFromAnchor(word, anchor);
  lines[index] = `${indent}{ word: ${serialize(word)}, meaning: ${serialize(meaning)}, category: ${serialize(category)}, origin: ${serialize(origin)}, example: ${serialize(example)} },`;
  summary.rewritten += 1;
  if (summary.samples.length < 5) summary.samples.push({ word, meaning, origin, example });
}

fs.writeFileSync(wordsPath, lines.join("\n"));
console.log(JSON.stringify({ ...summary, start, next: start + batch.length }, null, 2));
