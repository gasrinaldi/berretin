import fs from "node:fs";

const wordsPath = "data/words.ts";
const sources = ["data/origenes-reales-lote1.txt", "data/origenes-reales-lote2.txt"];
const normalize = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim();
const entryPattern = /^(\s*)\{ word: "((?:\\.|[^"\\])*)", meaning: "((?:\\.|[^"\\])*)", category: "([^"]*)", origin: "((?:\\.|[^"\\])*)", example: "((?:\\.|[^"\\])*)" \},?$/;
const parseString = (value) => JSON.parse(`"${value}"`);
const quote = (value) => JSON.stringify(value);
const sourceByWord = new Map();
const sourceLabels = new Set();

for (const file of sources) {
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean)) {
    const separator = line.indexOf("=>");
    if (separator < 0) continue;
    const label = line.slice(0, separator).trim();
    const origin = line.slice(separator + 2).trim();
    for (const alias of label.split(/\s*\/\s*/)) {
      sourceByWord.set(normalize(alias), origin);
      sourceLabels.add(alias);
    }
  }
}

const genericOrigin = /^La voz circula en .+ con el sentido de .+ Su origen puntual no siempre quedó registrado y puede haber cambiado según la época y el barrio\.$/;
const honestOrigins = [
  "No hay una etimología puntual documentada para esta voz. Su sentido se consolidó en el habla rioplatense y pudo cambiar al pasar entre barrios, oficios y generaciones.",
  "El origen específico no está establecido con seguridad. La palabra pertenece al repertorio popular porteño, donde las voces suelen mezclarse y transformarse con el uso.",
  "No se conserva una explicación etimológica concluyente. Su recorrido parece propio de la conversación urbana y el significado quedó fijado por la práctica cotidiana.",
  "La documentación disponible no permite atribuirle una raíz única. Es una voz del lunfardo rioplatense, moldeada por la circulación oral y por los cambios de época.",
  "Su procedencia exacta permanece incierta. La palabra circuló en registros populares y su forma actual responde más al uso sostenido que a una historia escrita precisa.",
  "No hay consenso sobre el origen de esta entrada. Puede leerse como parte del vocabulario urbano que se armó entre la calle, el trabajo y la conversación porteña.",
  "La etimología no está documentada con suficiente precisión. Lo comprobable es su arraigo en el habla popular rioplatense y la variación de sus matices según el contexto.",
  "El origen de esta voz es incierto y no conviene adjudicarle una historia única. Su permanencia se explica por el uso oral dentro del repertorio lunfardo.",
];

function realOrigin(word, source) {
  const fact = source.replace(/[.!?]+$/, "").trim();
  return `La investigación etimológica vincula «${word}» con ${fact.toLocaleLowerCase()}. El término habría llegado o tomado su sentido lunfardo al circular por el habla popular porteña, aunque ese proceso no siempre puede fecharse con exactitud.`;
}

const lines = fs.readFileSync(wordsPath, "utf8").split("\n");
const updatedReal = [];
let genericUpdated = 0;
let entryIndex = 0;
for (let index = 0; index < lines.length; index += 1) {
  const match = lines[index].match(entryPattern);
  if (!match) continue;
  const indent = match[1];
  const word = parseString(match[2]);
  const category = match[4];
  const origin = parseString(match[5]);
  const realSource = sourceByWord.get(normalize(word));
  let nextOrigin = origin;
  if (realSource) {
    nextOrigin = realOrigin(word, realSource);
    updatedReal.push(word);
  } else if (genericOrigin.test(origin)) {
    nextOrigin = honestOrigins[(entryIndex + category.length) % honestOrigins.length];
    genericUpdated += 1;
  }
  if (nextOrigin !== origin) {
    lines[index] = `${indent}{ word: ${quote(word)}, meaning: ${quote(parseString(match[3]))}, category: ${quote(category)}, origin: ${quote(nextOrigin)}, example: ${quote(parseString(match[6]))} },`;
  }
  entryIndex += 1;
}

fs.writeFileSync(wordsPath, lines.join("\n"));
console.log(JSON.stringify({ updatedReal: updatedReal.length, words: updatedReal, genericOriginsUpdated: genericUpdated, sourceLabels: [...sourceLabels] }, null, 2));
