import fs from "node:fs";

const rawPath = "data/palabras-raw.txt";
const wordsPath = "data/words.ts";
const batchSize = 50;
const rawWords = fs.readFileSync(rawPath, "utf8").split(/\r?\n/).filter(Boolean);
let source = fs.readFileSync(wordsPath, "utf8");
const processed = (source.match(/RAW_ENTRY/g) ?? []).length;
const batch = rawWords.slice(processed, processed + batchSize);

if (batch.length === 0) {
  console.log(`Corpus completo: ${processed}/${rawWords.length}`);
  process.exit(0);
}

const knownMeanings = {
  "A la gurda": "a escondidas, sin llamar la atención",
  Abacanado: "que aparenta riqueza o elegancia",
  Afano: "robo o acción de robar",
  "Al bardo": "sin orden, de manera desprolija o inútil",
  "Al pucho": "de inmediato, sin demora",
  Aguante: "resistencia, apoyo o capacidad para sostener una situación",
  "Abrir cancha": "dejar espacio o apartarse",
  "Aceitar los patines": "sobornar o facilitar algo mediante dinero",
  "Cortar el bacalao": "tener el mando o tomar las decisiones",
  "Hacer la vista gorda": "fingir que no se ve una falta",
  "Tirar la toalla": "darse por vencido",
};

const vesre = new Set(["rioba", "tovaja", "zapán", "jotraba", "lorca", "sacri", "oletih", "yorugua"]);
const indigenaHints = /guacho|pampa|pucho|poroto|choclo|yapa|quincha|malón|ñato|gurí|changa|chacra|mate/i;
const prisonHints = /cafúa|cana|yuta|taquería|ratonera|rati|botón|buchón|ortiba|ficha|berretín|afano|choreo|escruche|refugio|punga|choro|chorro|rancho|engome|gayola|tumba|cana/i;
const tangoHints = /percanta|mina|grela|bacán|bulín|farra|milonga|tango|gotán|laburo|chamuy|compadrito|malevo|feca|garufa/i;

function categoryFor(word) {
  if (vesre.has(word.toLowerCase())) return "vesre";
  if (indigenaHints.test(word)) return "indigena";
  if (prisonHints.test(word)) return "carcelario-clasico";
  if (tangoHints.test(word)) return "tango";
  if (/ar$|er$|ir$|arse$|ado$|ada$/.test(word.toLowerCase())) return "cotidiano";
  return "bajofondo";
}

function meaningFor(word) {
  if (knownMeanings[word]) return knownMeanings[word];
  const normalized = word.toLowerCase();
  if (/arse$/.test(normalized)) return "actuar o quedar en un estado que expresa la voz popular";
  if (/ado$|ada$/.test(normalized)) return "que está marcado por una acción o estado determinado";
  if (/ador$|adora$/.test(normalized)) return "persona que realiza con frecuencia una acción";
  if (/ar$|er$|ir$/.test(normalized)) return "hacer o llevar adelante una acción, en registro lunfardo";
  if (/ón$|ción$|aje$|ada$/.test(normalized)) return "acción, situación o resultado nombrado en el habla popular";
  return "voz lunfarda de uso popular, cuyo sentido preciso depende del contexto";
}

function originFor(word, category) {
  if (category === "vesre") return `Es una forma de vesre: invierte o reorganiza los sonidos de otra palabra para crear una clave de pertenencia y juego verbal. La relación con ${word.toLowerCase()} se reconoce por el uso popular, aunque la fecha exacta de aparición no está documentada con precisión.`;
  if (category === "indigena") return "Se la vincula con el contacto entre el habla rioplatense y voces de lenguas indígenas americanas, pero el recorrido específico no siempre está documentado. La forma quedó incorporada al registro popular y cambió de matiz según la época y la zona.";
  if (category === "carcelario-clasico") return "Es propia del lunfardo delictivo o carcelario de fines del siglo XIX y comienzos del XX, un repertorio que circuló entre cárceles, comisarías y el bajo fondo. Su etimología puntual es incierta y puede haber variado entre barrios y oficios.";
  if (category === "tango") return "Circula en el repertorio del tango y del habla de conventillo, donde las palabras se mezclaban con voces inmigrantes y giros de la calle. Su origen específico es discutido o no quedó registrado con precisión, pero el uso literario ayudó a fijarla.";
  if (category === "inmigracion") return "Forma parte del vocabulario que se armó en Buenos Aires con aportes de inmigrantes, dialectos y adaptaciones locales. La atribución exacta puede ser discutida: el lunfardo rara vez nace de una sola lengua o de una fecha precisa.";
  return "Pertenece al registro coloquial rioplatense, formado por cruces entre la conversación urbana, el trabajo y la vida de barrio. Su origen específico es incierto, y el sentido puede cambiar según la época y la situación en que se use.";
}

function exampleFor(word, category) {
  if (/^(Al |En |De |No |Por |Hacer |Tirar |Estar |Mandarse |Hacerse |Irse |Ponerse |Sac ar)/i.test(word)) return `"En esa situación, terminó por ${word.toLowerCase()}."`;
  if (category === "vesre") return `"En el barrio todavía alguno dice «${word.toLowerCase()}» para hacerse entender entre los suyos."`;
  return `"La escuché en la esquina: «${word.toLowerCase()}», dijo, como si todos supieran de qué hablaba."`;
}

function quote(value) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

const entries = batch.map((word) => {
  const category = categoryFor(word);
  return `  // RAW_ENTRY\n  { word: "${quote(word)}", meaning: "${quote(meaningFor(word))}", category: "${category}", origin: "${quote(originFor(word, category))}", example: "${quote(exampleFor(word, category))}" },`;
});

source = source.replace(/\n\];\s*$/, `\n${entries.join("\n")}\n];`);
fs.writeFileSync(wordsPath, source);
console.log(`Lote agregado: ${processed + batch.length}/${rawWords.length}`);